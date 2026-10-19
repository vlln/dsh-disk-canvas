// 确定性风险规则：只回答“这类对象通常是什么、删了会怎样”，不假装知道内容。
// 输出五档 risk：safe / caution / personal / high / unknown；claim 是给用户看的一句话，
// basis 说明依据（规则名），confidence 只表达规则的把握度，不是模型概率。

const DAY = 24 * 60 * 60 * 1000

/** 系统级路径：删了会坏系统或应用。 */
const SYSTEM = [/^\/System(\/|$)/, /^\/usr(\/|$)/, /^\/bin(\/|$)/, /^\/sbin(\/|$)/, /^\/Library(\/|$)/,
  /^\/Applications(\/|$)/, /^\/private\/(?!tmp\/|var\/folders\/)/, /^\/opt(\/|$)/]
/** 个人内容：再大也先当“重要”，交给用户判断。 */
const PERSONAL = [/\/(Documents|Desktop|Pictures|Movies|Music)(\/|$)/, /\/(Projects?|Code|Repos?|Workspace)(\/|$)/,
  /\/\.ssh(\/|$)/, /\/(keys?|wallet|credentials)(\/|$)/i]

function under(p, base) {
  return p === base || (p.startsWith(base) && p[base.length] === '/')
}

/**
 * @param {string} path 绝对路径
 * @param {{ isDir: boolean, name?: string, latestModified?: number, now?: number }} ctx
 * @returns {{ risk: string, claim: string, basis: string, confidence: number }}
 */
export function classify(path, ctx) {
  const name = ctx.name ?? path.split('/').pop() ?? ''
  const isDir = ctx.isDir
  const now = ctx.now ?? Date.now()

  for (const re of SYSTEM) {
    if (re.test(path)) return { risk: 'high', claim: '系统或全局数据：删除会影响系统或应用，不建议在这里动手', basis: '系统路径', confidence: 0.9 }
  }
  for (const re of PERSONAL) {
    if (re.test(path)) return { risk: 'personal', claim: '个人内容：删了可能找不回来，交给你判断', basis: '个人目录', confidence: 0.85 }
  }
  if (under(path, `${process.env.HOME ?? ''}/Library`)) {
    return { risk: 'caution', claim: '应用数据与缓存：展开逐项判断，整块删除会让应用丢配置', basis: '~/Library', confidence: 0.7 }
  }
  if (name === '.Trash' || path.includes('/.Trash/')) {
    return { risk: 'safe', claim: '废纸篓：清空不释放正在使用的数据，可先检查有没有误删', basis: '废纸篓', confidence: 0.95 }
  }
  if (/(^|\/)Library\/Logs(\/|$)/.test(path) || /\.log$/i.test(name) || /^\/var\/log(\/|$)/.test(path)) {
    return { risk: 'safe', claim: '日志：删了只会少一份排查记录，应用会重建', basis: '日志规则', confidence: 0.85 }
  }
  if (/(^|\/)Library\/Caches(\/|$)/.test(path) || /\/\.cache(\/|$)/.test(path)) {
    return { risk: 'caution', claim: '缓存：删除后应用会重建，首次启动可能变慢或重新下载', basis: '缓存规则', confidence: 0.92 }
  }
  if (isDir && name === 'node_modules') {
    return { risk: 'caution', claim: '依赖目录：删掉可由 lockfile 重装，重装前项目跑不起来', basis: 'node_modules', confidence: 0.9 }
  }
  if (name === '.DS_Store') return { risk: 'safe', claim: 'Finder 元数据：删了会自动重建', basis: 'DS_Store', confidence: 0.95 }
  if (isDir && /\/Downloads(\/|$)/.test(path) && ctx.latestModified && now - ctx.latestModified > 180 * DAY) {
    return { risk: 'caution', claim: '下载目录里半年没动过：多半是装完忘删的包或一次性文件', basis: '下载 · 180 天未改动', confidence: 0.8 }
  }
  if (!isDir && /\.(dmg|pkg|iso)$/i.test(name)) {
    return { risk: 'caution', claim: '安装镜像：装完后通常可以删，删前确认不是唯一备份', basis: '安装包', confidence: 0.75 }
  }
  return { risk: 'unknown', claim: '未归类：我没有足够证据判断它能不能删', basis: '无匹配规则', confidence: 0 }
}

// ---------- 跨层目录索引：按名字识别「一类可清理的目录」 ----------
// 这里的匹配只决定「要不要记进索引」，风险仍由 classify 给出；
// build/target/dist 这类名字太通用，单独标成 caution 并写清楚可能误伤。
export const PATTERN_GROUPS = Object.freeze([
  // risk 用「这类目录本身能不能重建」来判断，而不是路径位置：
  // 项目目录里的 node_modules 仍然是 node_modules，不该被当成「个人内容」。
  { id: 'node_modules', label: 'node_modules', names: /^node_modules$/, hint: '依赖目录，可由 lockfile 重装', risk: 'caution' },
  { id: 'caches', label: 'Caches', names: /^(Caches|caches|\.cache)$/, hint: '应用缓存，删后重建', risk: 'caution' },
  { id: 'build', label: 'dist / build / target', names: /^(dist|build|out|target|\.next|\.nuxt|\.turbo|\.parcel-cache)$/, hint: '构建产物，确认不是源码目录', risk: 'caution' },
  { id: 'pycache', label: '__pycache__ / .venv', names: /^(__pycache__|\.pytest_cache|\.mypy_cache|\.ruff_cache|\.venv|venv|\.tox)$/, hint: 'Python 缓存与虚拟环境', risk: 'caution' },
  { id: 'logs', label: 'Logs', names: /^(Logs|logs)$/, hint: '日志目录', risk: 'safe' },
  { id: 'trash', label: '.Trash', names: /^\.Trash$/, hint: '废纸篓', risk: 'safe' },
  { id: 'derived', label: 'DerivedData', names: /^DerivedData$/, hint: 'Xcode 派生数据，会重建', risk: 'safe' },
])

/** 名字命中哪一类（不命中返回 null）。 */
export function patternOf(name) {
  for (const group of PATTERN_GROUPS) {
    if (group.names.test(name)) return group
  }
  return null
}

/** 去掉被同一类里其它条目包含的路径（避免 group 合计重复计数）。 */
export function dedupeNested(paths) {
  const sorted = [...paths].sort((a, b) => a.length - b.length || a.localeCompare(b))
  const kept = []
  for (const p of sorted) {
    if (kept.some((k) => p === k || p.startsWith(k + '/'))) continue
    kept.push(p)
  }
  return kept
}
