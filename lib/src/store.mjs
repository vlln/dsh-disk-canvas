// 提案状态：扫描结果 + 人的决定 + Agent 的标注。
// 有账本（ledger）时：扫描快照、决定、标注都持久到 $DSH_HOME/data/dsh-disk-canvas/ledger.json；
// 没有账本时退化为纯内存（单测用）。仍然不删除任何文件。
import { classify } from './rules.mjs'

const DECISIONS = new Set(['keep', 'delete', 'unsure', 'none'])
const RISKS = new Set(['safe', 'caution', 'personal', 'high', 'unknown'])

export function createStore(options = {}) {
  const ledger = options.ledger ?? null
  const state = {
    root: null,
    home: process.env.HOME ?? null,
    scannedAt: 0,
    partial: false,
    scanning: false,
    entries: [],
    annotations: {},
    claims: {},
    delta: { previousAt: 0, totalDelta: 0, byPath: {} },
    history: [],
    revision: 0,
  }

  /** 渐进扫描：先清空并进入 scanning，子项完成一个就上屏一个。 */
  function startScan(root) {
    state.root = root
    state.scannedAt = 0
    state.partial = false
    state.scanning = true
    state.entries = []
    state.annotations = ledger?.annotations() ?? {}
    state.claims = ledger?.claims() ?? {}
    state.delta = ledger?.deltas(root) ?? { previousAt: 0, totalDelta: 0, byPath: {} }
    state.history = ledger?.history(root, 10) ?? []
    state.revision += 1
    return state
  }

  /** 用账本里的最近一次快照秒开（不再重扫）。 */
  function hydrate(scan) {
    if (!scan) return state
    state.root = scan.root
    state.scannedAt = scan.at
    state.partial = Boolean(scan.partial)
    state.scanning = false
    state.entries = scan.entries.map((e) => ({
      ...e,
      ...classify(e.path, { isDir: e.kind === 'dir', name: e.name ?? e.path.split('/').pop() ?? '', latestModified: 0 }),
      source: 'rule',
    }))
    state.annotations = ledger?.annotations() ?? {}
    state.claims = ledger?.claims() ?? {}
    state.delta = ledger?.deltas(scan.root) ?? { previousAt: 0, totalDelta: 0, byPath: {} }
    state.history = ledger?.history(scan.root, 10) ?? []
    state.revision += 1
    return state
  }

  function addEntry(entry) {
    const c = classify(entry.path, { isDir: entry.kind === 'dir', name: entry.name, latestModified: entry.latestModified })
    const at = state.entries.findIndex((e) => e.path === entry.path)
    const next = { ...entry, ...c, source: 'rule' }
    if (at >= 0) state.entries[at] = next
    else state.entries.push(next)
    state.entries.sort((a, b) => b.bytes - a.bytes)
    state.revision += 1
  }

  function finishScan({ partial, scannedAt }) {
    state.scanning = false
    state.partial = partial
    state.scannedAt = scannedAt
    if (ledger && state.root) {
      ledger.appendScan(state.root, {
        at: scannedAt,
        partial,
        totalBytes: state.entries.reduce((n, e) => n + (e.bytes || 0), 0),
        entries: state.entries,
      })
      state.delta = ledger.deltas(state.root)
      state.history = ledger.history(state.root, 10)
    }
    state.revision += 1
    return state
  }

  function mergedEntries() {
    return state.entries.map((e) => {
      const c = state.claims[e.path]
      const deltaBytes = Object.hasOwn(state.delta.byPath, e.path) ? state.delta.byPath[e.path] : null
      const base = deltaBytes === null ? e : { ...e, deltaBytes }
      if (!c) return base
      return { ...base, claim: c.claim, risk: c.risk ?? e.risk, confidence: c.confidence ?? e.confidence, source: c.by === 'human' ? 'human' : 'agent' }
    })
  }

  function setClaim({ path, claim, risk, confidence }) {
    if (typeof path !== 'string' || !path.startsWith('/')) throw new Error('path must be absolute')
    if (typeof claim !== 'string' || claim.trim() === '') throw new Error('claim required')
    const next = {
      claim: claim.slice(0, 500),
      risk: RISKS.has(risk) ? risk : undefined,
      confidence: typeof confidence === 'number' ? Math.min(1, Math.max(0, confidence)) : undefined,
      by: 'agent',
      updatedAt: Date.now(),
    }
    state.claims[path] = next
    if (ledger) ledger.setClaim(path, next)
    state.revision += 1
    return next
  }

  function annotate({ path, decision, note }) {
    if (typeof path !== 'string' || !path.startsWith('/')) throw new Error('path must be absolute')
    if (!DECISIONS.has(decision)) throw new Error(`decision must be one of ${[...DECISIONS].join(', ')}`)
    if (decision === 'none') {
      delete state.annotations[path]
      if (ledger) ledger.setAnnotation(path, null)
    } else {
      const next = {
        decision,
        note: typeof note === 'string' ? note.slice(0, 2000) : '',
        by: 'human',
        updatedAt: Date.now(),
      }
      state.annotations[path] = next
      if (ledger) ledger.setAnnotation(path, next)
    }
    state.revision += 1
    return state
  }

  function plan(entries = mergedEntries()) {
    const by = { keep: [], delete: [], unsure: [] }
    for (const e of entries) {
      const a = state.annotations[e.path]
      if (a && by[a.decision]) by[a.decision].push(e)
    }
    const sum = (list) => list.reduce((n, e) => n + (e.bytes || 0), 0)
    return {
      deleteCount: by.delete.length,
      keepCount: by.keep.length,
      unsureCount: by.unsure.length,
      unreviewedCount: entries.length - by.delete.length - by.keep.length - by.unsure.length,
      reclaimBytes: sum(by.delete),
      keepBytes: sum(by.keep),
      entries: entries.length,
    }
  }

  /** 序列化给浏览器：体积很小（只有当前一层），标注按 path 全局保留。 */
  function snapshot() {
    const entries = mergedEntries()
    return {
      revision: state.revision,
      root: state.root,
      home: state.home,
      scannedAt: state.scannedAt,
      partial: state.partial,
      scanning: state.scanning,
      entries,
      annotations: state.annotations,
      claims: state.claims,
      delta: { previousAt: state.delta.previousAt, totalDelta: state.delta.totalDelta },
      history: state.history,
      plan: plan(entries),
    }
  }

  /** 导出：给用户留档的完整计划（仍然不含删除动作）。 */
  function exportPlan() {
    const entries = mergedEntries()
    const p = plan(entries)
    const pick = (decision) =>
      entries.filter((e) => state.annotations[e.path]?.decision === decision)
        .map((e) => ({ path: e.path, bytes: e.bytes, files: e.files, risk: e.risk, claim: e.claim, note: state.annotations[e.path]?.note ?? '' }))
    return {
      generatedAt: new Date().toISOString(),
      root: state.root,
      scannedAt: state.scannedAt,
      partial: state.partial,
      scanning: state.scanning,
      since: { previousAt: state.delta.previousAt, totalDelta: state.delta.totalDelta },
      history: state.history,
      plan: p,
      delete: pick('delete'),
      keep: pick('keep'),
      unsure: pick('unsure'),
      note: 'dsh-disk-canvas v0 只导出计划，不执行删除。',
    }
  }

  return { state, hydrate, startScan, addEntry, finishScan, setClaim, annotate, plan, snapshot, exportPlan }
}
