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

  /**
   * 每个路径最近几次扫描的体积，用于详情里的曲线。
   * 跨所有根收集：一项可能在「父目录的扫描」里留下过体积，不必非要扫过它自己。
   */
  function pathTrends(_root, limit = 10) {
    const out = {}
    for (const entry of Object.values(data.roots ?? {})) {
      for (const scan of (entry.scans ?? []).slice(-limit)) {
        for (const e of scan.entries ?? []) {
          if (!e?.path) continue
          if (!out[e.path]) out[e.path] = []
          out[e.path].push({ at: scan.at, bytes: e.bytes ?? 0 })
        }
      }
    }
    for (const [path, list] of Object.entries(out)) {
      list.sort((a, b) => a.at - b.at)
      out[path] = list.slice(-limit)
      if (out[path].length < 2) delete out[path]
    }
    return out
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

  /** 整理操作：按路径存「移到哪」，与 annotations 平行。 */
  function operations() {
    return data.operations ?? {}
  }

  function setOperation(path, operation) {
    if (!data.operations) data.operations = {}
    if (operation === null) delete data.operations[path]
    else data.operations[path] = { ...operation, at: now() }
    saveSoon()
  }

  /** 执行过的移动：按批次保存（每根最近 10 批），用于「撤销这批移动」。 */
  function moveBatches(root, records) {
    const entry = rootOf(root)
    if (!Array.isArray(records)) return entry.moveBatches ?? []
    entry.moveBatches = records.slice(-10)
    prune(entry)
    saveSoon()
    return entry.moveBatches
  }

  /** 异议：Agent 不同意人的某个决定时写一句；只按路径存，不参与决定。 */
  function objections() {
    return data.objections ?? {}
  }

  function setObjection(path, objection) {
    if (!data.objections) data.objections = {}
    if (objection === null) delete data.objections[path]
    else data.objections[path] = { ...objection, at: now() }
    saveSoon()
  }

  /** Agent 标注批次：每根目录保留最近 10 批，用来「撤销这一轮」。 */
  function agentBatches(root, records) {
    const entry = rootOf(root)
    if (!Array.isArray(records)) return entry.agentBatches ?? []
    entry.agentBatches = records.slice(-10)
    prune(entry)
    saveSoon()
    return entry.agentBatches
  }

  /**
   * 类别 → 色号。存下来是为了「橙色=安装包」这件事不会因为多了一个新类别而重排；
   * 色号只记 0–7（调色板大小），超出记为 -1（中性色）。
   */
  function facetHue() {
    return data.facetHue ?? {}
  }

  /** 整体替换色号表（迁移/清理旧键用）。 */
  function setFacetHueMap(map) {
    data.facetHue = { ...(map ?? {}) }
    saveSoon()
  }

  function setFacetHue(category, index) {
    if (typeof category !== 'string' || category === '') return
    if (!data.facetHue) data.facetHue = {}
    data.facetHue[category] = Number(index)
    saveSoon()
  }

  /** 执行台账：上一次扫描里「标了待清理、这次不见了」的项。不存隔离区，只存事实。 */
  function executionOf(root, records) {
    const entry = rootOf(root)
    if (!Array.isArray(records)) return entry.executions ?? []
    entry.executions = records.slice(-20)
    prune(entry)
    saveSoon()
    return entry.executions
  }

  function setClaim(path, claim) {
    if (claim === null) delete data.claims[path]
    else data.claims[path] = { ...claim, at: now() }
    saveSoon()
  }

  return {
    file, flush, latest, history, pathTrends, deltas, annotations, claims, patterns, setPatterns,
    appendScan, setAnnotation, setClaim, rules, setRule, config, setConfig, executionOf, facetHue, setFacetHue, setFacetHueMap, agentBatches, objections, setObjection, operations, setOperation, moveBatches,
  }
}
