// dsh-disk-canvas Node half：只读扫描 + 规则/Agent 标注 + 人的决定。
// 同一份包挂两个模式：
//   mode=host  —— 提供 dsh-disk-canvas.api 服务 + 只读/批注路由（画布数据面）；
//   mode=tools —— preset 子行，只注册 disk_canvas_* 工具，工具只对该 preset 的 Agent 可见。
// v0 不提供任何删除或移动动作——执行面在确认清单之后，且本版本刻意留空。
import { stat } from 'node:fs/promises'
import { mkdirSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { basename, dirname, isAbsolute, join } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { scanChildren } from './lib/src/scan.mjs'
import { createStore } from './lib/src/store.mjs'
import { createLedger } from './lib/src/ledger.mjs'
import { PATHS } from './lib/src/routes.mjs'
import { json, readJson, isCrossOrigin } from './lib/src/http.mjs'
import { previewMoves, executeMoves } from './lib/src/organize.mjs'

export const name = 'dsh-disk-canvas'
/** 两种模式都要 tools（tools 模式注册工具、宿主模式不注册）；webServer 用于宿主路由。 */
export const inject = ['tools', 'webServer']

const HOME = process.env.HOME ?? '/'
/** 工具输出必须是 lossless JSON：undefined 字段会被判成 invalid output（踩过）。 */
const lossless = (value) => JSON.parse(JSON.stringify(value))
const TOP_LIMIT = 30
/** 扫描原因：只有 refresh / schedule / agent / boot 才算「测量」，navigate 不写历史。 */
const SCAN_REASONS = new Set(['navigate', 'refresh', 'schedule', 'agent', 'boot'])

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
  let queuedReason = 'refresh'
  let queuedKeep = false

  /** 当前层里标了待清理的路径（执行清理与预览共用）。 */
  const deletePaths = () => store.state.entries
    .filter((e) => store.state.annotations[e.path]?.decision === 'delete')
    .map((e) => e.path)

  const TRASH = join(HOME, '.Trash')

  const exists = (path) => { try { statSync(path); return true } catch { return false } }

  /** 整理方案的预览：目标文件夹是否已存在、源是否还在、目标是否冲突。 */
  const planPreview = (plan) => {
    const folders = (plan.folders ?? []).map((path) => ({ path, exists: exists(path) }))
    const rows = (plan.moves ?? []).map((m) => {
      const dest = join(m.to, basename(m.from))
      if (!exists(m.from)) return { from: m.from, to: m.to, dest, ok: false, reason: 'gone', bytes: 0 }
      if (exists(dest)) return { from: m.from, to: m.to, dest, ok: false, reason: 'conflict', bytes: 0 }
      return { from: m.from, to: m.to, dest, ok: true, bytes: 0 }
    })
    return { folders, rows }
  }

  /** 把一条消息投递给绑定的会话（自动补语义 / 用户点「让 Agent 提方案」共用）。 */
  const CANVAS_RULES = '[磁盘画布] 你是磁盘整理助手：只分析、标注、预览，绝不直接改动文件。不要用 shell / 写文件 / 删文件；要动文件时用 disk_canvas_mark / disk_canvas_organize 写标记，执行由用户点。'
  const CONTEXT_SEP = '\n\n---\n\n'
  /** 给模型看的上下文和给用户看的话用分隔符隔开，转录时只显示后面那段。 */
  const withRules = (body) => `${CANVAS_RULES}${CONTEXT_SEP}${body}`

  const askAgent = (text, forcedId = null) => new Promise((resolve, reject) => {
    const candidates = [...bindings.entries()].sort((a, b) => a[1].at - b[1].at)
    const target = forcedId ? [forcedId, { at: 0 }] : candidates.at(-1)
    if (!target) { reject(new Error('no session bound')); return }
    const [sessionId] = target
    ctx.inject(['sessionController'], (scope) => {
      const commands = scope.sessionController?.commands
      if (!commands?.prompt) { reject(new Error('sessionController.commands unavailable')); return }
      Promise.resolve(commands.prompt({
        requestId: randomUUID(),
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
      }, { kind: 'disk-canvas' })).then(resolve).catch(reject)
    })
  })

  /**
   * 自动补语义：扫描完成后，把一条「该标注了」的消息投递回当前会话。
   * 只在用户主动扫描（refresh / schedule）之后触发，有冷却，避免把会话刷成流水账。
   */
  /**
   * 每个打开过画布的会话都记一笔（sessionId → {preset, at}）。
   * 自动补语义只挑「最近一次绑定」的会话——多开会话时不能听最后一个 bind。
   */
  const bindings = new Map()
  let lastAutoAt = 0
  let lastAutoScannedAt = 0
  let lastAutoError = ''

  const autoAnnotate = (pending, scannedAt) => {
    if (pending === 0) return
    // 同一次扫描只触发一次：重复的 state 轮询 / 重复进入都不会再唤醒
    if (scannedAt === lastAutoScannedAt) return
    const candidates = [...bindings.entries()].sort((a, b) => a[1].at - b[1].at)
    const target = candidates.at(-1)
    if (!target) {
      // 只有「磁盘整理」这个 preset 里才有 disk_canvas_* 工具；投进别的会话只会让 Agent 干瞪眼
      lastAutoError = 'no session bound'
      return
    }
    const [sessionId] = target
    lastAutoScannedAt = scannedAt
    lastAutoAt = Date.now()
    const text = [
      `磁盘扫描完成：${store.state.root}（${store.state.entries.length} 项）。`,
      `其中 ${pending} 项还没有语义。`,
      '请用 disk_canvas_state 读取 pending，挑最有把握的项用 disk_canvas_claim 写语义（带 evidence）；',
      '不要替用户做决定，也不要一次标太多。',
    ].join('')
    askAgent(withRules(text)).then(() => { lastAutoError = '' })
      .catch((error) => { lastAutoError = String(error?.message ?? error).slice(0, 200) })
  }

  /** 渐进扫描：子项一完成就上屏；同一时间只跑一个，后到的请求排队换根。 */
  const beginScan = (root, reason = 'refresh', { keep = false } = {}) => {
    if (running) { queued = root; queuedReason = reason; queuedKeep = keep; return running }
    store.startScan(root, { keep })
    let early = false
    const onChild = (item) => {
      store.addEntry(item)
      // 扫描可能很久：先让 Agent 对已经出来的部分动手，别等全部扫完
      if (!early && reason !== 'agent' && store.state.entries.length >= 6 && store.pendingSemantics(50).length > 0) {
        early = true
        askAgent(withRules([
          `磁盘扫描进行中：已经读到 ${store.state.entries.length} 项（还会继续）。`,
          '可以先用 disk_canvas_state { wait:false } 看当前结果，给最有把握的项写语义；',
          '不要等扫描结束，也不要一次标太多。',
        ].join(''))).catch(() => { /* 没绑定会话就等扫完再发 */ })
      }
    }
    running = scanChildren(
      root,
      keep ? undefined : onChild,
    )
      .then((result) => {
        if (keep) for (const item of result.entries) store.addEntry(item)
        const next = store.finishScan({
          partial: result.partial,
          scannedAt: result.scannedAt,
          patterns: result.patterns,
          patternsTruncated: result.patternsTruncated,
          reason,
        })
        // 每次扫描结束都通知 Agent 一次（agent 自己触发的扫描除外，否则会自激）
        if (reason !== 'agent') autoAnnotate(store.pendingSemantics(50).length, result.scannedAt)
        return next
      })
      .catch(() => store.finishScan({ partial: true, scannedAt: Date.now(), reason }))
      .finally(() => {
        running = null
        const next = queued
        const nextReason = queuedReason
        const nextKeep = queuedKeep
        queued = null
        queuedReason = 'refresh'
        queuedKeep = false
        if (next) beginScan(next, nextReason, { keep: nextKeep })
      })
    return running
  }

  /** 导航阈值：比这还旧就顺手在后台刷新一次（不写历史、不白屏）。 */
  const NAV_MAX_AGE_MS = 10 * 60 * 1000

  /**
   * 换根的统一入口。
   * navigate —— 有缓存先给缓存（秒开），太旧才后台刷新；不写历史。
   * refresh / schedule / agent / boot —— 真扫一次，算「测量」。
   */
  const openRoot = (root, reason = 'refresh') => {
    if (reason !== 'navigate') return beginScan(root, reason)
    const cached = ledger.latest(root)
    if (!cached) return beginScan(root, 'refresh')
    if (running) { queued = root; queuedReason = reason; queuedKeep = false; return running }
    store.hydrate(cached)
    if (Date.now() - cached.at > NAV_MAX_AGE_MS) beginScan(root, 'navigate', { keep: true })
    return Promise.resolve(store)
  }

  /** 自动扫描：按记住的间隔重扫上一次的根；关掉就是普通手动模式。 */
  let autoTimer = null
  const scheduleAuto = () => {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null }
    const hours = store.state.config?.autoScanHours ?? 0
    if (!hours) return
    autoTimer = setInterval(() => {
      if (store.state.scanning) return
      openRoot(store.state.root ?? HOME, 'schedule')
    }, hours * 3600_000)
    autoTimer.unref?.()
  }
  scheduleAuto()
  ctx.effect(() => () => { if (autoTimer) clearInterval(autoTimer) }, 'disk-canvas: auto scan timer')
  {
    const hours = store.state.config?.autoScanHours ?? 0
    const age = Date.now() - (store.state.scannedAt || 0)
    if (hours > 0 && (!store.state.scannedAt || age > hours * 3600_000)) openRoot(store.state.root ?? HOME, 'schedule')
  }

  /** 工具要完整结果：等当前扫描，必要时换根重扫。 */
  const scanAndWait = async (root) => {
    const target = root ?? store.state.root ?? HOME
    if (running) await running
    if (store.state.root !== target || store.state.scannedAt === 0 || store.state.scanning || store.state.fromCache) await beginScan(target, 'agent')
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
      executions: snap.executions,
      // 让 Agent 知道「这层里哪些还没有语义、哪些已经过期」——省得它整层重标
      pending: store.pendingSemantics(30),
      entries: snap.entries.slice(0, limit).map((e) => ({
        path: e.path,
        kind: e.kind,
        bytes: e.bytes,
        files: e.files,
        claim: e.claim,
        confidence: e.confidence,
        source: e.source,
        semantic: e.semantic ?? null,
        decision: snap.annotations[e.path]?.decision ?? null,
        // 人的备注：解释「为什么这样判断」，Agent 应当读它
        note: snap.annotations[e.path]?.note ?? null,
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
    markPaths: (args) => store.markPaths(args),
    setObjection: (args) => store.setObjection(args),
    setOperation: (args) => store.setOperation(args),
  }), 'disk-canvas: api service')

  ctx.effect(() => {
    const disposers = [
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.state,
        handler: async (req, res) => {
          try {
            if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
            if (!store.state.root && !running) openRoot(HOME, 'boot')
            json(res, 200, { ...store.snapshot(), auto: {
              bound: bindings.size > 0,
              sessions: [...bindings.entries()].map(([id, info]) => ({ id, preset: info.preset, at: info.at })),
              lastAt: lastAutoAt,
              enabled: store.state.config?.autoAnnotate !== false,
              error: lastAutoError,
            } })
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
            const reason = SCAN_REASONS.has(body.reason) ? body.reason : 'refresh'
            openRoot(root, reason)
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
        path: PATHS.config,
        handler: async (req, res) => {
          try {
            if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            const body = await readJson(req)
            if (body.rememberRule) store.setRule({ id: body.rememberRule.id, decision: body.rememberRule.decision })
            if (body.forgetRule) store.setRule({ id: body.forgetRule, decision: null })
            if (Array.isArray(body.rules)) store.replaceRules(body.rules)
            if (body.autoScanHours !== undefined) {
              store.setConfig({ autoScanHours: body.autoScanHours })
              scheduleAuto()
            }
            if (body.autoAnnotate !== undefined) store.setConfig({ autoAnnotate: Boolean(body.autoAnnotate) })
            json(res, 200, store.snapshot())
          } catch (error) {
            json(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.executePreview,
        handler: async (req, res) => {
          try {
            if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
            const ops = deletePaths().map((path) => ({ path, to: TRASH }))
            json(res, 200, { trash: TRASH, rows: await previewMoves(ops.slice(0, 500)) })
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.execute,
        handler: async (req, res) => {
          try {
            if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            const paths = deletePaths().slice(0, 500)
            if (paths.length === 0) return json(res, 400, { error: 'nothing to delete' })
            const results = await executeMoves(paths.map((path) => ({ path, to: TRASH })))
            // macOS 下 ~/.Trash 可能被 TCC 保护（EPERM）：退到插件自己的回收目录，保证「清理」真的能落地
            let fallback = null
            const denied = results.filter((r) => !r.ok && r.reason === 'denied')
            if (denied.length > 0) {
              fallback = join(process.env.DSH_HOME ?? join(HOME, '.dsh'), 'trash', new Date().toISOString().replace(/[:.]/g, '-'))
              const retry = await executeMoves(denied.map((r) => ({ path: r.from, to: fallback })))
              for (const row of retry) {
                const index = results.findIndex((r) => r.from === row.from)
                if (index >= 0) results[index] = row
              }
            }
            const removed = store.finishDelete({ results })
            json(res, 200, { removed, trash: fallback ?? TRASH, fallback: Boolean(fallback), results, state: store.snapshot() })
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      // 一次性会话：不挂工作区，因此不出现在左侧列表；画布页打开时按需创建
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.session,
        handler: async (req, res) => {
          try {
            if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            const body = await readJson(req)
            const created = await new Promise((resolve, reject) => {
              ctx.inject(['sessionController'], (scope) => {
                const commands = scope.sessionController?.commands
                if (!commands?.create) { reject(new Error('sessionController.commands.create unavailable')); return }
                commands.create({
                  ...(typeof body?.sessionId === 'string' ? { sessionId: body.sessionId } : {}),
                  cwd: HOME,
                  reusable: () => true,
                }).then(resolve, reject)
              })
            })
            json(res, 200, { sessionId: created.sessionId, preset: created.agentPreset ?? null })
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      // 会话文字记录：只取 user/assistant 的纯文本，给画布里的对话抽屉用
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.transcript,
        handler: async (req, res) => {
          try {
            if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
            const url = new URL(req.url ?? '/', 'http://localhost')
            const sessionId = url.searchParams.get('sessionId') ?? ''
            let running = false
            const messages = await new Promise((resolve) => {
              ctx.inject(['sessions'], (scope) => {
                const session = scope.sessions?.get?.(sessionId)
                running = Boolean(session?.running)
                if (!session?.snapshotEvents) { resolve([]); return }
                const out = []
                for (const event of session.snapshotEvents()) {
                  if (event.type === 'agent/inbox/spliced') {
                    for (const item of event.data?.inserted ?? []) {
                      const text = (item.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('')
                      const shown = text.includes(CONTEXT_SEP) ? text.slice(text.lastIndexOf(CONTEXT_SEP) + CONTEXT_SEP.length) : text
                      if (shown.trim()) out.push({ role: 'user', text: shown.slice(0, 2000), at: event.time })
                    }
                  } else if (event.type === 'assistant/message') {
                    const text = (event.data?.message?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('')
                    if (text) out.push({ role: 'assistant', text: text.slice(0, 2000), at: event.time })
                  }
                }
                resolve(out.slice(-40))
              })
            })
            json(res, 200, { messages, running })
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.say,
        handler: async (req, res) => {
          try {
            if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            const body = await readJson(req)
            const text = typeof body?.text === 'string' ? body.text.trim() : ''
            const sessionId = typeof body?.sessionId === 'string' && body.sessionId ? body.sessionId : null
            if (!text) return json(res, 400, { error: 'text required' })
            // 抽屉里的自由对话也带上画布的约束（B 方案下这是软约束）
            await askAgent(withRules(text), sessionId)
            json(res, 200, { ok: true })
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.ask,
        handler: async (req, res) => {
          try {
            if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            await askAgent(withRules([
              `请根据画布上已有的语义（state 里的 entries[].semantic），挑出可以清理的项，`,
              `用 disk_canvas_mark 标成 delete；只标你有把握的，一次别超过 10 项，`,
              `标完告诉用户标了哪些、为什么、可以整批撤销。没有把握的就留着。`,
            ].join('')))
            json(res, 200, { ok: true })
          } catch (error) {
            json(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.organizeUndoPreview,
        handler: async (req, res) => {
          try {
            if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
            const batch = store.moveBatch(new URL(req.url ?? '/', 'http://localhost').searchParams.get('batch') ?? undefined)
            const ops = batch.items.map((it) => ({ path: it.to, to: dirname(it.from) }))
            json(res, 200, { batch: batch.id, rows: await previewMoves(ops) })
          } catch (error) {
            json(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.organizeUndo,
        handler: async (req, res) => {
          try {
            if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            const body = await readJson(req)
            const batch = store.moveBatch(body.batch)
            const ops = batch.items.map((it) => ({ path: it.to, to: dirname(it.from) }))
            const results = await executeMoves(ops)
            if (results.length > 0 && results.every((r) => r.ok)) store.dropMoveBatch(batch.id)
            json(res, 200, { batch: batch.id, results, state: store.snapshot() })
          } catch (error) {
            json(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.bind,
        handler: async (req, res) => {
          try {
            if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            const body = await readJson(req)
            if (typeof body.sessionId === 'string' && body.sessionId !== '') {
              const preset = typeof body.preset === 'string' ? body.preset : null
              bindings.set(body.sessionId, { preset, at: Date.now() })
              // 绑定变化（比如刚切到磁盘整理模式）允许对新目标重新触发一次
              lastAutoScannedAt = 0
              lastAutoError = ''
            }
            json(res, 200, { ok: true, bound: bindings.size > 0 })
          } catch (error) {
            json(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
      ctx.webServer.register({
        kind: 'exact',
        path: PATHS.undo,
        handler: async (req, res) => {
          try {
            if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
            if (isCrossOrigin(req.headers, req.headers.host)) return json(res, 403, { error: 'cross-origin request rejected' })
            const body = await readJson(req)
            const result = store.undoAgentBatch({ batch: body.batch })
            json(res, 200, { ...result, state: store.snapshot() })
          } catch (error) {
            json(res, 400, { error: error instanceof Error ? error.message : String(error) })
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
          return lossless(api.summarize())
        },
      })),
      ctx.tools.register(defineTool({
        name: 'disk_canvas_state',
        description: '读取当前画布状态：扫描根、清理计划（人已标注的决定）与体积最大的若干项。用于在对话里解释或修改提案。',
        parameters: {
          wait: { type: 'boolean', description: 'false = 立即返回当前结果（扫描进行中也行），默认等扫描完成' },
        },
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
        execute: async (args) => {
          if (args.wait !== false) await api.scanAndWait()
          return lossless(api.summarize(TOP_LIMIT))
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
        name: 'disk_canvas_mark',
        description:
          '直接给一批路径写决定（delete / keep / unsure），和用户按 K/D/U 写的是同一份数据，画布会立刻变成同样的样子。' +
          '只补「还没有决定」的项：用户标过的不覆盖。每批可整批撤销。不要替用户做最终选择——只标你有把握的。',
        parameters: {
          paths: { type: 'array', items: { type: 'string' }, description: '绝对路径，≤500 个' },
          decision: { type: 'string', required: true, description: 'delete | keep | unsure' },
          note: { type: 'string', description: '一句话理由，会显示在批注里' },
        },
        output: {
          schema: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              batch: { type: 'string' },
              count: { type: 'number' },
              skipped: { type: 'number' },
              bytes: { type: 'number' },
            },
            additionalProperties: true,
          },
          render: (_args, value) => [{
            type: 'text',
            text: `已标 ${value.count} 项（跳过 ${value.skipped} 项已有决定的）· ${value.bytes} B · 批次 ${value.batch}`,
          }],
        },
        execute: async (args) => {
          const saved = api.markPaths(args)
          return lossless({ ok: true, batch: saved.id, count: saved.count, skipped: saved.skipped, bytes: saved.bytes })
        },
      })),
      ctx.tools.register(defineTool({
        name: 'disk_canvas_object',
        description:
          '对你不同意的、用户已经做过的决定写一句异议。只写说明，绝不改决定；用户改了决定，异议自动失效。' +
          '没有具体理由就不要写——空洞的反对会稀释真正重要的那些。',
        parameters: {
          path: { type: 'string', required: true, description: '绝对路径' },
          note: { type: 'string', required: true, description: '为什么不同意，一句话说清依据' },
        },
        output: {
          schema: {
            type: 'object',
            properties: { ok: { type: 'boolean' }, path: { type: 'string' }, note: { type: 'string' } },
            additionalProperties: true,
          },
          render: (_args, value) => [{ type: 'text', text: `已记录异议：${value.path} — ${value.note}` }],
        },
        execute: async (args) => {
          const saved = api.setObjection(args)
          return lossless({ ok: true, path: args.path, note: saved.note })
        },
      })),
      ctx.tools.register(defineTool({
        name: 'disk_canvas_claim',
        description:
          '给某个路径写一条语义：它是什么（一句话）、属于哪一类、依据是什么。会覆盖该路径的旧语义并显示在画布上。' +
          '仍然不执行任何删除。没有依据就写 evidence: [] 并把把握说低，不要用「安全」包装猜测。',
        parameters: {
          path: { type: 'string', required: true, description: '绝对路径' },
          claim: { type: 'string', required: true, description: '一句话判断：这是什么、删了会怎样' },
          label: { type: 'string', description: '短名字，例如「Xcode 编译中间产物」；画布上优先显示它' },
          category: {
            type: 'string',
            description: '从固定词表里选：project / deps / build / cache / installer / media / doc / system / other。不要自造类别',
            enum: ['project', 'deps', 'build', 'cache', 'installer', 'media', 'doc', 'system', 'other'],
          },
          evidence: { type: 'array', items: { type: 'string' }, description: '依据列表：读过什么文件、看到什么名字/时间，1–3 条足够' },
          confidence: { type: 'number', description: '0–1，表示对这条判断的把握' },
          model: { type: 'string', description: '可省略；留空则由宿主记录' },
        },
        output: {
          schema: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              path: { type: 'string' },
              claim: { type: 'string' },
              category: { type: 'string' },
              state: { type: 'string' },
            },
            additionalProperties: true,
          },
          render: (_args, value) => [{ type: 'text', text: `已标注 ${value.path}：${value.claim}` }],
        },
        execute: async (args) => {
          const saved = api.setClaim(args)
          return lossless({ ok: true, path: args.path, claim: saved.claim, category: saved.category ?? null })
        },
      })),
    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'disk-canvas: preset tools')
}
