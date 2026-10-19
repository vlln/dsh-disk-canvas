// 扫描：只读、无副作用。给出一个目录的「直接子项 + 递归体积」。
// 预算双闸：条目数与墙钟时间；超出就返回 partial，绝不假装扫完了。
import { readdir, lstat } from 'node:fs/promises'
import { basename, join } from 'node:path'

export const MAX_ENTRIES = 120_000
export const MAX_MS = 9_000

/**
 * @param {string} root 绝对目录路径
 * @returns {Promise<{ root: string, entries: Array, partial: boolean, entriesSeen: number, scannedAt: number }>}
 */
export async function scanChildren(root) {
  const budget = { entries: 0, partial: false, deadline: Date.now() + MAX_MS }
  const dirents = await readdir(root, { withFileTypes: true })
  const queue = dirents.filter((d) => !d.isSymbolicLink())
  const entries = []
  let index = 0

  const worker = async () => {
    while (index < queue.length) {
      const dirent = queue[index++]
      const item = await measure(join(root, dirent.name), dirent, budget)
      if (item) entries.push(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker))

  entries.sort((a, b) => b.bytes - a.bytes)
  return { root, entries, partial: budget.partial, entriesSeen: budget.entries, scannedAt: Date.now() }
}

async function measure(path, dirent, budget) {
  const name = basename(path)
  if (dirent.isFile()) {
    budget.entries += 1
    try {
      const st = await lstat(path)
      return { path, name, kind: 'file', bytes: st.size, files: 1, latestModified: st.mtimeMs }
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
    if (budget.entries >= MAX_ENTRIES || Date.now() > budget.deadline) {
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
  return { path, name, kind: 'dir', bytes, files, latestModified }
}
