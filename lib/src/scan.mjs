// 扫描：只读、无副作用。给出一个目录的「直接子项 + 递归体积」。
// 预算按子项切分（每个子项独立条目/时间上限），全局只留时间闸——
// 否则最大的那个目录会吃光预算，其它子项全变成 0。
import { readdir, lstat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { patternOf } from './rules.mjs'

// 预算要足够跑完「一个真实的大目录」：单个项目目录动辄 80 万文件，
// 卡在 40 万会让同一个目录每次扫出不同的体积（结果取决于 readdir 顺序，而不是磁盘）。
export const CHILD_MAX_ENTRIES = 2_000_000
export const CHILD_MAX_MS = 40_000
export const MAX_MS = 90_000
/** 跨层目录索引的上限：超过就只留最大的那些，别让索引本身变成负担。 */
export const MAX_PATTERN_HITS = 1200

/**
 * @param {string} root 绝对目录路径
 * @param {(entry: object) => void} [onChild] 每完成一个直接子项回调一次（渐进上屏）
 * @returns {Promise<{ root: string, entries: Array, partial: boolean, entriesSeen: number, scannedAt: number }>}
 */
export async function scanChildren(root, onChild) {
  const globalDeadline = Date.now() + MAX_MS
  const dirents = await readdir(root, { withFileTypes: true })
  const queue = dirents.filter((d) => !d.isSymbolicLink())
  const entries = []
  const hits = []
  let index = 0

  const worker = async () => {
    while (index < queue.length) {
      if (Date.now() >= globalDeadline) return
      const dirent = queue[index++]
      const item = await measure(join(root, dirent.name), dirent, globalDeadline, hits)
      if (item) {
        entries.push(item)
        if (onChild) onChild(item)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker))

  entries.sort((a, b) => b.bytes - a.bytes)
  const partial = entries.some((e) => e.partial) || Date.now() >= globalDeadline
  hits.sort((a, b) => b.bytes - a.bytes)
  return {
    root,
    entries,
    partial,
    entriesSeen: entries.reduce((n, e) => n + (e.files || 0), 0),
    patterns: hits.slice(0, MAX_PATTERN_HITS),
    patternsTruncated: hits.length > MAX_PATTERN_HITS,
    scannedAt: Date.now(),
  }
}

async function measure(path, dirent, globalDeadline, hits) {
  const name = basename(path)
  const budget = { entries: 0, partial: false, deadline: Math.min(Date.now() + CHILD_MAX_MS, globalDeadline) }
  const over = () => budget.entries >= CHILD_MAX_ENTRIES || Date.now() > budget.deadline

  if (dirent.isFile()) {
    budget.entries += 1
    try {
      const st = await lstat(path)
      return { path, name, kind: 'file', bytes: st.size, files: 1, latestModified: st.mtimeMs, partial: false }
    } catch {
      return null
    }
  }
  if (!dirent.isDirectory()) return null

  // 显式栈的 DFS：目录退出时才把它自己的汇总交给父级，
  // 这样「每个目录的递归体积」是顺带得到的，跨层索引不用再走一遍。
  const stack = [{ dir: path, list: null, i: 0, bytes: 0, files: 0, latest: 0 }]
  let total = null
  let partial = false
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    if (!frame.list) {
      if (over()) { budget.partial = true; partial = true; break }
      try {
        frame.list = await readdir(frame.dir, { withFileTypes: true })
      } catch {
        frame.list = []
      }
    }
    if (frame.i < frame.list.length) {
      const d = frame.list[frame.i++]
      budget.entries += 1
      if (d.isSymbolicLink()) continue
      const child = join(frame.dir, d.name)
      if (d.isDirectory()) {
        stack.push({ dir: child, list: null, i: 0, bytes: 0, files: 0, latest: 0 })
        continue
      }
      if (!d.isFile()) continue
      try {
        const st = await lstat(child)
        frame.bytes += st.size
        frame.files += 1
        if (st.mtimeMs > frame.latest) frame.latest = st.mtimeMs
      } catch {
        // 无权限 / 竞态删除：跳过，不阻塞整体扫描
      }
      continue
    }
    // 这个目录读完了：先记索引，再把汇总并给父级
    const done = stack.pop()
    const group = patternOf(basename(done.dir))
    if (group && hits && done.bytes > 0) {
      hits.push({ path: done.dir, name: basename(done.dir), group: group.id, bytes: done.bytes, files: done.files, latestModified: done.latest })
    }
    if (stack.length > 0) {
      const parent = stack[stack.length - 1]
      parent.bytes += done.bytes
      parent.files += done.files
      if (done.latest > parent.latest) parent.latest = done.latest
    } else {
      total = done
    }
  }
  // 预算中断时把剩下的层逐级并回去
  while (stack.length > 0) {
    const done = stack.pop()
    if (stack.length === 0) { total = done; break }
    const parent = stack[stack.length - 1]
    parent.bytes += done.bytes
    parent.files += done.files
    if (done.latest > parent.latest) parent.latest = done.latest
  }
  return {
    path, name, kind: 'dir',
    bytes: total?.bytes ?? 0,
    files: total?.files ?? 0,
    latestModified: total?.latest ?? 0,
    partial: partial || budget.partial,
  }
}
