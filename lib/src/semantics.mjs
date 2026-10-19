// 语义保鲜：只回答「这个对象还是上次那个对象吗」，不回答「它是什么」。
// 用比例而不是哈希分档——哈希的桶边界会让 5% 的变化偶尔翻档，看起来像「对象变了」。
// 规则：
//   文件 —— 体积或所在日期变了就算变（文件的内容改了就是改了）；
//   目录 —— 体积涨跌 ≥25% 且 ≥1 MB，或文件数涨跌 ≥25% 且 ≥50 个，才算变。
//           目录的 mtime 不参与：往目录里写一个文件就会变，那不是「这个目录换了身份」。
const DAY = 24 * 60 * 60 * 1000
const MB = 1024 * 1024

export function dayOf(ms) {
  return Math.floor((ms ?? 0) / DAY)
}

/** 写语义时记下的对象快照；之后每次扫描拿它比。 */
export function snapshotOf(entry) {
  return {
    kind: entry.kind === 'dir' ? 'd' : 'f',
    bytes: Number(entry.bytes) || 0,
    files: Number(entry.files) || 0,
    day: dayOf(entry.latestModified),
  }
}

function moved(now, then, rel, abs) {
  const diff = Math.abs((Number(now) || 0) - (Number(then) || 0))
  return diff >= abs && diff >= Math.max(Number(then) || 0, 1) * rel
}

/**
 * @param {{ m?: object } | null | undefined} semantic
 * @param {object | null} entry
 * @returns {'fresh' | 'stale' | 'orphan' | null}
 */
export function semanticState(semantic, entry) {
  if (!semantic) return null
  if (!entry) return 'orphan'
  const m = semantic.m
  if (!m) return 'stale'
  if ((entry.kind === 'dir' ? 'd' : 'f') !== m.kind) return 'stale'
  if (m.kind === 'f') {
    return m.bytes === (Number(entry.bytes) || 0) && m.day === dayOf(entry.latestModified) ? 'fresh' : 'stale'
  }
  if (moved(entry.bytes, m.bytes, 0.25, MB)) return 'stale'
  if (moved(entry.files, m.files, 0.25, 50)) return 'stale'
  return 'fresh'
}

/** 一条语义里可以给用户看的部分（去掉内部快照）。 */
export function publicSemantic(semantic, entry) {
  if (!semantic) return null
  return {
    label: semantic.label ?? null,
    category: semantic.category ?? null,
    claim: semantic.claim ?? null,
    evidence: Array.isArray(semantic.evidence) ? semantic.evidence.slice(0, 8) : [],
    by: semantic.by ?? 'agent',
    model: semantic.model ?? null,
    at: semantic.at ?? semantic.updatedAt ?? 0,
    state: semanticState(semantic, entry),
  }
}
