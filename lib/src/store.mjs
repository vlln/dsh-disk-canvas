// 提案状态：扫描结果 + 人的决定 + Agent 的标注。全部在内存里，v0 不落盘、不删任何文件。
import { classify } from './rules.mjs'

const DECISIONS = new Set(['keep', 'delete', 'unsure', 'none'])
const RISKS = new Set(['safe', 'caution', 'high', 'unknown'])

export function createStore() {
  const state = {
    root: null,
    home: process.env.HOME ?? null,
    scannedAt: 0,
    partial: false,
    entries: [],
    annotations: {}, // path -> { decision, note, updatedAt }
    claims: {}, // path -> { claim, risk, confidence, updatedAt }（Agent 覆盖规则）
    revision: 0,
  }

  function setScan(result) {
    state.root = result.root
    state.scannedAt = result.scannedAt
    state.partial = result.partial
    state.entries = result.entries.map((e) => {
      const c = classify(e.path, { isDir: e.kind === 'dir', name: e.name, latestModified: e.latestModified })
      return { ...e, ...c, source: 'rule' }
    })
    state.revision += 1
    return state
  }

  function mergedEntries() {
    return state.entries.map((e) => {
      const c = state.claims[e.path]
      if (!c) return e
      return { ...e, claim: c.claim, risk: c.risk ?? e.risk, confidence: c.confidence ?? e.confidence, source: 'agent' }
    })
  }

  function setClaim({ path, claim, risk, confidence }) {
    if (typeof path !== 'string' || !path.startsWith('/')) throw new Error('path must be absolute')
    if (typeof claim !== 'string' || claim.trim() === '') throw new Error('claim required')
    state.claims[path] = {
      claim: claim.slice(0, 500),
      risk: RISKS.has(risk) ? risk : undefined,
      confidence: typeof confidence === 'number' ? Math.min(1, Math.max(0, confidence)) : undefined,
      updatedAt: Date.now(),
    }
    state.revision += 1
    return state.claims[path]
  }

  function annotate({ path, decision, note }) {
    if (typeof path !== 'string' || !path.startsWith('/')) throw new Error('path must be absolute')
    if (!DECISIONS.has(decision)) throw new Error(`decision must be one of ${[...DECISIONS].join(', ')}`)
    if (decision === 'none') {
      delete state.annotations[path]
    } else {
      state.annotations[path] = {
        decision,
        note: typeof note === 'string' ? note.slice(0, 2000) : '',
        updatedAt: Date.now(),
      }
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
      entries,
      annotations: state.annotations,
      claims: state.claims,
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
      plan: p,
      delete: pick('delete'),
      keep: pick('keep'),
      unsure: pick('unsure'),
      note: 'dsh-disk-canvas v0 只导出计划，不执行删除。',
    }
  }

  return { state, setScan, setClaim, annotate, plan, snapshot, exportPlan }
}
