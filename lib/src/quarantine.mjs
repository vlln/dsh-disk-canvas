// 隔离区：清理脚本把待清理项 mv 到 $HOME/.Trash/dsh-disk-canvas-<时间戳>/，
// 这里负责列出它们、并支持把某一项（或整批）移回原位。
// 只做 mv / rename，不删除任何东西——真正清空废纸篓是用户自己的动作。
import { readdir, readFile, stat, rename, mkdir } from 'node:fs/promises'
import { join, basename, dirname } from 'node:path'

export const QUARANTINE_PREFIX = 'dsh-disk-canvas-'
export const MANIFEST = 'manifest.tsv'

/** 目录名里的时间戳（dsh-disk-canvas-20261019-011230）→ 毫秒；解析不了返回 0。 */
export function parseBatchTime(name) {
  const m = /^dsh-disk-canvas-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(name)
  if (!m) return 0
  const [, y, mo, d, h, mi, s] = m
  const at = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)).getTime()
  return Number.isFinite(at) ? at : 0
}

/** manifest.tsv：每行 `name\tbytes\t原路径`（脚本生成，可能没有）。 */
export function parseManifest(text) {
  const map = new Map()
  for (const line of String(text ?? '').split('\n')) {
    if (!line.trim()) continue
    const parts = line.split('\t')
    if (parts.length < 3) continue
    const [name, bytes, ...rest] = parts
    const path = rest.join('\t')
    if (!name || !path.startsWith('/')) continue
    map.set(name, { bytes: Number(bytes) || 0, path })
  }
  return map
}

async function sizeOf(path) {
  try {
    const st = await stat(path)
    if (!st.isDirectory()) return st.size
  } catch {
    return 0
  }
  // 目录大小算起来太贵：只统计条目数，体积用 manifest 里记录的值
  return 0
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * 列出所有隔离批次。
 * @param {{ home: string }} options
 */
export async function listQuarantine({ home }) {
  const base = join(home, '.Trash')
  let dirents = []
  try {
    dirents = await readdir(base, { withFileTypes: true })
  } catch {
    return { base, batches: [], count: 0, bytes: 0 }
  }
  const batches = []
  for (const dirent of dirents) {
    if (!dirent.isDirectory() || !dirent.name.startsWith(QUARANTINE_PREFIX)) continue
    const dir = join(base, dirent.name)
    let names = []
    try {
      names = (await readdir(dir)).filter((n) => n !== MANIFEST)
    } catch {
      continue
    }
    let manifest = new Map()
    try {
      manifest = parseManifest(await readFile(join(dir, MANIFEST), 'utf8'))
    } catch {
      manifest = new Map()
    }
    let bytes = 0
    const entries = []
    for (const name of names.sort()) {
      const meta = manifest.get(name)
      const size = meta?.bytes ?? await sizeOf(join(dir, name))
      bytes += size
      entries.push({
        name,
        bytes: size,
        path: meta?.path ?? null,
        restorable: Boolean(meta?.path) && !(await exists(meta.path)),
      })
    }
    batches.push({
      id: dirent.name,
      dir,
      at: parseBatchTime(dirent.name),
      hasManifest: manifest.size > 0,
      count: entries.length,
      bytes,
      entries,
    })
  }
  batches.sort((a, b) => b.at - a.at)
  return {
    base,
    batches,
    count: batches.reduce((n, b) => n + b.count, 0),
    bytes: batches.reduce((n, b) => n + b.bytes, 0),
  }
}

async function restoreOne({ dir, manifest, name }) {
  const meta = manifest.get(name)
  if (!meta) return { name, ok: false, reason: 'no-manifest' }
  const from = join(dir, name)
  const fromExists = await exists(from)
  const targetExists = await exists(meta.path)
  if (!fromExists) return { name, ok: false, reason: targetExists ? 'already' : 'missing' }
  if (targetExists) return { name, ok: false, reason: 'target-exists' }
  try {
    await mkdir(dirname(meta.path), { recursive: true })
    await rename(from, meta.path)
    return { name, ok: true, path: meta.path }
  } catch (error) {
    const code = error?.code ?? ''
    return { name, ok: false, reason: code === 'EXDEV' ? 'cross-device' : String(error?.message ?? error) }
  }
}

/**
 * 把某一批里的一项（name 省略则整批）移回原位。
 * @param {{ home: string, batch: string, name?: string }} options
 */
export async function restoreQuarantine({ home, batch, name }) {
  if (typeof batch !== 'string' || !batch.startsWith(QUARANTINE_PREFIX) || batch.includes('/')) {
    throw new Error('batch must be a quarantine directory name')
  }
  const dir = join(home, '.Trash', batch)
  if (!(await exists(dir))) throw new Error('batch not found')
  let manifest = new Map()
  try {
    manifest = parseManifest(await readFile(join(dir, MANIFEST), 'utf8'))
  } catch {
    manifest = new Map()
  }
  if (manifest.size === 0) throw new Error('this batch has no manifest; restore it from Finder')

  const targets = name ? [name] : [...manifest.keys()]
  const results = []
  for (const target of targets) {
    if (typeof target !== 'string' || target.includes('/')) {
      results.push({ name: target, ok: false, reason: 'bad-name' })
      continue
    }
    results.push(await restoreOne({ dir, manifest, name: target }))
  }
  return { batch, results, restored: results.filter((r) => r.ok).length }
}

/** 兜底导出给测试/调试：保留 basename 语义与目录名解析。 */
export const internals = { parseBatchTime, parseManifest, basename }
