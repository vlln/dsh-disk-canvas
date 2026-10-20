// 提案状态：扫描结果 + 人的决定 + Agent 的标注。
// 有账本（ledger）时：扫描快照、决定、标注都持久到 $DSH_HOME/data/dsh-disk-canvas/ledger.json；
// 没有账本时退化为纯内存（单测用）。仍然不删除任何文件。
import { dedupeNested, PATTERN_GROUPS } from './rules.mjs'
import { snapshotOf, publicSemantic, CATEGORIES, isCategory, normalizeCategory } from './semantics.mjs'

const DECISIONS = new Set(['keep', 'delete', 'none'])

export function createStore(options = {}) {
  const ledger = options.ledger ?? null
  let pendingEntries = null
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
    trends: {},
    executions: [],
    fromCache: false,
    revalidating: false,
    facetHue: {},
    agentBatches: [],
    objections: {},
    operations: {},
    moveBatches: [],
    patterns: { at: 0, truncated: false, groups: [], hits: [] },
    rules: {},
    config: { autoScanHours: 0 },
    revision: 0,
  }
  if (ledger) {
    state.rules = ledger.rules() ?? {}
    state.config = ledger.config()
    // 只保留封闭词表里的键：旧的自由类别会占满调色板，让规范类别全变成 -1
    const rawHues = ledger.facetHue() ?? {}
    state.facetHue = {}
    for (const [key, value] of Object.entries(rawHues)) {
      if (CATEGORIES.includes(key) && typeof value === 'number' && value >= 0) state.facetHue[key] = value
    }
    if (Object.keys(state.facetHue).length !== Object.keys(rawHues).length) ledger.setFacetHueMap(state.facetHue)
  }

  /** 调色板容量；超出的类别退化到中性色，不再发明新颜色。 */
  const HUE_COUNT = 8
  /** 类别 → 色号：第一次见到时按「最小的空位」分配，之后固定。 */
  function hueOf(category) {
    if (typeof category !== 'string' || category === '') return -1
    const known = state.facetHue[category]
    // -1 是「调色板用完了」的旧结论，不是有效分配：有空格就重新给一个
    if (typeof known === 'number' && known >= 0) return known
    const used = new Set(Object.values(state.facetHue).filter((i) => typeof i === 'number' && i >= 0))
    let index = 0
    while (index < HUE_COUNT && used.has(index)) index += 1
    const hue = index < HUE_COUNT ? index : -1
    state.facetHue[category] = hue
    if (ledger) ledger.setFacetHue(category, hue)
    return hue
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
          const claim = state.claims[h.path]
          const ann = state.annotations[h.path]
          return {
            path: h.path,
            name: h.name,
            kind: 'dir',
            bytes: h.bytes,
            files: h.files,
            latestModified: h.latestModified,
            claim: claim?.claim ?? null,
            category: claim?.category ?? null,
            source: claim ? 'agent' : null,
            decision: ann?.decision,
          }
        })
      groups.push({
        id: group.id,
        label: group.label,
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

  /**
   * 渐进扫描：子项完成一个就上屏一个。
   * keep=true 是「后台刷新」：当前画面继续显示旧快照，新结果先收在 pending 里，
   * 扫完一次性替换——换目录不再白屏。
   */
  function startScan(root, { keep = false } = {}) {
    pendingEntries = keep ? [] : null
    state.revalidating = keep
    state.root = root
    state.scannedAt = 0
    state.partial = false
    state.scanning = true
    if (!keep) {
      state.fromCache = false
      state.entries = []
    }
    // 没有账本时保留内存里的决定与语义：换个目录看一眼不该把标注清空
    state.annotations = ledger?.annotations() ?? state.annotations
    state.claims = ledger?.claims() ?? state.claims
    state.delta = ledger?.deltas(root) ?? { previousAt: 0, totalDelta: 0, byPath: {} }
    state.history = ledger?.history(root, 10) ?? []
    state.trends = ledger?.pathTrends(root, 10) ?? {}
    state.agentBatches = ledger?.agentBatches(root) ?? []
    state.objections = ledger?.objections() ?? {}
    state.operations = ledger?.operations() ?? {}
    state.moveBatches = ledger?.moveBatches(root) ?? []
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
    state.fromCache = true
    state.entries = scan.entries.map((e) => ({
      ...e,
      latestModified: e.modified || 0,
      source: 'rule',
    }))
    state.annotations = ledger?.annotations() ?? {}
    state.claims = ledger?.claims() ?? {}
    state.delta = ledger?.deltas(scan.root) ?? { previousAt: 0, totalDelta: 0, byPath: {} }
    state.history = ledger?.history(scan.root, 10) ?? []
    state.trends = ledger?.pathTrends(scan.root, 10) ?? {}
    state.executions = ledger?.executionOf(scan.root) ?? []
    state.agentBatches = ledger?.agentBatches(scan.root) ?? []
    state.objections = ledger?.objections() ?? {}
    state.operations = ledger?.operations() ?? {}
    state.moveBatches = ledger?.moveBatches(scan.root) ?? []
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
    if (pendingEntries) { pendingEntries.push({ ...entry }); return }
    const at = state.entries.findIndex((e) => e.path === entry.path)
    const next = { ...entry }
    if (at >= 0) state.entries[at] = next
    else state.entries.push(next)
    state.entries.sort((a, b) => b.bytes - a.bytes)
    state.revision += 1
  }

  /**
   * @param {{ partial: boolean, scannedAt: number, patterns?: object[], patternsTruncated?: boolean, reason?: string }} result
   * reason: refresh / schedule / agent / boot 才算一次「测量」（写历史、算执行台账）；
   *         navigate 只是路过，不污染趋势。
   */
  function finishScan({ partial, scannedAt, patterns, patternsTruncated, reason = 'refresh', failed = false }) {
    const measured = reason !== 'navigate'
    if (pendingEntries) {
      // 后台刷新失败且一个新子项都没拿到：保留旧画面，不要因为一次超时把画布清空
      if (pendingEntries.length > 0 || !failed) {
        const byPath = new Map()
        for (const e of pendingEntries) byPath.set(e.path, e)
        state.entries = [...byPath.values()].sort((a, b) => b.bytes - a.bytes)
      }
      pendingEntries = null
    }
    state.revalidating = false
    state.scanning = false
    state.fromCache = false
    state.partial = partial
    state.scannedAt = scannedAt
    if (Array.isArray(patterns)) {
      state.patterns = buildPatterns(patterns, scannedAt, patternsTruncated)
      state.patterns.hits = patterns
      applyRules(patterns)
      if (ledger && state.root) ledger.setPatterns(state.root, { at: scannedAt, truncated: patternsTruncated, hits: patterns })
    }
    if (ledger && state.root && !measured) {
      // 路过的重扫只更新当前画面，不写历史、不推进增量
      state.executions = ledger.executionOf(state.root) ?? []
    } else if (ledger && state.root) {
      // 执行台账：上一轮扫描里标了待清理、这一轮消失的项。不算「删除」，
      // 只记「不在了」——脚本移走、用户手动删、被别的程序清掉，看起来都一样。
      const prev = ledger.latest(state.root)
      if (prev) {
        const nowPaths = new Set(state.entries.map((e) => e.path))
        const vanished = prev.entries.filter((e) => !nowPaths.has(e.path) && state.annotations[e.path]?.decision === 'delete')
        if (vanished.length > 0) {
          ledger.executionOf(state.root, [...(ledger.executionOf(state.root) ?? []), {
            at: scannedAt,
            count: vanished.length,
            bytes: vanished.reduce((n, e) => n + (e.bytes || 0), 0),
            paths: vanished.map((e) => e.path).slice(0, 200),
          }])
        }
      }
      ledger.appendScan(state.root, {
        at: scannedAt,
        partial,
        totalBytes: state.entries.reduce((n, e) => n + (e.bytes || 0), 0),
        entries: state.entries,
      })
      state.delta = ledger.deltas(state.root)
      state.history = ledger.history(state.root, 10)
      state.trends = ledger.pathTrends(state.root, 10)
      state.executions = ledger.executionOf(state.root) ?? []
    }
    state.revision += 1
    return state
  }

  function mergedEntries() {
    return state.entries.map((e) => {
      const c = state.claims[e.path]
      const deltaBytes = Object.hasOwn(state.delta.byPath, e.path) ? state.delta.byPath[e.path] : null
      const base = deltaBytes === null
        ? { ...e, semantic: null, facetHue: -1 }
        : { ...e, deltaBytes, semantic: null, facetHue: -1 }
      if (!c) return base
      const semantic = publicSemantic(c, e)
      return {
        ...base,
        claim: c.claim,
        confidence: c.confidence ?? e.confidence,
        source: c.by === 'human' ? 'human' : 'agent',
        // 色号是「类别 → 调色板」的稳定映射：第一次出现时分配并落账本
        facetHue: semantic?.category ? hueOf(semantic.category) : -1,
        trend: state.trends[e.path] ?? null,
        semantic,
      }
    })
  }

  function setClaim({ path, claim, confidence, label, category, evidence, model }) {
    if (typeof path !== 'string' || !path.startsWith('/')) throw new Error('path must be absolute')
    if (typeof claim !== 'string' || claim.trim() === '') throw new Error('claim required')
    // 语义是给人「一眼看懂」的：太长就退回，让模型压短，而不是把长文塞进画布
    if (claim.length > 120) throw new Error(`claim too long (${claim.length} chars); keep it under 40 characters and put details in evidence`)
    // 类别必须来自固定词表；自由词表会让每个目录都自成一类
    if (category !== undefined && !isCategory(category)) {
      throw new Error(`category must be one of: ${CATEGORIES.join(', ')}`)
    }
    const cat = category === undefined ? undefined : normalizeCategory(category)
    const entry = state.entries.find((e) => e.path === path)
    const next = {
      claim: claim.slice(0, 500),
      label: typeof label === 'string' ? label.slice(0, 120) : undefined,
      category: cat,
      evidence: Array.isArray(evidence)
        ? evidence.filter((x) => typeof x === 'string' && x.trim() !== '').slice(0, 8).map((x) => x.slice(0, 200))
        : [],
      confidence: typeof confidence === 'number' ? Math.min(1, Math.max(0, confidence)) : undefined,
      model: typeof model === 'string' ? model.slice(0, 60) : undefined,
      // 快照记的是「写这条判断时对象长什么样」；不在当前层就留空，下次扫到会判 stale
      m: entry ? snapshotOf(entry) : undefined,
      by: 'agent',
      updatedAt: Date.now(),
    }
    state.claims[path] = next
    if (ledger) ledger.setClaim(path, next)
    state.revision += 1
    return next
  }

  /**
   * Agent 直接标一批决定——和用户按 K/D/U 写的是同一份数据，画布立刻变成同样的样子。
   * 只补「还没有决定」的项：人标过的不覆盖。
   */
  function markPaths({ paths, decision, note }) {
    if (!Array.isArray(paths) || paths.length === 0) throw new Error('paths required')
    if (!DECISIONS.has(decision) || decision === 'none') throw new Error('decision must be one of keep, delete, none')
    const list = [...new Set(paths.filter((p) => typeof p === 'string' && p.startsWith('/')))]
    if (list.length > 500) throw new Error('at most 500 paths per batch')
    const byPath = new Map(state.entries.map((e) => [e.path, e]))
    const batch = `a${Date.now().toString(36)}`
    let marked = 0
    let skipped = 0
    let bytes = 0
    for (const path of list) {
      if (state.annotations[path]?.decision) { skipped += 1; continue }
      annotate({ path, decision, note, by: 'agent', batch })
      marked += 1
      bytes += byPath.get(path)?.bytes || 0
    }
    const record = { id: batch, at: Date.now(), decision, count: marked, skipped, bytes }
    state.agentBatches = [...(state.agentBatches ?? []), record].slice(-10)
    if (ledger && state.root) ledger.agentBatches(state.root, state.agentBatches)
    state.revision += 1
    return record
  }

  /**
   * 整理：给一批路径写「移到 <目录>」。写的是和手动移动同一份数据；
   * 同一个对象标了移动，就清掉它的 delete 决定（意图替代，不并存）。
   */
  function setOperation({ paths, to, note, by = 'human', batch }) {
    if (!Array.isArray(paths) || paths.length === 0) throw new Error('paths required')
    if (typeof to !== 'string' || !to.startsWith('/') || to === '/') throw new Error('target must be an absolute directory')
    const list = [...new Set(paths.filter((p) => typeof p === 'string' && p.startsWith('/')))]
    if (list.length > 500) throw new Error('at most 500 paths per batch')
    const id = batch ?? `o${Date.now().toString(36)}`
    const byPath = new Map(state.entries.map((e) => [e.path, e]))
    for (const path of list) {
      const next = {
        op: 'move', to, note: typeof note === 'string' ? note.slice(0, 500) : '', by, batch: id,
        bytes: byPath.get(path)?.bytes || 0,
      }
      state.operations[path] = next
      if (ledger) ledger.setOperation(path, next)
      if (state.annotations[path]?.decision === 'delete') annotate({ path, decision: 'none' })
    }
    state.revision += 1
    return { batch: id, count: list.length }
  }

  function clearOperations({ paths, batch }) {
    const list = Array.isArray(paths) ? paths : Object.entries(state.operations ?? {})
      .filter(([, op]) => !batch || op.batch === batch)
      .map(([path]) => path)
    let removed = 0
    for (const path of list) {
      if (!state.operations?.[path]) continue
      if (batch && state.operations[path].batch !== batch) continue
      delete state.operations[path]
      if (ledger) ledger.setOperation(path, null)
      removed += 1
    }
    state.revision += 1
    return { removed }
  }

  /** 执行成功后：清掉这些路径的操作，并把 from→to 记成一批（供撤销）。 */
  function finishMoves({ results }) {
    const done = (results ?? []).filter((r) => r.ok)
    const items = []
    for (const r of done) {
      const op = state.operations[r.from]
      delete state.operations[r.from]
      if (ledger) ledger.setOperation(r.from, null)
      items.push({ from: r.from, to: r.dest, bytes: op?.bytes || 0 })
    }
    if (items.length > 0) {
      const batch = {
        id: `m${Date.now().toString(36)}`,
        at: Date.now(),
        items,
        count: items.length,
        bytes: items.reduce((n, it) => n + (it.bytes || 0), 0),
      }
      // 没有账本也要留内存里的一份：撤销是运行期能力，不是持久化附属品
      state.moveBatches = [...(state.moveBatches ?? []), batch].slice(-10)
      if (ledger && state.root) ledger.moveBatches(state.root, state.moveBatches)
    }
    state.revision += 1
    return items.length
  }

  /** 执行清理（移动到废纸篓）成功后：删批注、把项从当前层移除、记成一批可撤销的移动。 */
  function finishDelete({ results }) {
    const done = (results ?? []).filter((r) => r.ok)
    const byPath = new Map(state.entries.map((e) => [e.path, e]))
    const items = []
    for (const r of done) {
      const bytes = byPath.get(r.from)?.bytes || 0
      delete state.annotations[r.from]
      if (ledger) ledger.setAnnotation(r.from, null)
      if (state.objections?.[r.from]) {
        delete state.objections[r.from]
        if (ledger) ledger.setObjection(r.from, null)
      }
      items.push({ from: r.from, to: r.dest, bytes })
    }
    if (items.length > 0) {
      state.entries = state.entries.filter((e) => !items.some((it) => it.from === e.path))
      const batch = {
        id: `d${Date.now().toString(36)}`,
        at: Date.now(),
        items,
        count: items.length,
        bytes: items.reduce((n, it) => n + (it.bytes || 0), 0),
      }
      state.moveBatches = [...(state.moveBatches ?? []), batch].slice(-10)
      if (ledger && state.root) ledger.moveBatches(state.root, state.moveBatches)
    }
    refreshPatternDecisions()
    state.revision += 1
    return items.length
  }

  /** 找到某一批移动（缺省用最近一批）。 */
  function moveBatch(batch) {
    const list = state.moveBatches ?? []
    const found = batch ? list.find((b) => b.id === batch) : list.at(-1)
    if (!found) throw new Error('no such move batch')
    return found
  }

  /** 撤销成功后把这一批从账本里删掉。 */
  function dropMoveBatch(batch) {
    state.moveBatches = (state.moveBatches ?? []).filter((b) => b.id !== batch)
    if (ledger && state.root) ledger.moveBatches(state.root, state.moveBatches)
    state.revision += 1
  }

  /**
   * Agent 的异议：只对「人已经做过的决定」写一句，不改决定本身。
   * 人改了决定，异议自动失效（见 annotate）。
   */
  function setObjection({ path, note }) {
    const ann = state.annotations[path]
    if (!ann?.decision) throw new Error('只能对已有的决定提异议')
    if (ann.by !== 'human') throw new Error('这是 Agent 自己的标注，不需要异议')
    if (typeof note !== 'string' || note.trim() === '') throw new Error('note required')
    const record = { note: note.slice(0, 600), by: 'agent' }
    state.objections[path] = record
    if (ledger) ledger.setObjection(path, record)
    state.revision += 1
    return record
  }

  /** 撤销某一批 Agent 标注；人后来改过的（by 已变 human）不动。 */
  function undoAgentBatch({ batch }) {
    const list = state.agentBatches ?? []
    const record = batch ? list.find((b) => b.id === batch) : list.at(-1)
    if (!record) throw new Error('no such batch')
    let removed = 0
    for (const [path, ann] of Object.entries(state.annotations)) {
      if (ann.batch !== record.id || ann.by !== 'agent') continue
      delete state.annotations[path]
      if (ledger) ledger.setAnnotation(path, null)
      // 撤销的批次项没有人工决定，不该带异议；保险起见这里也清掉
      if (state.objections?.[path]) {
        delete state.objections[path]
        if (ledger) ledger.setObjection(path, null)
      }
      removed += 1
    }
    refreshPatternDecisions()
    state.agentBatches = list.filter((b) => b.id !== record.id)
    if (ledger && state.root) ledger.agentBatches(state.root, state.agentBatches)
    state.revision += 1
    return { batch: record.id, removed }
  }

  /** 当前层里值得让 Agent 看一眼的项：没有语义，或语义已过期。 */
  function pendingSemantics(limit = 50) {
    const out = []
    for (const e of state.entries) {
      if (out.length >= limit) break
      const s = state.claims[e.path]
      const state_ = s ? publicSemantic(s, e)?.state : null
      if (!s) out.push({ path: e.path, name: e.name, bytes: e.bytes, reason: 'new' })
      else if (state_ !== 'fresh') out.push({ path: e.path, name: e.name, bytes: e.bytes, reason: 'stale' })
    }
    return out
  }

  /** 决定变了，索引里那 200 条也要跟着变（不重算分组，只同步 decision）。 */
  function refreshPatternDecisions() {
    for (const group of state.patterns.groups) {
      for (const entry of group.entries) entry.decision = state.annotations[entry.path]?.decision
    }
  }

  // decision 省略 = 只改备注（保留原有决定）；'none' = 清除决定（备注仍可留着）。
  // 决定和备注都空 → 整条删除，回到未审。
  // by/batch 由内部使用：Agent 写的决定与人的决定是同一份数据，只差来源标记。
  function annotate({ path, decision, note, by = 'human', batch }) {
    if (typeof path !== 'string' || !path.startsWith('/')) throw new Error('path must be absolute')
    if (decision !== undefined && !DECISIONS.has(decision)) throw new Error(`decision must be one of ${[...DECISIONS].join(', ')}`)
    const prev = state.annotations[path]
    const nextDecision = decision === undefined ? prev?.decision : (decision === 'none' ? undefined : decision)
    // 只有「决定真的变了」才让异议失效；只改备注不算
    const decisionChanged = by === 'human' && decision !== undefined && nextDecision !== prev?.decision
    const nextNote = typeof note === 'string' ? note.slice(0, 2000) : (prev?.note ?? '')
    if (!nextDecision && !nextNote) {
      delete state.annotations[path]
      if (ledger) ledger.setAnnotation(path, null)
      if (decisionChanged && state.objections?.[path]) {
        delete state.objections[path]
        if (ledger) ledger.setObjection(path, null)
      }
    } else {
      const next = {
        decision: nextDecision,
        note: nextNote,
        by,
        batch: by === 'agent' ? batch : undefined,
        updatedAt: Date.now(),
      }
      // 人的决定一变，针对旧决定的异议就失效
      if (decisionChanged && state.objections?.[path]) {
        delete state.objections[path]
        if (ledger) ledger.setObjection(path, null)
      }
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
    const by = { keep: [], delete: [] }
    for (const e of entries) {
      const a = state.annotations[e.path]
      if (a && by[a.decision]) by[a.decision].push(e)
    }
    const sum = (list) => list.reduce((n, e) => n + (e.bytes || 0), 0)
    const moving = entries.filter((e) => state.operations?.[e.path]?.op === 'move')
    return {
      deleteCount: by.delete.length,
      keepCount: by.keep.length,
      undecidedCount: entries.length - by.delete.length - by.keep.length,
      reclaimBytes: sum(by.delete),
      keepBytes: sum(by.keep),
      moveCount: moving.length,
      moveBytes: sum(moving),
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
      facetHue: state.facetHue,
      history: state.history,
      trends: state.trends,
      executions: state.executions.slice(-5),
      agentBatches: state.agentBatches.slice(-3),
      objections: state.objections,
      operations: state.operations,
      moveBatches: state.moveBatches.slice(-3),
      fromCache: state.fromCache,
      revalidating: state.revalidating,
      plan: plan(entries),
      patterns: state.patterns.groups.map(({ id, label, count, bytes, files, shown }) => ({
        id, label, count, bytes, files, shown,
      })),
      patternsAt: state.patterns.at,
      patternsTruncated: state.patterns.truncated,
      rules: rules(),
      config: state.config,
    }
  }

  /** 导出：给用户留档的完整计划（仍然不含删除动作）。 */
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
      if (!DECISIONS.has(decision) || decision === 'none') throw new Error('decision must be keep, delete or none')
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

  /** 完整索引（含每条路径），只在打开「索引」视图时拉一次。 */
  function patterns() {
    return { at: state.patterns.at, truncated: state.patterns.truncated, groups: state.patterns.groups }
  }

  return {
    state, hydrate, startScan, addEntry, finishScan, setClaim, pendingSemantics, annotate, annotateMany,
    markPaths, undoAgentBatch, setObjection, setOperation, clearOperations, finishMoves, finishDelete, moveBatch, dropMoveBatch,
    plan, snapshot, patterns, setRule, replaceRules, rules, setConfig,
  }
}
