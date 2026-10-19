// 扫描：只读、无副作用。给出一个目录的「直接子项 + 递归体积」。
// 预算按子项切分（每个子项独立条目/时间上限），全局只留时间闸——
// 否则最大的那个目录会吃光预算，其它子项全变成 0。
import { readdir, lstat } from 'node:fs/promises'
import { basename, join } from 'node:path'

export const CHILD_MAX_ENTRIES = 400_000
export const CHILD_MAX_MS = 20_000
export const MAX_MS = 60_000

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
  let index = 0

  const worker = async () => {
    while (index < queue.length) {
      if (Date.now() >= globalDeadline) return
      const dirent = queue[index++]
      const item = await measure(join(root, dirent.name), dirent, globalDeadline)
      if (item) {
        entries.push(item)
        if (onChild) onChild(item)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker))

  entries.sort((a, b) => b.bytes - a.bytes)
  const partial = entries.some((e) => e.partial) || Date.now() >= globalDeadline
  return { root, entries, partial, entriesSeen: entries.reduce((n, e) => n + (e.files || 0), 0), scannedAt: Date.now() }
}

async function measure(path, dirent, globalDeadline) {
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

  let bytes = 0
  let files = 0
  let latestModified = 0
  const stack = [path]
  while (stack.length > 0) {
    if (over()) {
      budget.partial = true
      break
    }
    const dir = stack.pop()
    let list
    try {
      list = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const d of list) {
      budget.entries += 1
      if (d.isSymbolicLink()) continue
      const child = join(dir, d.name)
      if (d.isDirectory()) {
        stack.push(child)
        continue
      }
      if (!d.isFile()) continue
      try {
        const st = await lstat(child)
        bytes += st.size
        files += 1
        if (st.mtimeMs > latestModified) latestModified = st.mtimeMs
      } catch {
        // 无权限 / 竞态删除：跳过，不阻塞整体扫描
      }
    }
  }
  return { path, name, kind: 'dir', bytes, files, latestModified, partial: budget.partial }
}
