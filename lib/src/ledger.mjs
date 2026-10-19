// 磁盘账本：跨进程、跨会话的持久记录。
// 位置：$DSH_HOME/data/dsh-disk-canvas/ledger.json（按插件 id 命名；原子写；自设上限）。
// 存的是「扫描快照 + 人的决定 + Agent 标注」，不存整棵树。
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'

export const MAX_SCANS_PER_ROOT = 20
export const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000
export const MAX_LEDGER_BYTES = 5 * 1024 * 1024

/** @param {{ dshHome?: string, dir?: string, now?: () => number, debounceMs?: number }} [options] */
export function createLedger(options = {}) {
  const now = options.now ?? Date.now
  const base = options.dir ?? join(options.dshHome ?? process.env.DSH_HOME ?? process.cwd(), 'data', 'dsh-disk-canvas')
  const file = join(base, 'ledger.json')
  let data = read()
  let timer = null

  function read() {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'))
      if (parsed !== null && typeof parsed === 'object' && parsed.version === 1 && typeof parsed.roots === 'object') {
        parsed.annotations ??= {}
        parsed.claims ??= {}
        for (const root of Object.values(parsed.roots)) {
          if (root.annotations) Object.assign(parsed.annotations, root.annotations)
          if (root.claims) Object.assign(parsed.claims, root.claims)
          delete root.annotations
          delete root.claims
        }
        return parsed
      }
    } catch {
      // 缺失/损坏：从空账本开始，下一次写盘会覆盖
    }
    return { version: 1, roots: {}, annotations: {}, claims: {}, rules: {}, config: {} }
  }

  function rootOf(root) {
    data.roots[root] ??= { scans: [] }
    return data.roots[root]
  }

  function saveSoon() {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      flush()
    }, options.debounceMs ?? 800)
    timer.unref?.()
  }

  function flush() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    try {
      mkdirSync(base, { recursive: true })
      const tmp = `${file}.${process.pid}.tmp`
      writeFileSync(tmp, JSON.stringify(data))
      renameSync(tmp, file)
    } catch {
      // 持久化失败不阻塞扫描/批注；下一次变更再试
    }
  }

  function prune(root) {
    const cutoff = now() - MAX_AGE_MS
    root.scans = root.scans.filter((s) => s.at >= cutoff).slice(-MAX_SCANS_PER_ROOT)
    while (root.scans.length > 1 && JSON.stringify(data).length > MAX_LEDGER_BYTES) root.scans.shift()
  }

  function appendScan(root, snap) {
    const entry = rootOf(root)
    entry.scans.push({
      at: snap.at,
      totalBytes: snap.totalBytes,
      partial: Boolean(snap.partial),
      entries: snap.entries.map((e) => ({ path: e.path, name: e.name, kind: e.kind, bytes: e.bytes, files: e.files, modified: e.latestModified ?? 0, partial: Boolean(e.partial) })),
    })
    prune(entry)
    saveSoon()
  }

  /** 最近一次快照（给启动时秒开用）；没有则 null。 */
  function latest(root) {
    const entry = data.roots[root]
    const scan = entry?.scans.at(-1)
    return scan ? { root, ...scan } : null
  }

  function history(root, limit = 10) {
    const entry = data.roots[root]
    if (!entry) return []
    return entry.scans.slice(-limit).map((s) => ({ at: s.at, totalBytes: s.totalBytes, partial: s.partial }))
  }

  /** 最新一次 vs 前一次的差：总量 + 每个直接子项的 bytes 差。 */
  function deltas(root) {
    const entry = data.roots[root]
    if (!entry || entry.scans.length < 2) return { previousAt: 0, totalDelta: 0, byPath: {} }
    const prev = entry.scans[entry.scans.length - 2]
    const cur = entry.scans[entry.scans.length - 1]
    const previous = new Map(prev.entries.map((e) => [e.path, e.bytes]))
    const byPath = {}
    for (const e of cur.entries) byPath[e.path] = e.bytes - (previous.get(e.path) ?? 0)
    return { previousAt: prev.at, totalDelta: cur.totalBytes - prev.totalBytes, byPath }
  }

  /** 跨层目录索引：只保留最近一次（不随历史累积，否则索引本身会撑爆账本）。 */
  function setPatterns(root, payload) {
    const entry = rootOf(root)
    entry.patterns = payload
      ? { at: payload.at, truncated: Boolean(payload.truncated), hits: payload.hits.slice(0, 1200) }
      : null
    prune(entry)
    saveSoon()
  }

  function patterns(root) {
    return data.roots[root]?.patterns ?? null
  }

  function annotations() {
    return data.annotations
  }

  function claims() {
    return data.claims
  }

  function rules() {
    return data.rules ?? {}
  }

  function setRule(id, rule) {
    if (!data.rules) data.rules = {}
    if (!rule) delete data.rules[id]
    else data.rules[id] = { ...rule, at: now() }
    saveSoon()
  }

  function config() {
    return { autoScanHours: 0, ...(data.config ?? {}) }
  }

  function setConfig(patch) {
    data.config = { ...(data.config ?? {}), ...patch }
    saveSoon()
    return config()
  }

  function setAnnotation(path, annotation) {
    if (annotation === null) delete data.annotations[path]
    else data.annotations[path] = { ...annotation, at: now() }
    saveSoon()
  }

  function setClaim(path, claim) {
    if (claim === null) delete data.claims[path]
    else data.claims[path] = { ...claim, at: now() }
    saveSoon()
  }

  return {
    file, flush, latest, history, deltas, annotations, claims, patterns, setPatterns,
    appendScan, setAnnotation, setClaim, rules, setRule, config, setConfig,
  }
}
