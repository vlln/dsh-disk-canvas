// 跨层收集规则：只决定「哪些目录值得记进索引」，不判断「它是什么、能不能删」。
// 这是**收集机制**，不是语义：命中的目录名只说明它可能属于同一类，
// 至于这类东西该不该清、删了会怎样，由 Agent 的语义（semantics）或人来回答。
// 名字表是默认值，不是判决——后续可以改成 Agent 写的配置；说明文案在客户端 i18n（按 group id）。

export const PATTERN_GROUPS = Object.freeze([
  { id: 'node_modules', label: 'node_modules', names: /^node_modules$/ },
  { id: 'caches', label: 'Caches', names: /^(Caches|caches|\.cache)$/ },
  { id: 'build', label: 'dist / build / target', names: /^(dist|build|out|target|\.next|\.nuxt|\.turbo|\.parcel-cache)$/ },
  { id: 'pycache', label: '__pycache__ / .venv', names: /^(__pycache__|\.pytest_cache|\.mypy_cache|\.ruff_cache|\.venv|venv|\.tox)$/ },
  { id: 'logs', label: 'Logs', names: /^(Logs|logs)$/ },
  { id: 'trash', label: '.Trash', names: /^\.Trash$/ },
  { id: 'derived', label: 'DerivedData', names: /^DerivedData$/ },
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
