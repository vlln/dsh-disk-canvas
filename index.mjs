// dsh-disk-canvas Node half：只读扫描 + 规则/Agent 标注 + 人的决定。
// 同一份包挂两个模式：
//   mode=host  —— 提供 dsh-disk-canvas.api 服务 + 只读/批注路由（画布数据面）；
//   mode=tools —— preset 子行，只注册 disk_canvas_* 工具，工具只对该 preset 的 Agent 可见。
// v0 不提供任何删除或移动动作——执行面在确认清单之后，且本版本刻意留空。
import { stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { scanChildren } from './lib/src/scan.mjs'
import { createStore } from './lib/src/store.mjs'
import { createLedger } from './lib/src/ledger.mjs'
import { PATHS } from './lib/src/routes.mjs'
import { json, readJson, isCrossOrigin } from './lib/src/http.mjs'

export const name = 'dsh-disk-canvas'
/** 两种模式都要 tools（tools 模式注册工具、宿主模式不注册）；webServer 用于宿主路由。 */
export const inject = ['tools', 'webServer']

const HOME = process.env.HOME ?? '/'
const TOP_LIMIT = 30

export function apply(ctx, config) {
  const mode = config?.mode === 'tools' ? 'tools' : 'host'
  if (mode === 'tools') {
    // 宿主行可能比 preset 先/后激活：等 dsh-disk-canvas.api 出现再挂工具。
    ctx.inject(['dsh-disk-canvas.api'], (scope) => {
      registerTools(scope, scope['dsh-disk-canvas.api'])
    })
    return
  }

  const ledger = createLedger()
  const store = createStore({ ledger })
  store.hydrate(ledger.latest(HOME))
  ctx.effect(() => () => ledger.flush(), 'disk-canvas: ledger flush')
  let running = null
  let queued = null

  /** 渐进扫描：子项一完成就上屏；同一时间只跑一个，后到的请求排队换根。 */
  const beginScan = (root) => {
    if (running) { queued = root; return running }
    store.startScan(root)
    running = scanChildren(root, (item) => store.addEntry(item))
      .then((result) => store.finishScan({
        partial: result.partial,
        scannedAt: result.scannedAt,
        patterns: result.patterns,
        patternsTruncated: result.patternsTruncated,
      }))
      .catch(() => store.finishScan({ partial: true, scannedAt: Date.now() }))
      .finally(() => {
        running = null
        const next = queued
        queued = null
        if (next) beginScan(next)
      })
    return running
  }

  /** 工具要完整结果：等当前扫描，必要时换根重扫。 */
  const scanAndWait = async (root) => {
    const target = root ?? store.state.root ?? HOME
    if (running) await running
    if (store.state.root !== target || store.state.scannedAt === 0 || store.state.scanning) await beginScan(target)
    return store
  }

  const summarize = (limit = TOP_LIMIT) => {
    const snap = store.snapshot()
    return {
      root: snap.root,
      partial: snap.partial,
      scanning: snap.scanning,
      scannedAt: snap.scannedAt,
      totalBytes: snap.entries.reduce((n, e) => n + (e.bytes || 0), 0),
      plan: snap.plan,
      since: snap.delta,
      history: snap.history,
      entries: snap.entries.slice(0, limit).map((e) => ({
        path: e.path,
        kind: e.kind,
        bytes: e.bytes,
        files: e.files,
        risk: e.risk,
        claim: e.claim,
        confidence: e.confidence,
        source: e.source,
        decision: snap.annotations[e.path]?.decision ?? null,
        deltaBytes: e.deltaBytes ?? null,
      })),
    }
  }

  // 画布数据面的唯一入口：preset 里的工具通过这个服务读写同一份状态。
  ctx.effect(() => ctx.provide('dsh-disk-canvas.api', {
    scanAndWait,
    summarize,
    root: () => store.state.root ?? HOME,
    history: (root, limit) => ledger.history(root ?? store.state.root ?? HOME, limit),
    setClaim: (args) => store.setClaim(args),
  }), 'disk-canvas: api service')

  ctx.effect(() => {
    const disposers = [
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.state,
        handler: async (req, res) => {
          try {
            if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
            if (!store.state.root && !running) beginScan(HOME)
            json(res, 200, store.snapshot())
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.scan,
        handler: async (req, res) => {
          try {
            if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            const body = await readJson(req)
            const root = body.path ?? HOME
            if (typeof root !== 'string' || !isAbsolute(root)) return json(res, 400, { error: 'path must be absolute' })
            const info = await stat(root)
            if (!info.isDirectory()) return json(res, 400, { error: 'path is not a directory' })
            beginScan(root)
            json(res, 200, store.snapshot())
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.annotate,
        handler: async (req, res) => {
          try {
            if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            const body = await readJson(req)
            if (Array.isArray(body.paths)) store.annotateMany({ paths: body.paths, decision: body.decision, note: body.note })
            else store.annotate({ path: body.path, decision: body.decision, note: body.note })
            json(res, 200, store.snapshot())
          } catch (error) {
            json(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.patterns,
        handler: async (req, res) => {
          try {
            if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            json(res, 200, store.patterns())
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.plan,
        handler: async (req, res) => {
          try {
            if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
            if (!store.state.root && !running) beginScan(HOME)
            json(res, 200, store.exportPlan())
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'disk-canvas: routes')
}

/** preset 模式：工具只挂在这个 preset 的 Agent 作用域里。 */
function registerTools(ctx, api) {
  ctx.effect(() => {
    const disposers = [
      ctx.tools.register(defineTool({
        name: 'disk_canvas_scan',
        description:
          '扫描一个目录（默认主目录）的直接子项，返回体积最大的若干项及风险标注。只读：不删除、不移动任何文件。渐进扫描，未完成时 scanning=true。',
        parameters: {
          path: { type: 'string', description: '绝对目录路径；省略则扫描主目录' },
        },
        output: {
          schema: {
            type: 'object',
            properties: {
              root: { type: 'string' },
              partial: { type: 'boolean' },
              totalBytes: { type: 'number' },
              entries: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
            additionalProperties: true,
          },
          render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
        },
        execute: async (args) => {
          const root = args.path ?? HOME
          if (!isAbsolute(root)) throw new Error('path must be absolute')
          const info = await stat(root)
          if (!info.isDirectory()) throw new Error('path is not a directory')
          await api.scanAndWait(root)
          return api.summarize()
        },
      })),
      ctx.tools.register(defineTool({
        name: 'disk_canvas_state',
        description: '读取当前画布状态：扫描根、清理计划（人已标注的决定）与体积最大的若干项。用于在对话里解释或修改提案。',
        parameters: {},
        output: {
          schema: {
            type: 'object',
            properties: {
              root: { type: 'string' },
              plan: { type: 'object', additionalProperties: true },
              entries: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
            additionalProperties: true,
          },
          render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
        },
        execute: async () => {
          await api.scanAndWait()
          return api.summarize(TOP_LIMIT)
        },
      })),
      ctx.tools.register(defineTool({
        name: 'disk_canvas_history',
        description: '读磁盘账本的历史扫描（默认当前根，最多 20 条）：每次扫描的总容量、是否部分结果、以及最早/最近的时间。用于回答“最近哪个目录在涨”。',
        parameters: {
          root: { type: 'string', description: '绝对路径；省略则用当前根' },
          limit: { type: 'number', description: '最多返回几条，默认 10' },
        },
        output: {
          schema: {
            type: 'object',
            properties: {
              root: { type: 'string' },
              scans: { type: 'array', items: { type: 'object', additionalProperties: true } },
              since: { type: 'object', additionalProperties: true },
            },
            additionalProperties: true,
          },
          render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
        },
        execute: async (args) => {
          const root = args.root ?? api.root?.() ?? process.env.HOME ?? '/'
          const scans = api.history(root, Math.min(20, Math.max(1, args.limit ?? 10)))
          return { root, scans, since: scans.length >= 2 ? { previousAt: scans.at(-2).at, totalDelta: scans.at(-1).totalBytes - scans.at(-2).totalBytes } : null }
        },
      })),
      ctx.tools.register(defineTool({
        name: 'disk_canvas_claim',
        description:
          '给某个路径写一条标注（判断 + 风险档 + 置信度），会覆盖该路径的规则推断并显示在画布上。仍然不执行任何删除。没有证据时 risk 用 unknown。',
        parameters: {
          path: { type: 'string', required: true, description: '绝对路径' },
          claim: { type: 'string', required: true, description: '一句话判断：这是什么、删了会怎样' },
          risk: { type: 'string', description: 'safe / caution / personal / high / unknown' },
          confidence: { type: 'number', description: '0–1，表示对这条判断的把握' },
        },
        output: {
          schema: {
            type: 'object',
            properties: { ok: { type: 'boolean' }, path: { type: 'string' }, claim: { type: 'string' }, risk: { type: 'string' } },
            additionalProperties: true,
          },
          render: (_args, value) => [{ type: 'text', text: `已标注 ${value.path}：${value.claim}` }],
        },
        execute: async (args) => {
          const saved = api.setClaim(args)
          return { ok: true, path: args.path, claim: saved.claim, risk: saved.risk ?? 'unknown' }
        },
      })),
    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'disk-canvas: preset tools')
}
