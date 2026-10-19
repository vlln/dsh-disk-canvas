// dsh-disk-canvas client half：会话页签「磁盘画布」。
// 自渲染（不经官方 hole）：树图 + 检查器 + 批注，数据全部来自 Node half 的只读路由。
// 视觉规则：只用 --dsw-* token；颜色只表达语义（风险/决定），装饰一律中性色。
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
    const RISK_ORDER = ['safe', 'caution', 'personal', 'unknown', 'high']
    const RAIL_KEY = 'dsh-disk-canvas:rail'

    const zh = {
      panel: '磁盘画布',
      rescan: '重新扫描',
      up: '返回上层',
      scanning: '扫描中',
      loading: '加载中…',
      empty: '这个目录没有可显示的内容',
      emptyScan: '还没有扫描结果',
      startScan: '开始扫描',
      item: '项',
      items: '项',
      partial: '部分结果：超出扫描预算',
      partialHint: '扫描预算用完，列表可能不完整',
      since: '较上次',
      hintSpace: '标记',
      hintKeys: '直接决定',
      hintArrows: '移动',
      hintEnter: '进入目录',
      hintEsc: '返回',
      openDir: '进入目录',
      bytes: '体积',
      files: '文件数',
      modified: '最近改动',
      basis: '依据',
      confidence: '把握',
      decision: '你的决定',
      keep: '保留',
      delete: '待清理',
      unsure: '待复查',
      note: '备注',
      noteHint: '为什么这样判断（自动保存）',
      noteSaved: '已保存',
      noteSaving: '保存中…',
      plan: '待清理',
      reclaim: '预计释放',
      kept: '保留',
      unreviewed: '未审',
      progress: '审查进度',
      queue: '最大的待审',
      queueEmpty: '全部审完了',
      hiddenTiles: '{n} 项小于 1 像素，画布上点不到——都在上面的清单里',
      previewOn: '预览清理后',
      previewOff: '退出预览',
      export: '导出计划',
      previewBanner: '预览模式：画布隐藏了待清理项。磁盘没有任何改动。',
      neverDelete: '不删除任何文件',
      agent: 'Agent 标注',
      rule: '规则推断',
      safe: '安全',
      caution: '谨慎',
      high: '高危',
      personal: '个人',
      unknown: '未知',
      share: '占比',
      copyPath: '复制路径',
      copied: '已复制',
      warnHigh: '这是系统路径，删除可能导致系统或工具异常。计划里会包含它，请再确认一次。',
      warnPersonal: '个人内容：确认已经备份，或确定不再需要。',
      railHide: '收起检查器',
      railShow: '检查器',
      closeDetail: '取消选中',
      noClaim: '这一层还没有 Agent 标注',
    }
    const en = {
      panel: 'Disk Canvas',
      rescan: 'Rescan',
      up: 'Up',
      scanning: 'Scanning',
      loading: 'Loading…',
      empty: 'Nothing to show in this directory',
      emptyScan: 'Nothing scanned yet',
      startScan: 'Start scan',
      item: 'item',
      items: 'items',
      partial: 'Partial: scan budget exceeded',
      partialHint: 'The scan budget ran out; the list may be incomplete',
      since: 'vs last',
      hintSpace: 'mark',
      hintKeys: 'decide',
      hintArrows: 'move',
      hintEnter: 'open',
      hintEsc: 'back',
      openDir: 'Open folder',
      bytes: 'Size',
      files: 'Files',
      modified: 'Modified',
      basis: 'Basis',
      confidence: 'Confidence',
      decision: 'Your decision',
      keep: 'Keep',
      delete: 'To delete',
      unsure: 'Unsure',
      note: 'Note',
      noteHint: 'Why you decided this (auto-saved)',
      noteSaved: 'Saved',
      noteSaving: 'Saving…',
      plan: 'To delete',
      reclaim: 'Reclaim',
      kept: 'Kept',
      unreviewed: 'Unreviewed',
      progress: 'Review progress',
      queue: 'Largest unreviewed',
      queueEmpty: 'Everything reviewed',
      hiddenTiles: '{n} items are sub-pixel on the canvas — reach them from the list above',
      previewOn: 'Preview cleanup',
      previewOff: 'Exit preview',
      export: 'Export plan',
      previewBanner: 'Preview: tiles marked for deletion are hidden. Nothing on disk has changed.',
      neverDelete: 'deletes nothing',
      agent: 'Agent claim',
      rule: 'Rule',
      safe: 'Safe',
      caution: 'Caution',
      high: 'High risk',
      personal: 'Yours',
      unknown: 'Unknown',
      share: 'Share',
      copyPath: 'Copy path',
      copied: 'Copied',
      warnHigh: 'This is a system path. Deleting it can break the system or tools. It will be in the plan — double-check.',
      warnPersonal: 'Personal content: make sure it is backed up, or that you really no longer need it.',
      railHide: 'Hide inspector',
      railShow: 'Inspector',
      closeDetail: 'Deselect',
      noClaim: 'No agent claim at this level yet',
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
    function formatCount(n) {
      return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
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
    function share(bytes, total) {
      if (!total || !bytes) return '0%'
      const p = (bytes / total) * 100
      return p >= 10 || p >= 1 ? `${Math.round(p)}%` : '<1%'
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
          setSize((prev) => (Math.abs(prev.w - rect.width) < 1 && Math.abs(prev.h - rect.height) < 1
            ? prev
            : { w: rect.width, h: rect.height }))
        })
        ro.observe(el)
        setSize({ w: el.clientWidth, h: el.clientHeight })
        return () => ro.disconnect()
      }, [ref])
      return size
    }

    // ---------- 图标 ----------
    const ICONS = {
      folder: 'M2 5.2c0-.7.6-1.2 1.2-1.2h2.6l1.4 1.4h5.6c.7 0 1.2.6 1.2 1.2v4.9c0 .7-.6 1.2-1.2 1.2H3.2c-.7 0-1.2-.6-1.2-1.2z',
      file: 'M4.2 2.4h4.1L12 6.1v7.5H4.2zM8.3 2.4v3.7H12',
      close: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
      up: 'M8 12.6V3.6M4.3 7.3 8 3.6l3.7 3.7',
      rescan: 'M12.9 8a4.9 4.9 0 1 1-1.6-3.6M13 4.4v3.1h-3.1',
      rail: 'M2.6 3.4h10.8v9.2H2.6zM9.9 3.4v9.2',
      copy: 'M5.6 5.6h6.9v6.9H5.6zM3.5 10.4V3.5h6.9',
      check: 'M3.6 8.4 6.5 11.3 12.4 4.9',
      chevron: 'M6.2 4.4 9.8 8l-3.6 3.6',
    }
    function Icon({ name, size = 14 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        className: 'dc-ico',
      }, h('path', { d: ICONS[name] }))
    }

    function Kbd({ children }) {
      return h('kbd', { className: 'dc-kbd' }, children)
    }

    // ---------- 组件 ----------
    function Breadcrumb({ root, home, onJump }) {
      const parts = []
      if (home && (root === home || root.startsWith(home + '/'))) {
        parts.push({ label: '~', path: home, title: home })
        let acc = home
        for (const seg of root.slice(home.length).split('/').filter(Boolean)) {
          acc += '/' + seg
          parts.push({ label: seg, path: acc, title: acc })
        }
      } else {
        let acc = ''
        for (const seg of root.split('/').filter(Boolean)) {
          acc += '/' + seg
          parts.push({ label: seg, path: acc, title: acc })
        }
      }
      if (parts.length === 0) return null
      return h('nav', { className: 'dc-crumbs', 'aria-label': root },
        parts.map((part, index) => h('span', { key: part.path, className: 'dc-crumb-wrap' },
          index > 0 ? h('span', { className: 'dc-crumb-sep' }, '/') : null,
          index === parts.length - 1
            ? h('span', { className: 'dc-crumb dc-crumb--current', title: part.title }, part.label)
            : h('button', {
                type: 'button',
                className: 'dc-crumb',
                title: part.title,
                onClick: () => onJump(part.path),
              }, part.label))))
    }

    function HoverCard({ hover, t, total }) {
      const e = hover.entry
      const width = 268
      const maxX = (window.innerWidth || 1200) - width - 12
      const maxY = (window.innerHeight || 800) - 150
      return h('div', {
        className: 'dc-hover',
        style: { left: `${Math.max(8, Math.min(hover.x + 16, maxX))}px`, top: `${Math.max(8, Math.min(hover.y + 16, maxY))}px` },
      },
      h('div', { className: 'dc-hover-head' },
        h(Icon, { name: e.kind === 'dir' ? 'folder' : 'file' }),
        h('span', { className: 'dc-hover-name' }, e.name)),
      h('div', { className: 'dc-hover-path' }, shortPath(e.path, hover.home)),
      h('div', { className: 'dc-hover-row' },
        h('span', { className: 'dc-chip', 'data-risk': e.risk }, t(e.risk)),
        e.decision ? h('span', { className: 'dc-chip', 'data-decision': e.decision }, t(e.decision)) : null,
        h('span', { className: 'dc-hover-size' }, formatBytes(e.bytes)),
        h('span', { className: 'dc-hover-share' }, share(e.bytes, total)),
        e.deltaBytes ? h('span', { className: 'dc-delta' }, `${e.deltaBytes > 0 ? '▲' : '▼'} ${formatBytes(Math.abs(e.deltaBytes))}`) : null),
      h('div', { className: 'dc-hover-claim' }, e.claim))
    }

    function Tile({ r, t, total, selected, decision, onSelect, onOpen, onHover, onLeave }) {
      const w = Math.max(0, r.w - 2)
      const hh = Math.max(0, r.h - 2)
      const sz = w >= 280 && hh >= 150 ? 'lg' : w >= 140 && hh >= 58 ? 'md' : (w >= 46 && hh >= 20 ? 'sm' : 'xs')
      const named = sz !== 'xs'
      const stripe = r.risk !== 'unknown' && w >= 18 && hh >= 14
      const badge = w >= 34 && hh >= 26
      return h('button', {
        type: 'button',
        className: 'dc-rect',
        'data-risk': r.risk,
        'data-decision': decision || undefined,
        'data-selected': selected ? 'true' : 'false',
        'data-stripe': stripe ? 'true' : 'false',
        'data-sz': sz,
        'aria-label': `${r.name} ${formatBytes(r.bytes)}`,
        style: { left: `${r.x + 1}px`, top: `${r.y + 1}px`, width: `${w}px`, height: `${hh}px` },
        onClick: () => onSelect(r.path),
        onDoubleClick: () => { if (r.kind === 'dir' && onOpen) onOpen(r.path) },
        onMouseEnter: (event) => onHover && onHover(r, event),
        onMouseLeave: () => onLeave && onLeave(),
        onFocus: () => onSelect(r.path),
      },
      decision
        ? (badge
            ? h('span', { className: 'dc-mark', 'aria-hidden': 'true' }, decision === 'keep' ? '✓' : decision === 'delete' ? '✕' : '?')
            : h('span', { className: 'dc-mark dc-mark--dot', 'aria-hidden': 'true' }))
        : null,
      named
        ? h('span', { className: 'dc-tile-in' },
            h('span', { className: 'dc-tile-name' },
              r.kind === 'dir' && sz !== 'sm' ? h('span', { className: 'dc-tile-kind' }, h(Icon, { name: 'folder', size: sz === 'lg' ? 14 : 11 })) : null,
              h('span', { className: 'dc-tile-label' }, r.name)),
            sz === 'lg' || sz === 'md'
              ? h('span', { className: 'dc-tile-meta' }, formatBytes(r.bytes), h('span', { className: 'dc-tile-dot' }, '·'), share(r.bytes, total))
              : null,
            sz === 'lg' && r.files
              ? h('span', { className: 'dc-tile-meta dc-tile-meta--soft' }, `${formatCount(r.files)} ${t('files')}`, h('span', { className: 'dc-tile-dot' }, '·'), formatDate(r.latestModified))
              : null,
            (sz === 'lg' || sz === 'md') && r.claim ? h('span', { className: 'dc-tile-claim' }, r.claim) : null)
        : null)
    }

    function Stat({ value, label, tone }) {
      return h('div', { className: 'dc-stat', 'data-tone': tone, 'data-nz': Number(value) > 0 ? 'true' : 'false' },
        h('span', { className: 'dc-stat-v' }, value),
        h('span', { className: 'dc-stat-k' }, label))
    }

    function Rail({ t, state, selectedEntry, annotation, note, noteState, hiddenTiles, onNote, onDecide, onOpen, onClose, onSelect }) {
      const [copied, setCopied] = React.useState(false)
      const copiedTimer = React.useRef(null)
      React.useEffect(() => () => clearTimeout(copiedTimer.current), [])
      const entries = state?.entries ?? []
      const annotations = state?.annotations ?? {}
      const plan = state?.plan
      const total = entries.reduce((n, e) => n + (e.bytes || 0), 0)
      const reviewed = plan ? plan.entries - plan.unreviewedCount : 0
      const pctReview = plan && plan.entries ? Math.round((reviewed / plan.entries) * 100) : 0

      if (!selectedEntry) {
        const queue = entries
          .filter((e) => !annotations[e.path]?.decision)
          .slice(0, 200)
        return h('aside', { className: 'dc-rail dc-rail--overview' },
          h('div', { className: 'dc-rail-sec' },
            h('div', { className: 'dc-rail-head' },
              h('span', { className: 'dc-rail-title' }, t('progress')),
              h('span', { className: 'dc-rail-count' }, `${reviewed} / ${plan?.entries ?? entries.length}`)),
            h('div', { className: 'dc-bar' }, h('i', { style: { width: `${pctReview}%` } })),
            h('div', { className: 'dc-stats' },
              h(Stat, { value: plan?.deleteCount ?? 0, label: t('plan'), tone: 'delete' }),
              h(Stat, { value: plan?.keepCount ?? 0, label: t('kept'), tone: 'keep' }),
              h(Stat, { value: plan?.unsureCount ?? 0, label: t('unsure'), tone: 'unsure' }),
              h(Stat, { value: plan?.unreviewedCount ?? entries.length, label: t('unreviewed') }))),
          h('div', { className: 'dc-rail-sec dc-rail-sec--grow' },
            h('div', { className: 'dc-rail-head' },
              h('span', { className: 'dc-rail-title' }, t('queue')),
              h('span', { className: 'dc-rail-count' }, String(queue.length))),
            queue.length === 0
              ? h('div', { className: 'dc-rail-note' }, t('queueEmpty'))
              : h('div', { className: 'dc-queue' },
                  queue.map((e) => h('button', {
                    key: e.path,
                    type: 'button',
                    className: 'dc-queue-row',
                    title: e.claim || e.path,
                    onClick: () => onSelect(e.path),
                  },
                  h('i', { className: 'dc-dot', 'data-risk': e.risk }),
                  h('span', { className: 'dc-queue-name' }, e.name),
                  h('span', { className: 'dc-queue-size' }, formatBytes(e.bytes))))),
            hiddenTiles > 0
              ? h('div', { className: 'dc-rail-note' }, t('hiddenTiles').replace('{n}', String(hiddenTiles)))
              : null),
          h('div', { className: 'dc-rail-sec dc-hints' },
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'Space'), t('hintSpace')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'K D U'), t('hintKeys')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, '←↑↓→'), t('hintArrows')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'Enter'), t('hintEnter')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'Esc'), t('hintEsc'))))
      }

      const e = selectedEntry
      const warn = annotation?.decision === 'delete' ? (e.risk === 'high' ? t('warnHigh') : e.risk === 'personal' ? t('warnPersonal') : null) : null
      return h('aside', { className: 'dc-rail' },
        h('div', { className: 'dc-detail-head' },
          h(Icon, { name: e.kind === 'dir' ? 'folder' : 'file', size: 15 }),
          h('span', { className: 'dc-detail-name', title: e.path }, e.name),
          h('button', {
            type: 'button',
            className: `dc-icon-btn${copied ? ' dc-icon-btn--done' : ''}`,
            title: copied ? t('copied') : t('copyPath'),
            'aria-label': t('copyPath'),
            onClick: async () => {
              try {
                await navigator.clipboard.writeText(e.path)
                setCopied(true)
                clearTimeout(copiedTimer.current)
                copiedTimer.current = setTimeout(() => setCopied(false), 1400)
              } catch { /* 剪贴板不可用时保持沉默 */ }
            },
          }, h(Icon, { name: copied ? 'check' : 'copy', size: 12 })),
          h('button', { type: 'button', className: 'dc-icon-btn', 'aria-label': t('closeDetail'), onClick: onClose },
            h(Icon, { name: 'close', size: 12 }))),
        h('div', { className: 'dc-detail-path', title: e.path }, shortPath(e.path, state?.home)),
        h('div', { className: 'dc-chips' },
          h('span', { className: 'dc-chip', 'data-risk': e.risk }, t(e.risk)),
          h('span', { className: 'dc-chip' }, e.source === 'agent' ? t('agent') : t('rule')),
          e.confidence ? h('span', { className: 'dc-chip' }, `${t('confidence')} ${Math.round(e.confidence * 100)}%`) : null),
        h('div', { className: 'dc-claim', 'data-empty': e.claim ? undefined : 'true' }, e.claim || t('noClaim')),
        e.basis ? h('div', { className: 'dc-basis' }, h('span', { className: 'dc-basis-k' }, t('basis')), e.basis) : null,
        h('div', { className: 'dc-kv' },
          h('div', null, h('span', { className: 'dc-k' }, t('bytes')), h('span', { className: 'dc-v' }, formatBytes(e.bytes))),
          h('div', null, h('span', { className: 'dc-k' }, t('share')), h('span', { className: 'dc-v' }, share(e.bytes, total))),
          h('div', null, h('span', { className: 'dc-k' }, t('files')), h('span', { className: 'dc-v' }, formatCount(e.files))),
          h('div', null, h('span', { className: 'dc-k' }, t('modified')), h('span', { className: 'dc-v' }, formatDate(e.latestModified))),
          e.deltaBytes !== null && e.deltaBytes !== undefined
            ? h('div', null, h('span', { className: 'dc-k' }, t('since')), h('span', { className: 'dc-v dc-v--delta' }, `${e.deltaBytes > 0 ? '+' : '−'}${formatBytes(Math.abs(e.deltaBytes))}`))
            : null),
        h('div', { className: 'dc-detail-sec' },
          h('div', { className: 'dc-label' }, t('decision')),
          h('div', { className: 'dc-seg' },
            h('button', { type: 'button', 'data-d': 'keep', 'data-on': annotation?.decision === 'keep' ? 'true' : 'false', onClick: () => onDecide('keep') },
              h(Icon, { name: 'check', size: 12 }), t('keep'), h('em', null, 'K')),
            h('button', { type: 'button', 'data-d': 'delete', 'data-on': annotation?.decision === 'delete' ? 'true' : 'false', onClick: () => onDecide('delete') },
              h('span', { className: 'dc-seg-glyph' }, '✕'), t('delete'), h('em', null, 'D')),
            h('button', { type: 'button', 'data-d': 'unsure', 'data-on': annotation?.decision === 'unsure' ? 'true' : 'false', onClick: () => onDecide('unsure') },
              h('span', { className: 'dc-seg-glyph' }, '?'), t('unsure'), h('em', null, 'U')))),
        warn ? h('div', { className: 'dc-warn' }, warn) : null,
        h('div', { className: 'dc-detail-sec dc-detail-sec--note' },
          h('div', { className: 'dc-label' }, t('note'), noteState ? h('span', { className: 'dc-note-state' }, noteState) : null),
          h('textarea', {
            className: 'dc-note',
            value: note,
            placeholder: t('noteHint'),
            onChange: (ev) => onNote(ev.target.value),
          })),
        e.kind === 'dir'
          ? h('button', { type: 'button', className: 'dc-btn dc-btn--wide', onClick: () => onOpen(e.path) },
              h(Icon, { name: 'folder' }), t('openDir'))
          : null)
    }

    function Page({ t }) {
      const [state, setState] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [selected, setSelected] = React.useState(null)
      const [preview, setPreview] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [note, setNote] = React.useState('')
      const [noteState, setNoteState] = React.useState('')
      const [hover, setHover] = React.useState(null)
      const [railOpen, setRailOpen] = React.useState(() => {
        try { return window.localStorage.getItem(RAIL_KEY) !== '0' } catch { return true }
      })
      const hoverTimer = React.useRef(null)
      const canvasRef = React.useRef(null)
      const size = useElementSize(canvasRef)
      const noteRef = React.useRef({ path: null, saved: '', clean: '', timer: null, seq: 0 })
      const rootRef = React.useRef(null)

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

      React.useEffect(() => {
        try { window.localStorage.setItem(RAIL_KEY, railOpen ? '1' : '0') } catch { /* ignore */ }
      }, [railOpen])

      const railVisible = railOpen || Boolean(selected)
      const annotations = state?.annotations ?? {}
      const entries = state?.entries ?? []
      const selectedEntry = selected ? entries.find((e) => e.path === selected) ?? null : null
      const annotation = selected ? annotations[selected] : undefined

      // 选中项变化时同步备注；同一项内只有本地没有未保存改动时才接受服务端值。
      React.useEffect(() => {
        const cur = noteRef.current
        const serverNote = annotation?.note ?? ''
        if (cur.path !== selected) {
          // 切走之前把没落盘的备注写掉，避免丢字
          if (cur.timer) {
            clearTimeout(cur.timer)
            cur.timer = null
            if (cur.path && cur.clean !== cur.saved) save({ path: cur.path, note: cur.clean })
          }
          cur.path = selected
          cur.saved = serverNote
          cur.clean = serverNote
          setNote(serverNote)
          setNoteState('')
          return
        }
        if (serverNote !== cur.saved && cur.clean === cur.saved) {
          cur.saved = serverNote
          cur.clean = serverNote
          setNote(serverNote)
        }
      }, [selected, annotation?.note])

      const visible = React.useMemo(
        () => (preview ? entries.filter((e) => annotations[e.path]?.decision !== 'delete') : entries),
        [entries, annotations, preview],
      )
      const rects = React.useMemo(() => layout(visible, size.w, size.h), [visible, size.w, size.h])
      const total = visible.reduce((n, e) => n + (e.bytes || 0), 0)
      const hiddenTiles = visible.length - rects.filter((r) => r.w >= 1 && r.h >= 1).length
      const parent = state ? parentOf(state.root) : null

      // 选中项消失（扫描/预览）时清空
      React.useEffect(() => {
        if (selected && !entries.some((e) => e.path === selected)) setSelected(null)
      }, [entries, selected])

      const applyState = (s) => setState(s)

      const runScan = async (path) => {
        setBusy(true)
        try {
          const s = await postJson(PATHS.scan, path ? { path } : {})
          applyState(s)
          setError(null)
          if (path) setSelected(null)
        } catch (e) {
          setError(String(e.message ?? e))
        } finally {
          setBusy(false)
        }
      }

      const save = async (body, onDone) => {
        const seq = ++noteRef.current.seq
        try {
          const s = await postJson(PATHS.annotate, body)
          if (seq !== noteRef.current.seq) return false
          applyState(s)
          setError(null)
          if (onDone) onDone(true)
          return true
        } catch (e) {
          if (seq === noteRef.current.seq) {
            setError(String(e.message ?? e))
            if (onDone) onDone(false)
          }
          return false
        }
      }

      const decide = (decision) => {
        if (!selected) return
        clearTimeout(noteRef.current.timer)
        noteRef.current.clean = note
        noteRef.current.saved = note
        setNoteState('')
        save({ path: selected, decision, note })
      }

      const changeNote = (value) => {
        setNote(value)
        noteRef.current.clean = value
        const path = selected
        if (!path) return
        setNoteState(t('noteSaving'))
        clearTimeout(noteRef.current.timer)
        noteRef.current.timer = setTimeout(() => {
          noteRef.current.timer = null
          if (noteRef.current.path !== path) return
          save({ path, note: value }, (ok) => {
            if (noteRef.current.path !== path) return
            if (!ok) { setNoteState(''); return }
            noteRef.current.saved = value
            noteRef.current.clean = value
            setNoteState(t('noteSaved'))
          })
        }, 600)
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

      const cycle = (current) => (current === undefined ? 'delete' : current === 'delete' ? 'keep' : current === 'keep' ? 'unsure' : 'none')

      const move = (dir) => {
        const cur = rects.find((r) => r.path === selected)
        if (!cur) {
          if (rects.length) setSelected(rects[0].path)
          return
        }
        const cx = cur.x + cur.w / 2
        const cy = cur.y + cur.h / 2
        let best = null
        let bestScore = Infinity
        for (const r of rects) {
          if (r.path === cur.path) continue
          const dx = r.x + r.w / 2 - cx
          const dy = r.y + r.h / 2 - cy
          let primary
          let secondary
          if (dir === 'left') { if (dx > -2) continue; primary = -dx; secondary = Math.abs(dy) }
          else if (dir === 'right') { if (dx < 2) continue; primary = dx; secondary = Math.abs(dy) }
          else if (dir === 'up') { if (dy > -2) continue; primary = -dy; secondary = Math.abs(dx) }
          else { if (dy < 2) continue; primary = dy; secondary = Math.abs(dx) }
          const score = primary + secondary * 2.2
          if (score < bestScore) { bestScore = score; best = r }
        }
        if (best) setSelected(best.path)
      }

      const onKeyDown = (event) => {
        const tag = event.target?.tagName
        if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return
        const inRail = event.target?.closest?.('.dc-rail')
        const onControl = inRail && (tag === 'BUTTON' || tag === 'A')
        const key = event.key
        if (key === 'Escape') {
          event.preventDefault()
          if (selected) setSelected(null)
          else if (parent) runScan(parent)
          return
        }
        if (onControl) return
        if (key === ' ' || key === 'Spacebar') {
          if (!selected) return
          event.preventDefault()
          decide(cycle(annotation?.decision))
          return
        }
        if (!selected) {
          if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'ArrowRight' || key === 'ArrowDown') {
            event.preventDefault()
            if (rects.length) setSelected(rects[0].path)
          }
          return
        }
        if (key === 'k' || key === 'K') decide('keep')
        else if (key === 'd' || key === 'D') decide('delete')
        else if (key === 'u' || key === 'U') decide('unsure')
        else if (key === 'Backspace' || key === '0') { event.preventDefault(); decide('none') }
        else if (key === 'ArrowLeft') { event.preventDefault(); move('left') }
        else if (key === 'ArrowRight') { event.preventDefault(); move('right') }
        else if (key === 'ArrowUp') { event.preventDefault(); move('up') }
        else if (key === 'ArrowDown') { event.preventDefault(); move('down') }
        else if (key === 'Enter' && selectedEntry?.kind === 'dir') { event.preventDefault(); runScan(selectedEntry.path) }
      }

      const showHover = (entry, event) => {
        clearTimeout(hoverTimer.current)
        const x = event.clientX
        const y = event.clientY
        hoverTimer.current = setTimeout(() => setHover({ entry, x, y, home: state?.home }), 220)
      }
      const hideHover = () => {
        clearTimeout(hoverTimer.current)
        hoverTimer.current = null
        setHover(null)
      }

      const plan = state?.plan
      const risky = state?.partial && !state?.scanning
      const delta = state?.delta
      const deltaChip = delta?.previousAt && delta.totalDelta
        ? `${delta.totalDelta > 0 ? '+' : '−'}${formatBytes(Math.abs(delta.totalDelta))} ${t('since')}`
        : null
      const counts = {}
      for (const e of entries) counts[e.risk] = (counts[e.risk] ?? 0) + 1
      const legend = RISK_ORDER.filter((r) => (counts[r] ?? 0) > 0)

      return h('div', { className: 'dc-root', 'data-disk-canvas-view': '', tabIndex: 0, onKeyDown, ref: rootRef },
        h('div', { className: 'dc-top' },
          h('div', { className: 'dc-top-main' },
            state
              ? h(Breadcrumb, { root: state.root, home: state.home, onJump: (path) => runScan(path) })
              : h('span', { className: 'dc-crumbs' }, t('loading')),
            state ? h('span', { className: 'dc-vsep' }) : null,
            state
              ? h('span', { className: 'dc-meta' },
                  h('strong', null, formatBytes(total)),
                  ` · ${visible.length} ${visible.length === 1 ? t('item') : t('items')}`)
              : null,
            deltaChip ? h('span', { className: 'dc-chip dc-chip--delta', 'data-risk': delta.totalDelta > 0 ? 'caution' : 'safe' }, deltaChip) : null,
            state?.scanning ? h('span', { className: 'dc-chip' }, `${t('scanning')} · ${formatCount(entries.length)}`) : null,
            risky ? h('span', { className: 'dc-chip', 'data-risk': 'caution', title: t('partialHint') }, t('partial')) : null),
          h('div', { className: 'dc-top-side' },
            legend.length
              ? h('div', { className: 'dc-legend' },
                  legend.map((risk) => h('span', { key: risk, className: 'dc-legend-item' },
                    h('i', { className: 'dc-swatch', 'data-risk': risk }),
                    h('span', null, t(risk)),
                    h('b', null, counts[risk]))))
              : null,
            h('div', { className: 'dc-actions' },
              parent ? h('button', { type: 'button', className: 'dc-btn dc-btn--ghost', onClick: () => runScan(parent), title: parent },
                h(Icon, { name: 'up' }), t('up')) : null,
              h('button', {
                type: 'button',
                className: `dc-btn dc-btn--ghost${railVisible ? ' dc-btn--on' : ''}`,
                onClick: () => {
                  if (railVisible) { setRailOpen(false); setSelected(null) } else setRailOpen(true)
                },
                title: railVisible ? t('railHide') : t('railShow'),
                'aria-pressed': railVisible ? 'true' : 'false',
              }, h(Icon, { name: 'rail' })),
              h('button', {
                type: 'button',
                className: 'dc-btn dc-btn--primary',
                onClick: () => runScan(state?.root ?? undefined),
                disabled: busy || state?.scanning,
              }, h(Icon, { name: 'rescan' }), (busy || state?.scanning) ? t('scanning') : t('rescan'))))),

        error ? h('div', { className: 'dc-banner' }, error) : null,
        preview ? h('div', { className: 'dc-banner dc-banner--preview' }, t('previewBanner')) : null,

        h('div', { className: `dc-body${railVisible ? ' dc-body--rail' : ''}` },
          h('div', {
            className: 'dc-canvas',
            ref: canvasRef,
            onMouseDown: (event) => { if (event.target === canvasRef.current) setSelected(null) },
          },
            state?.scanning ? h('div', { className: 'dc-scanline' }, h('i', null)) : null,
            !state
              ? h('div', { className: 'dc-empty' }, h('span', { className: 'dc-empty-text' }, t('loading')))
              : rects.length === 0
                ? h('div', { className: 'dc-empty' },
                    h('span', { className: 'dc-empty-text' }, state.scanning ? `${t('scanning')}…` : (state.entries.length ? t('empty') : t('emptyScan'))),
                    state.entries.length === 0 && !state.scanning
                      ? h('button', { type: 'button', className: 'dc-btn dc-btn--primary', onClick: () => runScan(), disabled: busy }, t('startScan'))
                      : null)
                : rects.map((r) => h(Tile, {
                    key: r.path,
                    r,
                    t,
                    total,
                    selected: selected === r.path,
                    decision: annotations[r.path]?.decision,
                    onSelect: setSelected,
                    onOpen: runScan,
                    onHover: showHover,
                    onLeave: hideHover,
                  }))),
          railVisible
            ? h(Rail, {
                t,
                state,
                selectedEntry,
                annotation,
                note,
                noteState,
                hiddenTiles,
                onNote: changeNote,
                onDecide: decide,
                onOpen: runScan,
                onClose: () => setSelected(null),
                onSelect: setSelected,
              })
            : null),

        h('div', { className: 'dc-plan' },
          h('div', { className: 'dc-plan-stats' },
            h('span', { className: 'dc-plan-item dc-plan-item--delete' },
              h('i', { className: 'dc-dot', 'data-risk': 'high' }),
              `${t('plan')} ${plan?.deleteCount ?? 0}`),
            h('span', { className: 'dc-plan-item', 'data-tone': 'reclaim' },
              t('reclaim'), h('strong', null, formatBytes(plan?.reclaimBytes ?? 0))),
            h('span', { className: 'dc-plan-item' }, `${t('kept')} ${plan?.keepCount ?? 0}`),
            h('span', { className: 'dc-plan-item' }, `${t('unsure')} ${plan?.unsureCount ?? 0}`),
            h('span', { className: 'dc-plan-item' }, `${t('unreviewed')} ${plan?.unreviewedCount ?? 0}`)),
          h('div', { className: 'dc-spacer' }),
          h('span', { className: 'dc-assure' }, t('neverDelete')),
          h('button', { type: 'button', className: 'dc-btn', onClick: () => setPreview((p) => !p) }, preview ? t('previewOff') : t('previewOn')),
          h('button', { type: 'button', className: 'dc-btn', onClick: exportPlan }, t('export'))),

        hover ? h(HoverCard, { hover, t, total }) : null)
    }

    // ---------- 样式（只用 token） ----------
    const CSS = `
.dc-root{--dc-surface:var(--dsw-alias-bg-base);--dc-recess:var(--dsw-alias-bg-module-platform);--dc-line:var(--dsw-alias-border-l2);
  --dc-safe:var(--dsw-alias-state-success-primary);--dc-caution:var(--dsw-alias-state-warn-primary);
  --dc-personal:var(--dsw-alias-state-business-primary);--dc-unknown:var(--dsw-alias-label-tertiary);--dc-high:var(--dsw-alias-state-error-primary);
  position:relative;display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;padding:12px 16px 10px;gap:10px;
  color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:13px;line-height:1.5}
.dc-root:focus{outline:none}
.dc-spacer{flex:1 1 auto;min-width:0}

/* ---- 顶部 ---- */
.dc-top{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;justify-content:space-between;min-height:28px}
.dc-top-main{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.dc-top-side{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-left:auto}
.dc-crumbs{display:flex;align-items:center;gap:1px;min-width:0;font-size:13px;overflow:hidden;max-width:46vw}
.dc-crumb-wrap{display:inline-flex;align-items:center;min-width:0}
.dc-crumb{display:inline-block;border:0;background:none;padding:2px 4px;border-radius:var(--dsw-radius-xs);color:var(--dsw-alias-label-tertiary);font:inherit;font-size:13px;cursor:pointer;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-crumb:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}
.dc-crumb--current{color:var(--dsw-alias-label-primary);font-weight:600;padding:2px 4px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-crumb-sep{color:var(--dsw-alias-label-dimmed);padding:0 1px}
.dc-vsep{width:1px;height:12px;background:var(--dsw-alias-border-l3);flex:none}
.dc-meta{font-size:12px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dc-meta strong{color:var(--dsw-alias-label-secondary);font-weight:500}
.dc-legend{display:flex;align-items:center;gap:10px;font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dc-legend-item{display:inline-flex;align-items:center;gap:4px}
.dc-legend-item b{font-weight:500;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dc-swatch{width:11px;height:3px;border-radius:2px;display:inline-block;background:var(--dc-unknown)}
.dc-swatch[data-risk="safe"]{background:var(--dc-safe)}
.dc-swatch[data-risk="caution"]{background:var(--dc-caution)}
.dc-swatch[data-risk="personal"]{background:var(--dc-personal)}
.dc-swatch[data-risk="high"]{background:var(--dc-high)}
.dc-actions{display:flex;align-items:center;gap:6px}

/* ---- 按钮 ---- */
.dc-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:28px;padding:0 10px;box-sizing:border-box;
  border:1px solid var(--dc-line);border-radius:var(--dsw-radius-sm);background:var(--dc-surface);color:var(--dsw-alias-label-primary);
  font:inherit;font-size:12px;cursor:pointer;white-space:nowrap;transition:background .12s ease}
.dc-btn:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dc-btn:active{background:var(--dsw-alias-interactive-bg-hover)}
.dc-btn--primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);border-color:transparent}
.dc-btn--primary:hover{background:var(--dsw-alias-button-primary-hover)}
.dc-btn--ghost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}
.dc-btn--on{background:var(--dsw-alias-interactive-bg-active);border-color:transparent;color:var(--dsw-alias-label-primary)}
.dc-btn--ghost:hover{color:var(--dsw-alias-label-primary)}
.dc-btn--wide{width:100%;margin-top:auto}
.dc-btn:disabled{opacity:.45;cursor:default}
.dc-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
.dc-ico{flex:none;opacity:.85}
.dc-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:0;border-radius:var(--dsw-radius-xs);
  background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none}
.dc-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}
.dc-icon-btn--done{color:var(--dsw-alias-state-success-primary)}

/* ---- chips ---- */
.dc-chip{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:999px;font-size:11px;line-height:1;
  background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border:1px solid transparent;white-space:nowrap}
.dc-chip[data-risk="safe"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dc-safe) 12%,transparent)}
.dc-chip[data-risk="caution"]{color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb,var(--dc-caution) 14%,transparent)}
.dc-chip[data-risk="personal"]{color:var(--dc-personal);background:color-mix(in srgb,var(--dc-personal) 12%,transparent)}
.dc-chip[data-risk="high"]{color:var(--dc-high);background:color-mix(in srgb,var(--dc-high) 12%,transparent)}
.dc-chip[data-risk="unknown"]{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-module-platform)}
.dc-chip[data-decision="keep"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dc-safe) 12%,transparent)}
.dc-chip[data-decision="delete"]{color:var(--dc-high);background:color-mix(in srgb,var(--dc-high) 12%,transparent)}
.dc-chip[data-decision="unsure"]{color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb,var(--dc-caution) 14%,transparent)}
.dc-chip--delta{font-variant-numeric:tabular-nums}

/* ---- banner ---- */
.dc-banner{font-size:12px;padding:6px 10px;border-radius:var(--dsw-radius-sm);
  background:color-mix(in srgb,var(--dc-caution) 12%,transparent);color:var(--dsw-alias-state-warn-label)}

/* ---- 主体 ---- */
.dc-body{position:relative;flex:1 1 auto;min-height:0;display:flex}
.dc-body--rail{padding-right:308px;box-sizing:border-box}
.dc-canvas{position:relative;flex:1 1 auto;min-width:0;border-radius:var(--dsw-radius-md);
  background:var(--dc-recess);border:1px solid var(--dc-line);overflow:hidden}
.dc-scanline{position:absolute;left:0;right:0;top:0;height:2px;overflow:hidden;z-index:5;background:color-mix(in srgb,var(--dc-personal) 12%,transparent)}
.dc-scanline i{display:block;height:100%;width:28%;background:var(--dc-personal);animation:dc-scan 1.5s ease-in-out infinite}
@keyframes dc-scan{0%{transform:translateX(-100%)}100%{transform:translateX(460%)}}
.dc-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--dsw-alias-label-tertiary);font-size:12px}

/* ---- 方块 ---- */
.dc-rect{position:absolute;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:0;
  padding:0;margin:0;border:0;border-radius:5px;overflow:hidden;text-align:left;font:inherit;
  color:var(--dsw-alias-label-primary);background:var(--dc-surface);cursor:pointer;
  transition:box-shadow .12s ease,filter .12s ease}
.dc-rect[data-risk="safe"]{--dc-risk:var(--dc-safe);background:color-mix(in srgb,var(--dc-safe) 8%,var(--dc-surface))}
.dc-rect[data-risk="caution"]{--dc-risk:var(--dc-caution);background:color-mix(in srgb,var(--dc-caution) 10%,var(--dc-surface))}
.dc-rect[data-risk="personal"]{--dc-risk:var(--dc-personal);background:color-mix(in srgb,var(--dc-personal) 7%,var(--dc-surface))}
.dc-rect[data-risk="high"]{--dc-risk:var(--dc-high);background:color-mix(in srgb,var(--dc-high) 8%,var(--dc-surface))}
.dc-rect[data-risk="unknown"]{background:var(--dc-surface)}
.dc-rect[data-stripe="true"]::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--dc-risk,var(--dc-unknown));opacity:.85}
.dc-tile-in{display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:6px 8px;min-width:0;max-width:100%;box-sizing:border-box}
.dc-rect[data-stripe="true"] .dc-tile-in{padding-left:11px}
.dc-tile-name{display:flex;align-items:center;gap:5px;min-width:0;max-width:100%;font-size:12px;font-weight:600;line-height:1.3}
.dc-tile-kind{display:inline-flex;align-items:center;flex:none;color:var(--dsw-alias-label-tertiary);opacity:.9}
.dc-tile-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-tile-meta{font-size:11px;line-height:1.35;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:4px;max-width:100%;overflow:hidden;white-space:nowrap}
.dc-tile-meta--soft{color:var(--dsw-alias-label-tertiary)}
.dc-tile-dot{opacity:.45}
.dc-tile-claim{font-size:11px;line-height:1.45;color:var(--dsw-alias-label-tertiary);margin-top:4px;max-width:36ch;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dc-rect[data-sz="sm"] .dc-tile-in{padding:4px 7px}
.dc-rect[data-sz="sm"] .dc-tile-name{font-size:11px;font-weight:500}
.dc-rect[data-sz="md"] .dc-tile-name{font-size:12px}
.dc-rect[data-sz="lg"] .dc-tile-in{padding:14px 18px;gap:2px}
.dc-rect[data-sz="lg"] .dc-tile-name{font-size:16px;font-weight:600;letter-spacing:-.01em;gap:7px}
.dc-rect[data-sz="lg"] .dc-tile-meta{font-size:12px}
.dc-rect[data-sz="lg"] .dc-tile-claim{font-size:12px;line-height:1.5;max-width:46ch;margin-top:7px;-webkit-line-clamp:3}
.dc-rect:hover{box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l4), var(--dsw-shadow-lv1);z-index:2}
.dc-rect:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dc-personal));outline-offset:-2px;z-index:3}
.dc-rect[data-selected="true"]{outline:2px solid var(--dsw-alias-label-primary);outline-offset:-2px;box-shadow:var(--dsw-shadow-lv2);z-index:4}
.dc-mark{position:absolute;right:5px;top:6px;z-index:1;display:inline-flex;align-items:center;justify-content:center;
  width:15px;height:15px;border-radius:999px;font-size:9px;line-height:1;background:var(--dc-surface);
  color:var(--dsw-alias-label-secondary);box-shadow:0 0 0 1px var(--dsw-alias-border-l3);font-weight:600}
.dc-mark--dot{width:6px;height:6px;right:4px;top:4px;box-shadow:none;background:var(--dsw-alias-label-tertiary)}
.dc-rect[data-decision="keep"] .dc-mark{color:var(--dc-safe);background:color-mix(in srgb,var(--dc-safe) 16%,var(--dc-surface))}
.dc-rect[data-decision="delete"] .dc-mark{color:var(--dc-high);background:color-mix(in srgb,var(--dc-high) 16%,var(--dc-surface))}
.dc-rect[data-decision="unsure"] .dc-mark{color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb,var(--dc-caution) 18%,var(--dc-surface))}
.dc-rect[data-decision="delete"]{background:color-mix(in srgb,var(--dc-high) 5%,var(--dc-surface));box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--dc-high) 45%,transparent)}
.dc-rect[data-decision="keep"]{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--dc-safe) 55%,transparent)}
.dc-rect[data-decision="unsure"]{outline:1.5px dashed color-mix(in srgb,var(--dc-caution) 70%,transparent);outline-offset:-2px}
.dc-rect[data-decision="keep"][data-selected="true"],
.dc-rect[data-decision="delete"][data-selected="true"],
.dc-rect[data-decision="unsure"][data-selected="true"]{outline:2px solid var(--dsw-alias-label-primary);outline-offset:-2px}
.dc-delta{font-size:10px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}

/* ---- 检查器 ---- */
.dc-rail{position:absolute;top:0;right:0;bottom:0;width:296px;display:flex;flex-direction:column;gap:10px;box-sizing:border-box;
  border:1px solid var(--dc-line);border-radius:var(--dsw-radius-md);padding:12px;background:var(--dc-surface);overflow-y:auto;overflow-x:hidden}
.dc-rail-sec{display:flex;flex-direction:column;gap:8px}
.dc-rail-sec--grow{flex:1 1 auto;min-height:0}
.dc-rail-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.dc-rail-title{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dc-rail-count{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dc-bar{height:4px;border-radius:999px;background:var(--dsw-alias-bg-skeleton);overflow:hidden}
.dc-bar i{display:block;height:100%;border-radius:999px;background:var(--dsw-alias-label-primary);transition:width .3s ease}
.dc-stats{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.dc-stat{display:flex;flex-direction:column;gap:0;padding:5px 8px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-module-platform)}
.dc-stat-v{font-size:15px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums}
.dc-stat-k{font-size:10px;line-height:1.4;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-stat[data-tone="delete"][data-nz="true"] .dc-stat-v{color:var(--dc-high)}
.dc-stat[data-tone="keep"][data-nz="true"] .dc-stat-v{color:var(--dsw-alias-state-success-primary)}
.dc-stat[data-tone="unsure"][data-nz="true"] .dc-stat-v{color:var(--dsw-alias-state-warn-label)}
.dc-rail--overview{overflow:hidden}
.dc-queue{display:flex;flex-direction:column;gap:1px;margin:0 -6px;flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.dc-queue-row{display:flex;align-items:center;gap:7px;width:100%;padding:5px 6px;border:0;border-radius:var(--dsw-radius-xs);
  background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer;text-align:left}
.dc-queue-row:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dc-queue-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-queue-size{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dc-dot{flex:none;width:6px;height:6px;border-radius:999px;background:var(--dc-unknown);display:inline-block}
.dc-dot[data-risk="safe"]{background:var(--dc-safe)}
.dc-dot[data-risk="caution"]{background:var(--dc-caution)}
.dc-dot[data-risk="personal"]{background:var(--dc-personal)}
.dc-dot[data-risk="high"]{background:var(--dc-high)}
.dc-rail-note{font-size:11px;color:var(--dsw-alias-label-tertiary);padding:2px 0}
.dc-hints{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:4px 8px;flex:none;padding-top:8px;margin-top:auto;border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.dc-hint{display:inline-flex;align-items:center;gap:4px}
.dc-hint-sep{opacity:.4}
.dc-kbd{font-family:inherit;font-size:10px;line-height:1;padding:3px 5px;border-radius:4px;border:1px solid var(--dc-line);
  border-bottom-width:1.5px;background:var(--dc-recess);color:var(--dsw-alias-label-secondary)}
.dc-detail-head{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary)}
.dc-detail-name{flex:1 1 auto;min-width:0;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-detail-path{font-size:11px;color:var(--dsw-alias-label-tertiary);word-break:break-all;margin-top:-4px}
.dc-chips{display:flex;gap:5px;flex-wrap:wrap}
.dc-claim{font-size:13px;line-height:1.55}
.dc-claim[data-empty="true"]{color:var(--dsw-alias-label-tertiary);font-size:12px}
.dc-basis{font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-tertiary);border-left:2px solid var(--dsw-alias-border-l3);padding-left:8px;display:flex;gap:6px;flex-wrap:wrap}
.dc-basis-k{color:var(--dsw-alias-label-secondary)}
.dc-kv{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;padding:9px 10px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-module-platform)}
.dc-kv>div{display:flex;flex-direction:column;gap:0;min-width:0}
.dc-k{font-size:10.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dc-v{font-size:12px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis}
.dc-v--delta{color:var(--dsw-alias-label-secondary)}
.dc-detail-sec{display:flex;flex-direction:column;gap:6px}
.dc-label{font-size:10.5px;color:var(--dsw-alias-label-tertiary);display:flex;align-items:center;justify-content:space-between;gap:8px}
.dc-note-state{font-size:10px;color:var(--dsw-alias-label-tertiary)}
.dc-seg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px}
.dc-seg button{display:flex;align-items:center;justify-content:center;gap:4px;height:30px;padding:0 2px;
  border:1px solid var(--dc-line);border-radius:var(--dsw-radius-sm);background:var(--dc-surface);color:var(--dsw-alias-label-secondary);
  font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap;transition:background .12s ease,color .12s ease}
.dc-seg button em{font-style:normal;font-size:9px;opacity:.5;margin-left:1px}
.dc-seg button:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dc-seg button[data-on="true"][data-d="keep"]{background:color-mix(in srgb,var(--dc-safe) 16%,transparent);border-color:color-mix(in srgb,var(--dc-safe) 50%,transparent);color:var(--dsw-alias-state-success-primary)}
.dc-seg button[data-on="true"][data-d="delete"]{background:color-mix(in srgb,var(--dc-high) 12%,transparent);border-color:color-mix(in srgb,var(--dc-high) 45%,transparent);color:var(--dc-high)}
.dc-seg button[data-on="true"][data-d="unsure"]{background:color-mix(in srgb,var(--dc-caution) 16%,transparent);border-color:color-mix(in srgb,var(--dc-caution) 50%,transparent);color:var(--dsw-alias-state-warn-label)}
.dc-warn{font-size:11.5px;line-height:1.5;color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb,var(--dc-caution) 10%,transparent);border-radius:var(--dsw-radius-sm);padding:7px 9px}
.dc-detail-sec--note{flex:1 1 auto;min-height:0}
.dc-seg-glyph{font-size:11px;line-height:1}
.dc-note{width:100%;box-sizing:border-box;min-height:72px;flex:1 1 auto;resize:none;border:1px solid var(--dc-line);border-radius:var(--dsw-radius-sm);
  background:var(--dc-surface);color:inherit;font:inherit;font-size:12px;line-height:1.5;padding:7px 9px}
.dc-note::placeholder{color:var(--dsw-alias-label-caption)}
.dc-note:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dc-personal));outline-offset:-2px;border-color:transparent}

/* ---- 计划条 ---- */
.dc-plan{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11.5px;color:var(--dsw-alias-label-tertiary);min-height:28px}
.dc-plan-stats{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dc-plan-item{display:inline-flex;align-items:center;gap:5px;font-variant-numeric:tabular-nums}
.dc-plan-item strong{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dc-plan-item[data-tone="reclaim"]{color:var(--dsw-alias-label-secondary)}
.dc-assure{font-size:10.5px;color:var(--dsw-alias-label-caption);white-space:nowrap}

/* ---- 悬浮卡 ---- */
.dc-hover{position:fixed;z-index:60;width:268px;box-sizing:border-box;padding:10px 12px;border-radius:var(--dsw-radius-md);
  background:var(--dc-surface);border:1px solid var(--dc-line);box-shadow:var(--dsw-shadow-lv3);pointer-events:none;
  display:flex;flex-direction:column;gap:5px}
.dc-hover-head{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary)}
.dc-hover-name{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-hover-path{font-size:10.5px;color:var(--dsw-alias-label-tertiary);word-break:break-all;line-height:1.4}
.dc-hover-row{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary);flex-wrap:wrap}
.dc-hover-size{font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.dc-hover-share{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dc-hover-claim{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
:has([data-disk-canvas-view]) [data-width-handle]{display:none}
`

    function ensureStyle() {
      if (typeof document === 'undefined') return
      const prior = document.querySelector('style[data-dsh-disk-canvas]')
      if (prior) prior.remove()
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
