// dsh-disk-canvas client half：侧边栏「磁盘画布」页。
// 自渲染（不经官方 hole）：树图 + 检视器 + 批注，数据全部来自 Node half 的只读路由。
// 视觉：只用 --dsw-* token，不写死颜色、不定义深色主题。
window.__ModuleLoader__.load({
  id: 'dsh-disk-canvas',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-disk-canvas'
    const PANEL_ID = 'dsh-disk-canvas'
    const PATHS = {
      state: '/plugins/dsh-disk-canvas/state',
      scan: '/plugins/dsh-disk-canvas/scan',
      annotate: '/plugins/dsh-disk-canvas/annotate',
      plan: '/plugins/dsh-disk-canvas/plan',
    }

    const zh = {
      panel: '磁盘画布',
      title: '磁盘画布',
      subtitle: 'Agent 标注 · 你来决定 · 删前可预览',
      rescan: '重新扫描',
      up: '返回上层',
      scanning: '扫描中…',
      loading: '加载中…',
      empty: '这个目录没有可显示的内容',
      total: '共',
      item: '项',
      items: '项',
      partial: '部分结果：超出扫描预算',
      selectHint: '点一个方块，查看它的判断与证据',
      openDir: '进入目录',
      bytes: '体积',
      files: '文件数',
      modified: '最近改动',
      risk: '风险',
      source: '来源',
      claim: '判断',
      basis: '依据',
      confidence: '把握',
      decision: '你的决定',
      keep: '保留',
      delete: '待清理',
      unsure: '待复查',
      clear: '清除',
      note: '批注',
      noteHint: '批注随决定一起保存',
      plan: '待清理',
      reclaim: '预计释放',
      kept: '保留',
      unreviewed: '未审',
      previewOn: '预览清理后',
      previewOff: '退出预览',
      export: '导出计划',
      previewBanner: '预览模式：画布隐藏了待清理项。磁盘没有任何改动。',
      footer: 'v0 只做分析与预览，不提供删除动作；导出的计划可供你自己执行。',
      agent: 'Agent 标注',
      rule: '规则推断',
      safe: '安全',
      caution: '谨慎',
      high: '高危',
      personal: '个人',
      unknown: '未知',
    }
    const en = {
      panel: 'Disk Canvas',
      title: 'Disk Canvas',
      subtitle: 'Agent annotates · you decide · preview before deleting',
      rescan: 'Rescan',
      up: 'Up',
      scanning: 'Scanning…',
      loading: 'Loading…',
      empty: 'Nothing to show in this directory',
      total: 'Total',
      item: 'item',
      items: 'items',
      partial: 'Partial: scan budget exceeded',
      selectHint: 'Click a tile to see the claim and evidence',
      openDir: 'Open folder',
      bytes: 'Size',
      files: 'Files',
      modified: 'Modified',
      risk: 'Risk',
      source: 'Source',
      claim: 'Claim',
      basis: 'Basis',
      confidence: 'Confidence',
      decision: 'Your decision',
      keep: 'Keep',
      delete: 'To delete',
      unsure: 'Unsure',
      clear: 'Clear',
      note: 'Note',
      noteHint: 'The note is saved with the decision',
      plan: 'To delete',
      reclaim: 'Reclaim',
      kept: 'Kept',
      unreviewed: 'Unreviewed',
      previewOn: 'Preview cleanup',
      previewOff: 'Exit preview',
      export: 'Export plan',
      previewBanner: 'Preview: tiles marked for deletion are hidden. Nothing on disk has changed.',
      footer: 'v0 only analyses and previews; it never deletes. The exported plan is yours to run.',
      agent: 'Agent claim',
      rule: 'Rule',
      safe: 'Safe',
      caution: 'Caution',
      high: 'High risk',
      personal: 'Yours',
      unknown: 'Unknown',
    }

    // ---------- 数据 ----------
    async function fetchJson(url, init) {
      const res = await fetch(url, { headers: { accept: 'application/json' }, ...init })
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
      return res.json()
    }
    const postJson = (url, body) => fetchJson(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

    // ---------- 工具 ----------
    function formatBytes(n) {
      if (!n) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let v = n
      let i = 0
      while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1 }
      return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
    }
    function formatDate(ms) {
      if (!ms) return '—'
      try { return new Date(ms).toISOString().slice(0, 10) } catch { return '—' }
    }
    function shortPath(p, home) {
      if (!p) return ''
      if (home && (p === home || p.startsWith(home + '/'))) return '~' + p.slice(home.length)
      return p
    }
    function parentOf(p) {
      if (!p || p === '/') return null
      const i = p.lastIndexOf('/')
      return i <= 0 ? '/' : p.slice(0, i)
    }

    // ---------- 树图布局（squarified） ----------
    function layout(items, width, height) {
      if (!width || !height || items.length === 0) return []
      const positive = items.filter((i) => (i.bytes || 0) > 0)
      if (positive.length === 0) return []
      const total = positive.reduce((n, i) => n + i.bytes, 0)
      const scale = (width * height) / total
      return squarify(positive.map((i) => ({ ...i, area: i.bytes * scale })), width, height)
    }
    function squarify(items, width, height) {
      const out = []
      let x = 0
      let y = 0
      let w = width
      let h = height
      let row = []
      let i = 0
      const worst = (r, side) => {
        const sum = r.reduce((n, it) => n + it.area, 0)
        const max = Math.max(...r.map((it) => it.area))
        const min = Math.min(...r.map((it) => it.area))
        return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))
      }
      const place = () => {
        if (row.length === 0) return
        const sum = row.reduce((n, it) => n + it.area, 0)
        if (w >= h) {
          const rw = sum / h
          let ry = y
          for (const it of row) {
            const rh = it.area / rw
            out.push({ ...it, x, y: ry, w: rw, h: rh })
            ry += rh
          }
          x += rw
          w -= rw
        } else {
          const rh = sum / w
          let rx = x
          for (const it of row) {
            const rw = it.area / rh
            out.push({ ...it, x: rx, y, w: rw, h: rh })
            rx += rw
          }
          y += rh
          h -= rh
        }
        row = []
      }
      while (i < items.length) {
        if (w <= 0 || h <= 0) break
        const item = items[i]
        const side = Math.min(w, h)
        if (row.length === 0) { row = [item]; i += 1; continue }
        if (worst(row.concat([item]), side) <= worst(row, side)) { row.push(item); i += 1 }
        else place()
      }
      place()
      return out
    }

    function useElementSize(ref) {
      const [size, setSize] = React.useState({ w: 0, h: 0 })
      React.useEffect(() => {
        const el = ref.current
        if (!el) return undefined
        const ro = new ResizeObserver((entries) => {
          const rect = entries[0].contentRect
          setSize({ w: rect.width, h: rect.height })
        })
        ro.observe(el)
        setSize({ w: el.clientWidth, h: el.clientHeight })
        return () => ro.disconnect()
      }, [ref])
      return size
    }

    // ---------- 组件 ----------
    function Page({ t }) {
      const [state, setState] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [selected, setSelected] = React.useState(null)
      const [preview, setPreview] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [note, setNote] = React.useState('')
      const canvasRef = React.useRef(null)
      const size = useElementSize(canvasRef)

      React.useEffect(() => {
        let alive = true
        let timer = null
        const tick = async () => {
          try {
            const s = await fetchJson(PATHS.state)
            if (!alive) return
            setState(s)
            setError(null)
            timer = setTimeout(tick, s.scanning ? 1200 : 3000)
          } catch (e) {
            if (!alive) return
            setError(String(e.message ?? e))
            timer = setTimeout(tick, 3000)
          }
        }
        tick()
        return () => { alive = false; clearTimeout(timer) }
      }, [])

      const annotations = state?.annotations ?? {}
      const entries = state?.entries ?? []
      const selectedEntry = selected ? entries.find((e) => e.path === selected) ?? null : null
      const annotation = selected ? annotations[selected] : undefined

      React.useEffect(() => {
        setNote(annotation?.note ?? '')
      }, [selected, annotation?.note])

      const visible = React.useMemo(
        () => (preview ? entries.filter((e) => annotations[e.path]?.decision !== 'delete') : entries),
        [entries, annotations, preview],
      )
      const rects = React.useMemo(() => layout(visible, size.w, size.h), [visible, size.w, size.h])

      const runScan = async (path) => {
        setBusy(true)
        try {
          const s = await postJson(PATHS.scan, path ? { path } : {})
          setState(s)
          setError(null)
          if (path) setSelected(null)
        } catch (e) {
          setError(String(e.message ?? e))
        } finally {
          setBusy(false)
        }
      }
      const decide = async (decision) => {
        if (!selected) return
        try {
          const s = await postJson(PATHS.annotate, { path: selected, decision, note })
          setState(s)
          setError(null)
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }
      const exportPlan = async () => {
        try {
          const plan = await fetchJson(PATHS.plan)
          const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'disk-canvas-plan.json'
          a.click()
          URL.revokeObjectURL(url)
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const total = visible.reduce((n, e) => n + (e.bytes || 0), 0)
      const parent = state ? parentOf(state.root) : null
      const plan = state?.plan

      return h('div', { className: 'dc-root', 'data-disk-canvas-view': '' },
        h('div', { className: 'dc-head' },
          h('div', { className: 'dc-title' }, t('title')),
          state ? h('div', { className: 'dc-path', title: state.root }, shortPath(state.root, state.home)) : null,
          state ? h('div', { className: 'dc-meta' }, `${t('total')} ${formatBytes(total)} · ${visible.length} ${visible.length === 1 ? t('item') : t('items')}`) : null,
          state?.scanning ? h('span', { className: 'dc-chip' }, `${t('scanning')} · ${entries.length} ${t('items')}`) : null,
          !state?.scanning && state?.partial ? h('span', { className: 'dc-chip', 'data-risk': 'caution' }, t('partial')) : null,
          h('div', { className: 'dc-spacer' }),
          h('div', { className: 'dc-legend' },
            ['safe', 'caution', 'personal', 'unknown', 'high'].map((risk) =>
              h('span', { key: risk, className: 'dc-legend-item' },
                h('i', { className: 'dc-swatch', 'data-risk': risk }), t(risk)))),
          parent ? h('button', { className: 'dc-btn', type: 'button', onClick: () => runScan(parent) }, t('up')) : null,
          h('button', { className: 'dc-btn dc-btn--primary', type: 'button', onClick: () => runScan(state?.root ?? undefined), disabled: busy || state?.scanning }, (busy || state?.scanning) ? t('scanning') : t('rescan'))),
        error ? h('div', { className: 'dc-banner' }, error) : null,
        preview ? h('div', { className: 'dc-banner' }, t('previewBanner')) : null,
        h('div', { className: 'dc-body' },
          h('div', { className: 'dc-canvas', ref: canvasRef },
            !state
              ? h('div', { className: 'dc-empty' }, t('loading'))
              : rects.length === 0 && state.scanning
                ? h('div', { className: 'dc-empty' }, `${t('scanning')} · ${state.entries.length} ${t('items')}`)
                : rects.length === 0
                  ? h('div', { className: 'dc-empty' },
                      h('div', null, t('empty')),
                      h('button', { className: 'dc-btn dc-btn--primary', type: 'button', onClick: () => runScan(), disabled: busy }, t('rescan')))
                  : rects.map((r) => h(Rect, {
                    key: r.path,
                    r,
                    t,
                    selected: selected === r.path,
                    decision: state?.annotations?.[r.path]?.decision,
                    onSelect: setSelected,
                    onOpen: runScan,
                  })),
            (busy || (state?.scanning && state.entries.length === 0))
              ? h('div', { className: 'dc-busy' }, `${t('scanning')} · ${state?.entries.length ?? 0} ${t('items')}`)
              : null),
          h('aside', { className: 'dc-inspector' },
            !selectedEntry
              ? h('div', { className: 'dc-hint' }, t('selectHint'))
              : h(React.Fragment, null,
                  h('div', { className: 'dc-insp-name', title: selectedEntry.path }, selectedEntry.name),
                  h('div', { className: 'dc-insp-path', title: selectedEntry.path }, shortPath(selectedEntry.path, state?.home)),
                  selectedEntry.kind === 'dir'
                    ? h('button', { className: 'dc-btn', type: 'button', onClick: () => runScan(selectedEntry.path) }, t('openDir'))
                    : null,
                  h('div', { className: 'dc-chips' },
                    h('span', { className: 'dc-chip', 'data-risk': selectedEntry.risk }, t(selectedEntry.risk)),
                    h('span', { className: 'dc-chip' }, selectedEntry.source === 'agent' ? t('agent') : t('rule')),
                    selectedEntry.confidence
                      ? h('span', { className: 'dc-chip' }, `${t('confidence')} ${Math.round(selectedEntry.confidence * 100)}%`)
                      : null),
                  h('div', { className: 'dc-claim' }, selectedEntry.claim),
                  h('div', { className: 'dc-kv' },
                    h('span', { className: 'dc-k' }, t('basis')),
                    h('span', null, selectedEntry.basis || '—'),
                    h('span', { className: 'dc-k' }, t('bytes')),
                    h('span', null, formatBytes(selectedEntry.bytes)),
                    h('span', { className: 'dc-k' }, t('files')),
                    h('span', null, String(selectedEntry.files ?? 0)),
                    h('span', { className: 'dc-k' }, t('modified')),
                    h('span', null, formatDate(selectedEntry.latestModified))),
                  h('div', { className: 'dc-label' }, t('decision')),
                  h('div', { className: 'dc-actions' },
                    h('button', { className: `dc-btn${annotation?.decision === 'keep' ? ' dc-btn--on' : ''}`, type: 'button', onClick: () => decide('keep') }, t('keep')),
                    h('button', { className: `dc-btn${annotation?.decision === 'delete' ? ' dc-btn--on' : ''}`, type: 'button', onClick: () => decide('delete') }, t('delete')),
                    h('button', { className: `dc-btn${annotation?.decision === 'unsure' ? ' dc-btn--on' : ''}`, type: 'button', onClick: () => decide('unsure') }, t('unsure')),
                    annotation ? h('button', { className: 'dc-btn', type: 'button', onClick: () => decide('none') }, t('clear')) : null),
                  h('div', { className: 'dc-label' }, t('note')),
                  h('textarea', {
                    className: 'dc-note',
                    value: note,
                    placeholder: t('noteHint'),
                    onChange: (e) => setNote(e.target.value),
                  })))),
        h('div', { className: 'dc-plan' },
          plan
            ? h(React.Fragment, null,
                h('span', null, `${t('plan')} ${plan.deleteCount} ${plan.deleteCount === 1 ? t('item') : t('items')}`),
                h('strong', null, `${t('reclaim')} ${formatBytes(plan.reclaimBytes)}`),
                h('span', null, `${t('kept')} ${plan.keepCount}`),
                h('span', null, `${t('unsure')} ${plan.unsureCount}`),
                h('span', null, `${t('unreviewed')} ${plan.unreviewedCount}`))
            : null,
          h('div', { className: 'dc-spacer' }),
          h('button', { className: 'dc-btn', type: 'button', onClick: () => setPreview((p) => !p) }, preview ? t('previewOff') : t('previewOn')),
          h('button', { className: 'dc-btn', type: 'button', onClick: exportPlan }, t('export'))),
        h('div', { className: 'dc-foot' }, t('footer')))
    }

    function Rect({ r, t, selected, decision, onSelect, onOpen }) {
      const label = r.w > 64 && r.h > 18
      const sub = r.w > 96 && r.h > 38
      return h('button', {
        type: 'button',
        className: 'dc-rect',
        'data-risk': r.risk,
        'data-decision': decision ?? undefined,
        'data-selected': selected ? 'true' : 'false',
        title: r.path,
        style: { left: `${r.x}px`, top: `${r.y}px`, width: `${Math.max(0, r.w)}px`, height: `${Math.max(0, r.h)}px` },
        onClick: () => onSelect(r.path),
        onDoubleClick: () => { if (r.kind === 'dir' && onOpen) onOpen(r.path) },
      },
      label ? h('span', { className: 'dc-name' }, r.name) : null,
      sub ? h('span', { className: 'dc-size' }, formatBytes(r.bytes)) : null)
    }

    // ---------- 样式（只用 token） ----------
    const CSS = `
.dc-root{display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;padding:14px 18px 12px;gap:10px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5}
.dc-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dc-title{font-size:15px;font-weight:600}
.dc-path{font-size:12px;color:var(--dsw-alias-label-tertiary);max-width:38vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-meta{font-size:12px;color:var(--dsw-alias-label-secondary)}
.dc-spacer{flex:1}
.dc-btn{height:28px;padding:0 10px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm,8px);background:transparent;color:inherit;font:inherit;cursor:pointer;white-space:nowrap}
.dc-btn:hover{background:var(--dsw-specific-sidebar-nav-item-hover,transparent)}
.dc-btn--primary{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:var(--dsw-alias-bg-base)}
.dc-btn--on{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:var(--dsw-alias-bg-base)}
.dc-btn:disabled{opacity:.6;cursor:default}
.dc-body{flex:1;min-height:0;display:flex;gap:14px}
.dc-canvas{position:relative;flex:1;min-width:0;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1));overflow:hidden}
.dc-busy{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--dsw-alias-bg-base) 70%,transparent);font-size:13px;color:var(--dsw-alias-label-secondary)}
.dc-rect{position:absolute;display:flex;flex-direction:column;gap:2px;border:1px solid var(--dsw-alias-bg-layer-2,transparent);padding:5px 6px;overflow:hidden;cursor:pointer;border-radius:3px;text-align:left;font:inherit;color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 10%,var(--dsw-alias-bg-layer-1))}
.dc-rect[data-risk="safe"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 24%,var(--dsw-alias-bg-layer-1))}
.dc-rect[data-risk="caution"]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 26%,var(--dsw-alias-bg-layer-1))}
.dc-rect[data-risk="high"]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 22%,var(--dsw-alias-bg-layer-1))}
.dc-rect[data-risk="personal"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,var(--dsw-alias-bg-layer-1))}
.dc-rect[data-risk="unknown"]{background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 10%,var(--dsw-alias-bg-layer-1))}
.dc-rect[data-decision="delete"]{box-shadow:inset 0 0 0 1.5px var(--dsw-alias-state-error-primary);opacity:.62}
.dc-rect[data-decision="keep"]{box-shadow:inset 0 0 0 1.5px var(--dsw-alias-state-success-primary)}
.dc-rect[data-decision="unsure"]{box-shadow:inset 0 0 0 1.5px var(--dsw-alias-state-warn-primary)}
.dc-rect[data-selected="true"]{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}
.dc-rect:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}
.dc-name{font-size:11px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.dc-size{font-size:10px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-inspector{width:320px;flex:none;display:flex;flex-direction:column;gap:8px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md,12px);padding:12px;background:var(--dsw-alias-bg-layer-1);overflow:auto}
.dc-insp-name{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-insp-path{font-size:11px;color:var(--dsw-alias-label-tertiary);word-break:break-all}
.dc-chips{display:flex;gap:6px;flex-wrap:wrap}
.dc-chip{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:11px;background:var(--dsw-alias-bg-layer-2,transparent);border:0.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary)}
.dc-chip[data-risk="safe"]{color:var(--dsw-alias-state-success-primary);border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent)}
.dc-chip[data-risk="caution"]{color:var(--dsw-alias-state-warn-primary);border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent)}
.dc-chip[data-risk="high"]{color:var(--dsw-alias-state-error-primary);border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent)}
.dc-claim{font-size:13px;line-height:1.55}
.dc-kv{display:grid;grid-template-columns:56px 1fr;gap:4px 8px;font-size:12px}
.dc-k{color:var(--dsw-alias-label-tertiary)}
.dc-label{font-size:11px;color:var(--dsw-alias-label-tertiary);margin-top:4px}
.dc-actions{display:flex;gap:6px;flex-wrap:wrap}
.dc-note{width:100%;box-sizing:border-box;min-height:56px;resize:vertical;border:0.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-base);color:inherit;font:inherit;padding:6px 8px}
.dc-note:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}
.dc-hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dc-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--dsw-alias-label-secondary)}
.dc-plan{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--dsw-alias-label-secondary);flex-wrap:wrap}
.dc-plan strong{color:var(--dsw-alias-label-primary)}
.dc-banner{font-size:12px;padding:6px 10px;border-radius:var(--dsw-radius-sm,8px);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.dc-foot{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dc-rect:hover{outline:1px solid var(--dsw-alias-border-l2);outline-offset:-1px}
.dc-legend{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dc-legend-item{display:inline-flex;align-items:center;gap:4px}
.dc-swatch{width:8px;height:8px;border-radius:2px;display:inline-block}
.dc-swatch[data-risk="safe"]{background:var(--dsw-alias-state-success-primary)}
.dc-swatch[data-risk="caution"]{background:var(--dsw-alias-state-warn-primary)}
.dc-swatch[data-risk="personal"]{background:var(--dsw-alias-state-business-primary)}
.dc-swatch[data-risk="unknown"]{background:var(--dsw-alias-label-tertiary);opacity:.5}
.dc-swatch[data-risk="high"]{background:var(--dsw-alias-state-error-primary)}
.dc-chip[data-risk="personal"]{color:var(--dsw-alias-state-business-primary);border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 14%,transparent)}
:has([data-disk-canvas-view]) [data-width-handle]{display:none}
`

    function ensureStyle() {
      if (typeof document === 'undefined') return
      if (document.querySelector('style[data-dsh-disk-canvas]')) return
      const el = document.createElement('style')
      el.setAttribute('data-dsh-disk-canvas', '')
      el.textContent = CSS
      document.head.appendChild(el)
    }

    function apply(ctx) {
      ensureStyle()
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'disk-canvas: copy')
      ctx.effect(() => ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: PANEL_ID,
        order: 20,
        locale: NS,
        label: () => t('panel'),
        inject: () => ({ t }),
      }, Page)), 'disk-canvas: conversation tab')
    }

    exports.apply = apply
    exports.inject = ['slots', 'locale']
    return module.exports
  },
})
