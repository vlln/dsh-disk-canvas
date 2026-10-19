// 极小的 HTTP 工具：JSON 响应、限长读体、跨源判据（POST 写面用）。
export function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  })
  res.end(JSON.stringify(body))
}

export async function readJson(req, limit = 64 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('request body too large')
    chunks.push(chunk)
  }
  if (size === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/** 浏览器同源判据：Sec-Fetch-Site 或 Origin 与 Host 不一致即拒绝。 */
export function isCrossOrigin(headers, host) {
  const site = headers['sec-fetch-site']
  if (site === 'cross-site') return true
  const origin = headers.origin
  if (!origin) return false
  try {
    return new URL(origin).host !== host
  } catch {
    return true
  }
}
