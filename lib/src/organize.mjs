// 整理的执行面：只做 move，逐项检查，单项失败不影响其它项。
// 所有护栏都在这里（而不是放在脚本里），因为 v1 之后按钮会直接调用它。
import { lstat, stat, mkdir, rename } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'

const REFUSE_ROOTS = new Set(['/', ''])

/** 目标目录必须存在或可创建；判断「跨盘」要看最近一个存在的祖先。 */
async function deviceOf(path) {
  let cur = resolve(path)
  for (let i = 0; i < 64; i += 1) {
    try {
      const st = await stat(cur)
      return st.dev
    } catch {
      const up = dirname(cur)
      if (up === cur) return null
      cur = up
    }
  }
  return null
}

async function exists(path) {
  try {
    await lstat(path)
    return true
  } catch {
    return false
  }
}

/**
 * 预演一项移动：算出目标全路径并给出冲突原因。
 * 只读，不创建目录、不移动任何东西。
 * @returns {Promise<{from: string, to: string, dest: string, ok: boolean, reason?: string, mkdir?: boolean}>}
 */
export async function previewMove(from, to) {
  if (typeof from !== 'string' || !isAbsolute(from)) return { from, to, dest: '', ok: false, reason: 'bad-source' }
  if (typeof to !== 'string' || !isAbsolute(to) || REFUSE_ROOTS.has(to)) return { from, to, dest: '', ok: false, reason: 'bad-target' }
  const dest = join(to, basename(from))
  if (resolve(dest) === resolve(from)) return { from, to, dest, ok: false, reason: 'same-path' }
  // 把目录移进自己的子目录：会丢东西
  if (resolve(to) === resolve(from) || resolve(to).startsWith(resolve(from) + '/')) {
    return { from, to, dest, ok: false, reason: 'inside-source' }
  }
  let st
  try {
    st = await lstat(from)
  } catch {
    return { from, to, dest, ok: false, reason: 'gone' }
  }
  if (await exists(dest)) return { from, to, dest, ok: false, reason: 'conflict' }
  let toStat = null
  try {
    toStat = await stat(to)
  } catch {
    toStat = null
  }
  if (toStat && !toStat.isDirectory()) return { from, to, dest, ok: false, reason: 'not-a-directory' }
  if (toStat) {
    if (toStat.dev !== st.dev) return { from, to, dest, ok: false, reason: 'cross-device' }
    return { from, to, dest, ok: true, bytes: st.size || 0 }
  }
  // 目标还不存在：看最近存在的祖先在不在同一块盘上
  const dev = await deviceOf(to)
  if (dev !== null && dev !== st.dev) return { from, to, dest, ok: false, reason: 'cross-device' }
  return { from, to, dest, ok: true, bytes: st.size || 0, mkdir: true }
}

/**
 * 执行一项移动：先预演，过了才 mkdir + rename。
 * @returns {Promise<{from: string, to: string, dest: string, ok: boolean, reason?: string}>}
 */
export async function executeMove(from, to) {
  const plan = await previewMove(from, to)
  if (!plan.ok) return plan
  try {
    await mkdir(to, { recursive: true })
    await rename(from, plan.dest)
    return { ...plan, ok: true }
  } catch (error) {
    return { ...plan, ok: false, reason: error?.code === 'EXDEV' ? 'cross-device' : 'failed' }
  }
}

/** 一批移动：逐项执行，返回明细（不做事务，也不回滚已成功的项）。 */
export async function executeMoves(ops) {
  const results = []
  for (const op of ops) {
    if (!op || (op.op && op.op !== 'move')) {
      results.push({ from: op?.path ?? '', to: op?.to ?? '', dest: '', ok: false, reason: 'unsupported' })
      continue
    }
    results.push(await executeMove(op.path, op.to))
  }
  return results
}

/** 批量预演（预览用）。 */
export async function previewMoves(ops) {
  const rows = []
  for (const op of ops) {
    const row = await previewMove(op.path, op.to)
    rows.push({ ...row, note: op.note ?? '', by: op.by ?? 'human' })
  }
  return rows
}
