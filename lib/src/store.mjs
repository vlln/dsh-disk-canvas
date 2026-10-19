// 提案状态：扫描结果 + 人的决定 + Agent 的标注。
// 有账本（ledger）时：扫描快照、决定、标注都持久到 $DSH_HOME/data/dsh-disk-canvas/ledger.json；
// 没有账本时退化为纯内存（单测用）。仍然不删除任何文件。
import { classify, dedupeNested, PATTERN_GROUPS } from './rules.mjs'

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
    patterns: { at: 0, truncated: false, groups: [], hits: [] },
    rules: {},
    config: { autoScanHours: 0 },
    revision: 0,
  }
  if (ledger) {
    state.rules = ledger.rules() ?? {}
    state.config = ledger.config()
  }

  /** 记忆规则：给定类目录一个默认决定，只补「还没有人做过决定」的项。 */
  function applyRules(hits) {
    if (!hits || hits.length === 0) return 0
    // 只作用到「去嵌套重复之后」的那批路径——和索引里显示/可勾选的是同一集合
    const byGroup = new Map()
    for (const hit of hits) {
      if (!state.rules[hit.group]) continue
      if (!byGroup.has(hit.group)) byGroup.set(hit.group, [])
      byGroup.get(hit.group).push(hit)
    }
    let applied = 0
    for (const [group, list] of byGroup) {
      const rule = state.rules[group]
      const kept = new Set(dedupeNested(list.map((h) => h.path)))
      for (const hit of list) {
        if (!kept.has(hit.path)) continue
        if (state.annotations[hit.path]) continue
        const next = { decision: rule.decision, note: '', by: 'rule', rule: group, updatedAt: Date.now() }
        state.annotations[hit.path] = next
        if (ledger) ledger.setAnnotation(hit.path, next)
        applied += 1
      }
    }
    if (applied > 0) state.revision += 1
    return applied
  }

  /** 把命中的目录整理成「按类分组 + 去重嵌套 + 带上风险/决定」。 */
  function buildPatterns(hits, at, truncated) {
    const byGroup = new Map()
    for (const hit of hits) {
      if (!byGroup.has(hit.group)) byGroup.set(hit.group, [])
      byGroup.get(hit.group).push(hit)
    }
    const groups = []
    for (const group of PATTERN_GROUPS) {
      const list = byGroup.get(group.id)
      if (!list || list.length === 0) continue
      const kept = new Set(dedupeNested(list.map((h) => h.path)))
      const unique = list.filter((h) => kept.has(h.path))
      let bytes = 0
      let files = 0
      for (const h of unique) { bytes += h.bytes || 0; files += h.files || 0 }
      const entries = unique
        .slice()
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 200)
        .map((h) => {
          const c = classify(h.path, { isDir: true, name: h.name, latestModified: h.latestModified })
          const claim = state.claims[h.path]
          const ann = state.annotations[h.path]
          return {
            path: h.path,
            name: h.name,
            kind: 'dir',
            bytes: h.bytes,
            files: h.files,
            latestModified: h.latestModified,
            risk: claim?.risk ?? group.risk ?? c.risk,
            claim: claim?.claim ?? `${group.hint}（${group.label}）`,
            confidence: claim?.confidence ?? (group.risk ? 0.8 : c.confidence),
            source: claim ? 'agent' : 'rule',
            decision: ann?.decision,
          }
        })
      groups.push({
        id: group.id,
        label: group.label,
        hint: group.hint,
        risk: entries[0]?.risk ?? 'unknown',
        count: unique.length,
        bytes,
        files,
        shown: entries.length,
        entries,
      })
    }
    groups.sort((a, b) => b.bytes - a.bytes)
    return { at, truncated: Boolean(truncated), groups, hits }
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
      latestModified: e.modified || 0,
      ...classify(e.path, { isDir: e.kind === 'dir', name: e.name ?? e.path.split('/').pop() ?? '', latestModified: e.modified || 0 }),
      source: 'rule',
    }))
    state.annotations = ledger?.annotations() ?? {}
    state.claims = ledger?.claims() ?? {}
    state.delta = ledger?.deltas(scan.root) ?? { previousAt: 0, totalDelta: 0, byPath: {} }
    state.history = ledger?.history(scan.root, 10) ?? []
    const saved = ledger?.patterns(scan.root)
    state.patterns = saved && Array.isArray(saved.hits)
      ? buildPatterns(saved.hits, saved.at, saved.truncated)
      : { at: 0, truncated: false, groups: [], hits: [] }
    if (saved && Array.isArray(saved.hits)) {
      state.patterns.hits = saved.hits
      applyRules(saved.hits)
    }
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

  function finishScan({ partial, scannedAt, patterns, patternsTruncated }) {
    state.scanning = false
    state.partial = partial
    state.scannedAt = scannedAt
    if (Array.isArray(patterns)) {
      state.patterns = buildPatterns(patterns, scannedAt, patternsTruncated)
      state.patterns.hits = patterns
      applyRules(patterns)
      if (ledger && state.root) ledger.setPatterns(state.root, { at: scannedAt, truncated: patternsTruncated, hits: patterns })
    }
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

  /** 决定变了，索引里那 200 条也要跟着变（不重算分组，只同步 decision）。 */
  function refreshPatternDecisions() {
    for (const group of state.patterns.groups) {
      for (const entry of group.entries) entry.decision = state.annotations[entry.path]?.decision
    }
  }

  // decision 省略 = 只改备注（保留原有决定）；'none' = 清除决定（备注仍可留着）。
  // 决定和备注都空 → 整条删除，回到未审。
  function annotate({ path, decision, note }) {
    if (typeof path !== 'string' || !path.startsWith('/')) throw new Error('path must be absolute')
    if (decision !== undefined && !DECISIONS.has(decision)) throw new Error(`decision must be one of ${[...DECISIONS].join(', ')}`)
    const prev = state.annotations[path]
    const nextDecision = decision === undefined ? prev?.decision : (decision === 'none' ? undefined : decision)
    const nextNote = typeof note === 'string' ? note.slice(0, 2000) : (prev?.note ?? '')
    if (!nextDecision && !nextNote) {
      delete state.annotations[path]
      if (ledger) ledger.setAnnotation(path, null)
    } else {
      const next = { decision: nextDecision, note: nextNote, by: 'human', updatedAt: Date.now() }
      state.annotations[path] = next
      if (ledger) ledger.setAnnotation(path, next)
    }
    refreshPatternDecisions()
    state.revision += 1
    return state
  }

  // 批量：一次请求写多个路径（框选/多选后应用决定）。返回写入条数。
  function annotateMany({ paths, decision, note }) {
    if (!Array.isArray(paths) || paths.length === 0) throw new Error('paths must be a non-empty array')
    if (paths.length > 500) throw new Error('paths: at most 500 per request')
    if (decision !== undefined && !DECISIONS.has(decision)) throw new Error(`decision must be one of ${[...DECISIONS].join(', ')}`)
    const list = [...new Set(paths)].filter((p) => typeof p === 'string' && p.startsWith('/'))
    for (const path of list) annotate({ path, decision, note })
    return list.length
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
      patterns: state.patterns.groups.map(({ id, label, hint, risk, count, bytes, files, shown }) => ({
        id, label, hint, risk, count, bytes, files, shown,
      })),
      patternsAt: state.patterns.at,
      patternsTruncated: state.patterns.truncated,
      rules: rules(),
      config: state.config,
    }
  }

  /** 导出：给用户留档的完整计划（仍然不含删除动作）。 */
  function exportPlan() {
    const entries = mergedEntries()
    const p = plan(entries)
    // 索引里（不在当前层）也已经有了决定 —— 导出必须包含，否则批量标了 72 个 node_modules 却导不出来
    const inLevel = new Set(entries.map((e) => e.path))
    const extra = { delete: [], keep: [], unsure: [] }
    for (const group of state.patterns.groups) {
      for (const entry of group.entries) {
        if (inLevel.has(entry.path)) continue
        const d = state.annotations[entry.path]?.decision
        if (d && extra[d]) {
          extra[d].push({
            path: entry.path, bytes: entry.bytes, files: entry.files, risk: entry.risk,
            claim: entry.claim, note: state.annotations[entry.path]?.note ?? '', group: group.id,
          })
        }
      }
    }
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
      extra: {
        delete: extra.delete,
        keep: extra.keep,
        unsure: extra.unsure,
        counts: { delete: extra.delete.length, keep: extra.keep.length, unsure: extra.unsure.length },
        bytes: extra.delete.reduce((n, e) => n + (e.bytes || 0), 0),
      },
      note: 'dsh-disk-canvas v0 只导出计划，不执行删除。',
    }
  }

  /** 记住/忘记一条「这类目录默认怎么处理」的规则。 */
  function setRule({ id, decision }) {
    if (!PATTERN_GROUPS.some((g) => g.id === id)) throw new Error('unknown pattern group')
    if (decision == null) {
      delete state.rules[id]
      if (ledger) ledger.setRule(id, null)
      // 撤销规则时把「由这条规则写下、且没人改过」的决定一起收回
      for (const [path, ann] of Object.entries(state.annotations)) {
        if (ann.by === 'rule' && ann.rule === id) {
          delete state.annotations[path]
          if (ledger) ledger.setAnnotation(path, null)
        }
      }
    } else {
      if (!DECISIONS.has(decision) || decision === 'none') throw new Error('decision must be keep, delete or unsure')
      state.rules[id] = { decision, at: Date.now() }
      if (ledger) ledger.setRule(id, { decision })
      applyRules(state.patterns.hits)
    }
    state.patterns = buildPatterns(state.patterns.hits, state.patterns.at, state.patterns.truncated)
    state.revision += 1
    return state
  }

  function rules() {
    return Object.entries(state.rules).map(([id, rule]) => ({ id, ...rule }))
  }

  /** 整体替换规则（导入用）：先收回旧的规则标注，再按新列表补。 */
  function replaceRules(list) {
    if (!Array.isArray(list)) throw new Error('rules must be an array')
    if (list.length > 50) throw new Error('rules: at most 50')
    for (const [path, ann] of Object.entries(state.annotations)) {
      if (ann.by === 'rule') {
        delete state.annotations[path]
        if (ledger) ledger.setAnnotation(path, null)
      }
    }
    if (ledger) for (const id of Object.keys(ledger.rules() ?? {})) ledger.setRule(id, null)
    state.rules = {}
    for (const rule of list) {
      if (!rule || !PATTERN_GROUPS.some((g) => g.id === rule.id)) continue
      if (!DECISIONS.has(rule.decision) || rule.decision === 'none') continue
      state.rules[rule.id] = { decision: rule.decision, at: Date.now() }
      if (ledger) ledger.setRule(rule.id, { decision: rule.decision })
    }
    applyRules(state.patterns.hits)
    state.patterns = buildPatterns(state.patterns.hits, state.patterns.at, state.patterns.truncated)
    state.revision += 1
    return state
  }

  function setConfig(patch) {
    if (typeof patch?.autoScanHours === 'number') {
      const hours = Math.max(0, Math.min(24 * 30, Math.round(patch.autoScanHours)))
      state.config = { ...state.config, autoScanHours: hours }
      if (ledger) ledger.setConfig({ autoScanHours: hours })
    }
    state.revision += 1
    return state
  }

  /** 提案快照：把「这份审查」带走（决定 + Agent 判断 + 规则），不含体积明细。 */
  function exportProposal() {
    return {
      version: 1,
      app: 'dsh-disk-canvas',
      kind: 'proposal',
      exportedAt: new Date().toISOString(),
      root: state.root,
      scannedAt: state.scannedAt,
      annotations: state.annotations,
      claims: state.claims,
      rules: rules(),
    }
  }

  /**
   * 导入提案：只补「本地还没有的」——决定不覆盖人已经做过的，规则只补缺的。
   * 返回计数，前端据此说明「导入了几条、跳过了几条」。
   */
  function importProposal({ annotations, claims, rules: incomingRules }) {
    const result = { decisions: 0, claims: 0, rules: 0, skipped: 0 }
    if (annotations && typeof annotations === 'object') {
      for (const [path, ann] of Object.entries(annotations)) {
        if (typeof path !== 'string' || !path.startsWith('/') || !ann || typeof ann !== 'object') continue
        if (!DECISIONS.has(ann.decision) || ann.decision === 'none') continue
        if (state.annotations[path]) { result.skipped += 1; continue }
        const next = {
          decision: ann.decision,
          note: typeof ann.note === 'string' ? ann.note.slice(0, 2000) : '',
          by: 'human',
          imported: true,
          updatedAt: Date.now(),
        }
        state.annotations[path] = next
        if (ledger) ledger.setAnnotation(path, next)
        result.decisions += 1
      }
    }
    if (claims && typeof claims === 'object') {
      for (const [path, claim] of Object.entries(claims)) {
        if (typeof path !== 'string' || !path.startsWith('/') || !claim || typeof claim !== 'object') continue
        if (state.claims[path] || typeof claim.claim !== 'string') continue
        const next = {
          claim: claim.claim.slice(0, 500),
          risk: RISKS.has(claim.risk) ? claim.risk : undefined,
          confidence: typeof claim.confidence === 'number' ? claim.confidence : undefined,
          by: 'agent',
          updatedAt: Date.now(),
        }
        state.claims[path] = next
        if (ledger) ledger.setClaim(path, next)
        result.claims += 1
      }
    }
    if (Array.isArray(incomingRules)) {
      for (const rule of incomingRules) {
        if (!rule || !PATTERN_GROUPS.some((g) => g.id === rule.id)) continue
        if (!DECISIONS.has(rule.decision) || rule.decision === 'none') continue
        if (state.rules[rule.id]) continue
        state.rules[rule.id] = { decision: rule.decision, at: Date.now() }
        if (ledger) ledger.setRule(rule.id, { decision: rule.decision })
        result.rules += 1
      }
      applyRules(state.patterns.hits)
    }
    refreshPatternDecisions()
    state.patterns = buildPatterns(state.patterns.hits, state.patterns.at, state.patterns.truncated)
    state.revision += 1
    return result
  }

  /** 完整索引（含每条路径），只在打开「索引」视图时拉一次。 */
  function patterns() {
    return { at: state.patterns.at, truncated: state.patterns.truncated, groups: state.patterns.groups }
  }

  return {
    state, hydrate, startScan, addEntry, finishScan, setClaim, annotate, annotateMany,
    plan, snapshot, exportPlan, patterns, setRule, replaceRules, rules, setConfig,
    exportProposal, importProposal,
  }
}
