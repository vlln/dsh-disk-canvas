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
