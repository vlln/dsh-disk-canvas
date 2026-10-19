// dsh-disk-canvas Node half：只读扫描 + 规则/Agent 标注 + 人的决定。
// v0 不提供任何删除或移动动作——执行面在确认清单之后，且本版本刻意留空。
import { stat } from 'node:fs/promises'
import { dirname, isAbsolute } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { scanChildren } from './lib/src/scan.mjs'
import { createStore } from './lib/src/store.mjs'
import { PATHS } from './lib/src/routes.mjs'
import { json, readJson, isCrossOrigin } from './lib/src/http.mjs'

export const name = 'dsh-disk-canvas'
export const inject = ['tools', 'webServer']

const HOME = process.env.HOME ?? '/'
const TOP_LIMIT = 30

export function apply(ctx) {
  const store = createStore()
  let inflight = { root: null, promise: null }

  /** 同路径的并发扫描复用一个 promise；换路径则新开。 */
  const scanTo = (root) => {
    if (inflight.promise && inflight.root === root) return inflight.promise
    const promise = scanChildren(root).then((result) => {
      store.setScan(result)
      return store
    })
    inflight = { root, promise }
    promise.catch(() => {}).finally(() => {
      if (inflight.promise === promise) inflight = { root: null, promise: null }
    })
    return promise
  }

  const ensure = async (root) => {
    if (root) return scanTo(root)
    if (!store.state.root) return scanTo(HOME)
    return store
  }

  const summarize = (limit = TOP_LIMIT) => {
    const snap = store.snapshot()
    return {
      root: snap.root,
      partial: snap.partial,
      scannedAt: snap.scannedAt,
      totalBytes: snap.entries.reduce((n, e) => n + (e.bytes || 0), 0),
      plan: snap.plan,
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
      })),
    }
  }

  ctx.effect(() => {
    const disposers = [
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.state,
        handler: async (req, res) => {
          try {
            if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
            await ensure()
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
            await scanTo(root)
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
            store.annotate({ path: body.path, decision: body.decision, note: body.note })
            json(res, 200, store.snapshot())
          } catch (error) {
            json(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.plan,
        handler: async (req, res) => {
          try {
            if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
            await ensure()
            json(res, 200, store.exportPlan())
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
    ]
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'disk-canvas: routes')

  ctx.effect(() => {
    const disposers = [
      ctx.tools.register(defineTool({
        name: 'disk_canvas_scan',
        description:
          '扫描一个目录（默认主目录）的直接子项，返回体积最大的若干项及规则标注。只读：不删除、不移动任何文件。',
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
          await scanTo(root)
          return summarize()
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
          await ensure()
          const summary = summarize(TOP_LIMIT)
          return summary
        },
      })),
      ctx.tools.register(defineTool({
        name: 'disk_canvas_claim',
        description:
          '给某个路径写一条标注（判断 + 风险档 + 置信度），会覆盖该路径的规则推断并显示在画布上。仍然不执行任何删除。',
        parameters: {
          path: { type: 'string', required: true, description: '绝对路径' },
          claim: { type: 'string', required: true, description: '一句话判断：这是什么、删了会怎样' },
          risk: { type: 'string', description: 'safe / caution / high / unknown' },
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
          const saved = store.setClaim(args)
          return { ok: true, path: args.path, claim: saved.claim, risk: saved.risk ?? 'unknown' }
        },
      })),
    ]
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'disk-canvas: tools')
}
