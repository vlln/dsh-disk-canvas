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
      index: '/plugins/dsh-disk-canvas/index',
      config: '/plugins/dsh-disk-canvas/config',
      proposal: '/plugins/dsh-disk-canvas/proposal',
      undo: '/plugins/dsh-disk-canvas/undo',
      bind: '/plugins/dsh-disk-canvas/bind',
      execute: '/plugins/dsh-disk-canvas/execute',
      executePreview: '/plugins/dsh-disk-canvas/execute/preview',
      ask: '/plugins/dsh-disk-canvas/ask',
      organize: '/plugins/dsh-disk-canvas/organize',
      organizePreview: '/plugins/dsh-disk-canvas/organize/preview',
      organizeExecute: '/plugins/dsh-disk-canvas/organize/execute',
      organizeUndo: '/plugins/dsh-disk-canvas/organize/undo',
      organizeUndoPreview: '/plugins/dsh-disk-canvas/organize/undo/preview',
    }
    const RAIL_KEY = 'dsh-disk-canvas:rail'
    const VIEW_KEY = 'dsh-disk-canvas:view'

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
      hintEsc: '取消选择',
      openDir: '进入目录',
      bytes: '体积',
      files: '文件数',
      modified: '最近改动',
      confidence: '把握',
      decision: '你的决定',
      keep: '保留',
      delete: '待清理',
      note: '备注',
      noteHint: '为什么这样判断（自动保存）',
      noteSaved: '已保存',
      noteSaving: '保存中…',
      plan: '待清理',
      reclaim: '预计释放',
      movedChip: '已移走 {n} 项',
      agentMarked: 'Agent 标了 {n} 项',
      undoAgent: '撤销这一批',
      undoDone: '已撤销 {n} 项',
      markedByAgent: 'Agent 标的',
      agentOnly: '只看 Agent 标的',
      agentOnlyHint: '过滤出 Agent 标注过的项，用来复查',
      objection: 'Agent 不同意',
      moveTo: '移到…',
      movePlaceholder: '目标目录，例如 ~/Archive/2026-10',
      moveConfirm: '确定',
      moveCancel: '取消',
      movePlanned: '待移动 {n} 项',
      executeCleanup: '执行清理',
      cleanupTitle: '清理预览',
      cleanupHint: '标了「待清理」的项会被移到废纸篓（不是删除），逐项检查冲突；之后可以整批撤销。',
      cleanupDone: '已移入废纸篓 {n} 项',
      cleanupDoneFallback: '系统废纸篓没有权限，已移入插件回收目录 {n} 项（可撤销）',
      askAgent: '让 Agent 提方案',
      askAgentHint: '让 Agent 根据已有语义挑一批可以清理的项并标成待清理',
      asked: '已请 Agent 提方案，等它标完',
      organizeTitle: '整理预览',
      organizeHint: '目标已存在、跨盘、或目标是源自己的子目录都会被跳过；移动是逐项的，单项失败不影响其它项。',
      organizeEmpty: '还没有登记任何移动',
      organizeExecute: '执行移动',
      organizeDone: '已移动 {ok} 项，跳过 {bad} 项',
      organizeConflict: '目标已存在',
      organizeInside: '目标是自己的子目录',
      organizeCross: '跨盘',
      organizeGone: '源已不存在',
      organizeSame: '目标就是源',
      organizeBad: '目标不合法',
      organizeNotDir: '目标不是目录',
      organizeFailed: '移动失败',
      organizeBadge: '移动到 {name}',
      movedBatch: '已移动 {n} 项',
      undoMove: '撤销这批',
      undoTitle: '撤销移动',
      undoDone: '已移回 {n} 项',
      askInChat: '在对话里问这一项',
      askPrompt: '解释这一项：{path}（{size}，画布上的语义：{label}）。如果语义缺失或已过期，请重新确认；有依据就写进语义里。',
      askFilled: '已填进对话框，按 Enter 发送',
      askCopied: '已复制，粘贴到对话里即可',
      kept: '保留',
      undecided: '未选择',
      progress: '审查进度',
      queue: '最大的待审',
      trendScans: '近 {n} 次',
      queueEmpty: '全部审完了',
      hiddenTiles: '{n} 项小于 1 像素，画布上点不到——都在上面的清单里',
      previewOn: '预览清理后',
      previewOff: '退出预览',
      previewBanner: '预览模式：画布隐藏了待清理项。磁盘没有任何改动。',
      neverDelete: '不删除任何文件',
      agent: 'Agent 标注',
      share: '占比',
      copyPath: '复制路径',
      copied: '已复制',

      railHide: '收起检查器',
      railShow: '检查器',
      closeDetail: '取消选中',
      colName: '名称',
      claim: '判断',
      viewTree: '树图',
      viewList: '列表',
      viewIndex: '跨层索引',
      indexTitle: '标注索引',
      indexHint: '所有写过语义的目录，按类别分组；嵌套目录只显示最上层。',
      cat_project: '项目', cat_deps: '依赖', cat_build: '构建产物', cat_cache: '缓存',
      cat_installer: '安装包', cat_media: '媒体', cat_doc: '文档', cat_system: '系统', cat_other: '其他',
      ihint_node_modules: '依赖目录，可由 lockfile 重装',
      ihint_caches: '应用缓存，删后重建',
      ihint_build: '构建产物，确认不是源码目录',
      ihint_pycache: 'Python 缓存与虚拟环境',
      ihint_logs: '日志目录',
      ihint_trash: '废纸篓',
      ihint_derived: 'Xcode 派生数据，会重建',
      indexEmpty: '这次扫描没有识别到可清理的目录',
      indexShown: '显示前 {n} 项',
      indexSelectAll: '全选这类',
      indexTotal: '合计',
      searchPlaceholder: '搜路径（如 node_modules / Project）',
      searchClear: '清空搜索',
      searchMatches: '{n} 项匹配',
      noMatch: '没有匹配的目录',
      category: '类别',
      unlabeled: '未标注',
      label: '标签',
      evidence: '依据',
      seenAt: '标注于',
      staleChip: '对象已变化',
      warnStale: '这个对象在标注之后变了：先看依据还成不成立，再决定。',
      facetHint: '高亮这一类，其余的降饱和；再点一次取消',
      labeledNote: '语义：{a} / {n} 项已标注',
      coldStart: '这一层还没有语义：扫完之后 Agent 会自动补，或选中一项点「在对话里问这一项」。',
      coldStartPreset: '当前会话不是「磁盘整理」模式，自动补语义不会触发；切到该模式后扫描一次即可。',
      ageNow: '刚刚',
      ageMin: '{n} 分钟前',
      ageHour: '{n} 小时前',
      ageDay: '{n} 天前',
      cachedTag: '缓存',
      updating: '更新中',
      refreshNow: '重新扫描这一层',
      pickedN: '已选 {n} 项',
      pickedDecided: '{n} 项已有决定',
      clearPick: '清除选择',
      showList: '在列表里逐项看',
      locate: '在画布中定位',
      settings: '设置',
      autoScan: '自动扫描',
      autoScanOff: '关',
      autoScanDaily: '每天',
      autoScanWeekly: '每周',
      autoAnnotate: '扫描后自动补语义',
      autoAnnotateHint: '扫描完成时让 Agent 补一批语义（有冷却，不会反复触发）',
      rules: '记忆规则',
      noRules: '还没有规则。在索引里选中一类，勾「记住这类」再给决定。',
      forget: '撤销这条规则',
      proposal: '审查快照',
      proposalImported: '导入 {d} 条决定、{c} 条判断、{r} 条规则 · 跳过 {s} 条已有决定',
      proposalInvalid: '这个文件不是提案快照',
      resetZoom: '复位',
      pickUndecided: '未审的',
      hintDrag: '拖拽框选',
      noClaim: '这一层还没有 Agent 标注',
    }
    const en = {
      panel: 'Disk Canvas',
      rescan: 'Rescan',
      up: 'Up',
      navBack: 'Back',
      navForward: 'Forward',
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
      hintEsc: 'deselect',
      openDir: 'Open folder',
      bytes: 'Size',
      files: 'Files',
      modified: 'Modified',
      confidence: 'Confidence',
      decision: 'Your decision',
      keep: 'Keep',
      delete: 'To delete',
      note: 'Note',
      noteHint: 'Why you decided this (auto-saved)',
      noteSaved: 'Saved',
      noteSaving: 'Saving…',
      plan: 'To delete',
      reclaim: 'Reclaim',
      movedChip: '{n} moved',
      agentMarked: 'Agent marked {n}',
      undoAgent: 'Undo this batch',
      undoDone: 'Undid {n}',
      markedByAgent: 'marked by agent',
      agentOnly: 'Agent-marked only',
      agentOnlyHint: 'Filter to items the agent marked, for review',
      objection: 'Agent disagrees',
      moveTo: 'Move to…',
      movePlaceholder: 'Target directory, e.g. ~/Archive/2026-10',
      moveConfirm: 'Move',
      moveCancel: 'Cancel',
      movePlanned: '{n} to move',
      executeCleanup: 'Clean up',
      cleanupTitle: 'Cleanup preview',
      cleanupHint: 'Items marked for deletion move to Trash (not deleted), conflicts are checked per item, and the batch can be undone.',
      cleanupDone: 'Moved {n} item(s) to Trash',
      cleanupDoneFallback: 'Trash is not writable; moved {n} item(s) to the plugin recycle bin (undoable)',
      askAgent: 'Ask agent to propose',
      askAgentHint: 'Let the agent pick a batch of cleanup candidates from its own semantics',
      asked: 'Asked the agent to propose — waiting for its marks',
      organizeTitle: 'Move preview',
      organizeHint: 'Existing targets, cross-device moves, or moving a folder into itself are skipped. Moves are per-item; one failure does not stop the rest.',
      organizeEmpty: 'Nothing is queued to move',
      organizeExecute: 'Move now',
      organizeDone: 'Moved {ok}, skipped {bad}',
      organizeConflict: 'Target exists',
      organizeInside: 'Target is inside source',
      organizeCross: 'Cross-device',
      organizeGone: 'Source is gone',
      organizeSame: 'Target is the source',
      organizeBad: 'Bad target',
      organizeNotDir: 'Target is not a directory',
      organizeFailed: 'Move failed',
      organizeBadge: 'to {name}',
      movedBatch: '{n} moved',
      undoMove: 'Undo',
      undoTitle: 'Undo move',
      undoDone: 'Moved back {n}',
      askInChat: 'Ask about this in chat',
      askPrompt: 'Explain this item: {path} ({size}; canvas label: {label}). If the semantics are missing or stale, re-check and write the reasoning back.',
      askFilled: 'Filled into the composer — press Enter to send',
      askCopied: 'Copied — paste it into the chat',
      kept: 'Kept',
      undecided: 'Undecided',
      progress: 'Review progress',
      queue: 'Largest undecided',
      trendScans: 'last {n} scans',
      queueEmpty: 'Everything reviewed',
      hiddenTiles: '{n} items are sub-pixel on the canvas — reach them from the list above',
      previewOn: 'Preview cleanup',
      previewOff: 'Exit preview',
      previewBanner: 'Preview: tiles marked for deletion are hidden. Nothing on disk has changed.',
      neverDelete: 'deletes nothing',
      agent: 'Agent claim',
      share: 'Share',
      copyPath: 'Copy path',
      copied: 'Copied',

      railHide: 'Hide inspector',
      railShow: 'Inspector',
      closeDetail: 'Deselect',
      colName: 'Name',
      claim: 'Claim',
      viewTree: 'Treemap',
      viewList: 'List',
      viewIndex: 'Cross-level index',
      indexTitle: 'Annotated index',
      indexHint: 'Every directory that has semantics, grouped by category; nested ones collapse into the topmost.',
      cat_project: 'Projects', cat_deps: 'Dependencies', cat_build: 'Build output', cat_cache: 'Caches',
      cat_installer: 'Installers', cat_media: 'Media', cat_doc: 'Documents', cat_system: 'System', cat_other: 'Other',
      ihint_node_modules: 'Dependencies, reinstallable from the lockfile',
      ihint_caches: 'App caches, rebuilt on demand',
      ihint_build: 'Build output — make sure it is not source',
      ihint_pycache: 'Python caches and virtualenvs',
      ihint_logs: 'Log directories',
      ihint_trash: 'Trash',
      ihint_derived: 'Xcode derived data, rebuilt on demand',
      indexEmpty: 'This scan found no directories matching a cleanup rule',
      indexShown: 'showing first {n}',
      indexSelectAll: 'Select group',
      indexTotal: 'total',
      searchPlaceholder: 'Search paths',
      searchClear: 'Clear search',
      searchMatches: '{n} matches',
      noMatch: 'No matching folders',
      category: 'Category',
      unlabeled: 'Unlabeled',
      label: 'Label',
      evidence: 'Evidence',
      seenAt: 'Annotated',
      staleChip: 'changed since',
      warnStale: 'This object changed after it was annotated: re-check the evidence before deciding.',
      facetHint: 'Highlight this category and dim the rest; click again to clear',
      labeledNote: 'Semantics: {a} / {n} annotated',
      coldStart: 'No semantics yet: the agent fills them after a scan, or select an item and use “Ask about this in chat”.',
      coldStartPreset: 'This session is not in “disk cleanup” mode, so auto-annotation is off; switch modes and scan once.',
      ageNow: 'just now',
      ageMin: '{n} min ago',
      ageHour: '{n} h ago',
      ageDay: '{n} d ago',
      cachedTag: 'cached',
      updating: 'updating',
      refreshNow: 'Rescan this level',
      pickedN: '{n} selected',
      pickedDecided: '{n} already decided',
      clearPick: 'Clear selection',
      showList: 'List every item',
      locate: 'Locate on canvas',
      settings: 'Settings',
      autoScan: 'Auto-scan',
      autoScanOff: 'Off',
      autoScanDaily: 'Daily',
      autoScanWeekly: 'Weekly',
      autoAnnotate: 'Auto-annotate after scan',
      autoAnnotateHint: 'Let the agent fill semantics when a scan finishes (cooled down, not on every poll)',
      rules: 'Remembered rules',
      noRules: 'No rules yet. Select a group in the index, tick “Remember this group”, then decide.',
      forget: 'Remove this rule',
      proposal: 'Review snapshot',
      proposalImported: 'Imported {d} decisions, {c} claims, {r} rules · skipped {s} existing',
      proposalInvalid: 'That file is not a proposal snapshot',
      resetZoom: 'Reset',
      pickUndecided: 'Unreviewed',
      hintDrag: 'drag to select',
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
    /**
     * 把「问这一项」的提示送进宿主对话的输入框。
     * 不新开界面、不自动发送：填进去，用户自己按 Enter。
     * 填不进去（宿主改版/多编辑器）就退回剪贴板，并把状态告诉调用方。
     */
    async function askInChat(text) {
      const editors = [...document.querySelectorAll('[contenteditable="true"]')]
        .filter((el) => !el.closest('[data-disk-canvas-view]') && el.offsetParent !== null)
      const editor = editors.at(-1)
      if (editor) {
        try {
          editor.focus()
          const range = document.createRange()
          range.selectNodeContents(editor)
          range.collapse(false)
          const sel = window.getSelection()
          sel.removeAllRanges()
          sel.addRange(range)
          document.execCommand('insertText', false, text)
          // 宿主可能重渲染、换掉节点：稍等一下再重新取一次，别拿旧引用判断
          await new Promise((resolve) => setTimeout(resolve, 80))
          const check = [...document.querySelectorAll('[contenteditable="true"]')]
            .filter((el) => !el.closest('[data-disk-canvas-view]') && el.offsetParent !== null)
            .at(-1)
          if ((check?.textContent ?? '').includes(text.slice(0, 24))) return 'filled'
        } catch { /* 落到剪贴板 */ }
      }
      return navigator.clipboard?.writeText(text).then(() => 'copied').catch(() => 'failed')
    }

    /** 数据有多旧：只用于顶部的「缓存 · N 分钟前」提示。 */
    function sinceText(ms, t) {
      if (ms < 60_000) return t('ageNow')
      if (ms < 3_600_000) return t('ageMin').replace('{n}', String(Math.floor(ms / 60_000)))
      if (ms < 86_400_000) return t('ageHour').replace('{n}', String(Math.floor(ms / 3_600_000)))
      return t('ageDay').replace('{n}', String(Math.floor(ms / 86_400_000)))
    }

    /** 类别是封闭词表：存 key，显示时查词典；未知 key 归到「其他」。 */
    function catLabel(t, key) {
      if (!key) return t('unlabeled')
      const text = t(`cat_${key}`)
      return text === `cat_${key}` ? t('cat_other') : text
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
        const sync = () => setSize((prev) => (Math.abs(prev.w - el.clientWidth) < 1 && Math.abs(prev.h - el.clientHeight) < 1
          ? prev
          : { w: el.clientWidth, h: el.clientHeight }))
        sync()
        // ResizeObserver 在某些无头/合成器关闭的环境里不回调，窗口 resize 兜底
        window.addEventListener('resize', sync)
        return () => { ro.disconnect(); window.removeEventListener('resize', sync) }
      }, [ref])
      return size
    }

    /** 可执行的清理脚本：默认演练，只移动到废纸篓里的隔离目录，不做 rm。 */
    const ICONS = {
      folder: 'M2 5.2c0-.7.6-1.2 1.2-1.2h2.6l1.4 1.4h5.6c.7 0 1.2.6 1.2 1.2v4.9c0 .7-.6 1.2-1.2 1.2H3.2c-.7 0-1.2-.6-1.2-1.2z',
      file: 'M4.2 2.4h4.1L12 6.1v7.5H4.2zM8.3 2.4v3.7H12',
      close: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
      up: 'M8 12.6V3.6M4.3 7.3 8 3.6l3.7 3.7',
      navLeft: 'M10.4 3.6 6 8l4.4 4.4M6.4 8h7',
      navRight: 'M5.6 3.6 10 8l-4.4 4.4M9.6 8h-7',
      rescan: 'M12.9 8a4.9 4.9 0 1 1-1.6-3.6M13 4.4v3.1h-3.1',
      rail: 'M2.6 3.4h10.8v9.2H2.6zM9.9 3.4v9.2',
      copy: 'M5.6 5.6h6.9v6.9H5.6zM3.5 10.4V3.5h6.9',
      check: 'M3.6 8.4 6.5 11.3 12.4 4.9',
      chevron: 'M6.2 4.4 9.8 8l-3.6 3.6',
      list: 'M3 4.4h10M3 8h10M3 11.6h10',
      grid: 'M2.9 2.9h4.3v4.3H2.9zM8.8 2.9h4.3v4.3H8.8zM2.9 8.8h4.3v4.3H2.9zM8.8 8.8h4.3v4.3H8.8z',
      check: 'M3.6 8.4 6.5 11.3 12.4 4.9',
      checklist: 'M2.5 4.2l1.3 1.3 2.1-2.1M9.4 4.4h4.1M2.5 9.6l1.3 1.3 2.1-2.1M9.4 9.8h4.1',
      layers: 'M8 2.6 2.6 5.6 8 8.6l5.4-3zM2.6 9.4 8 12.4l5.4-3',
      search2: 'M10.6 10.6 14 14M11.7 7a4.7 4.7 0 1 1-9.4 0 4.7 4.7 0 0 1 9.4 0z',
      trash: 'M3 4.4h10M4.4 4.4v8.3h7.2V4.4M6.4 4.4V3.2h3.2v1.2M6.6 6.8v3.6M9.4 6.8v3.6',
      gear: 'M8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM8 2.6v1.5M8 11.9v1.5M2.6 8h1.5M11.9 8h1.5M4.2 4.2l1.1 1.1M10.7 10.7l1.1 1.1M11.8 4.2l-1.1 1.1M5.3 10.7l-1.1 1.1',
      chat: 'M2.8 3.4h10.4v7.2H7.2L4 13.4v-2.8H2.8z',
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

    function stampShort(ms) {
      if (!ms) return '—'
      try {
        const d = new Date(ms)
        const pad = (n) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
      } catch { return '—' }
    }

    function groupLabel(state, id) {
      const found = (state?.patterns ?? []).find((g) => g.id === id)
      return found?.label ?? id
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

    function HoverCard({ hover, t, total, cardRef }) {
      const e = hover.entry
      const width = 268
      const maxX = (window.innerWidth || 1200) - width - 12
      const maxY = (window.innerHeight || 800) - 150
      return h('div', {
        className: 'dc-hover',
        ref: cardRef,
        style: { left: `${Math.max(8, Math.min(hover.x + 16, maxX))}px`, top: `${Math.max(8, Math.min(hover.y + 16, maxY))}px` },
      },
      h('div', { className: 'dc-hover-head' },
        h(Icon, { name: e.kind === 'dir' ? 'folder' : 'file' }),
        h('span', { className: 'dc-hover-name' }, e.name)),
      h('div', { className: 'dc-hover-path' }, shortPath(e.path, hover.home)),
      h('div', { className: 'dc-hover-row' },
        h('span', { className: 'dc-chip' }, catLabel(t, e.semantic?.category)),
        e.decision ? h('span', { className: 'dc-chip', 'data-decision': e.decision }, t(e.decision)) : null,
        h('span', { className: 'dc-hover-size' }, formatBytes(e.bytes)),
        h('span', { className: 'dc-hover-share' }, share(e.bytes, total)),
        e.deltaBytes ? h('span', { className: 'dc-delta' }, `${e.deltaBytes > 0 ? '▲' : '▼'} ${formatBytes(Math.abs(e.deltaBytes))}`) : null),
      h('div', { className: 'dc-hover-claim' }, e.semantic?.claim ?? e.claim))
    }

    function reasonText(t, reason) {
      const map = {
        conflict: 'organizeConflict', 'inside-source': 'organizeInside', 'cross-device': 'organizeCross',
        gone: 'organizeGone', 'same-path': 'organizeSame', 'bad-target': 'organizeBad',
        'not-a-directory': 'organizeNotDir', 'bad-source': 'organizeBad', failed: 'organizeFailed',
      }
      return t(map[reason] ?? 'organizeFailed')
    }

    function OrganizePreview({ t, rows, home, busy, title, hint, onClose, onExecute }) {
      const okCount = rows.filter((r) => r.ok).length
      return h('div', { className: 'dc-overlay', onClick: onClose },
        h('div', { className: 'dc-sheet', onClick: (ev) => ev.stopPropagation() },
          h('div', { className: 'dc-sheet-head' },
            h('span', { className: 'dc-sheet-title' }, title ?? t('organizeTitle')),
            h('button', { type: 'button', className: 'dc-icon-btn', 'aria-label': t('closeDetail'), onClick: onClose },
              h(Icon, { name: 'close', size: 12 }))),
          h('div', { className: 'dc-sheet-hint' }, t('organizeHint')),
          rows.length === 0
            ? h('div', { className: 'dc-sheet-empty' }, t('organizeEmpty'))
            : h('div', { className: 'dc-sheet-body' }, rows.map((r) => h('div', {
                key: r.from,
                className: 'dc-move-row',
                'data-ok': r.ok ? 'true' : 'false',
              },
              h('span', { className: 'dc-move-from', title: r.from }, shortPath(r.from, home)),
              h('span', { className: 'dc-move-arrow' }, '→'),
              h('span', { className: 'dc-move-to', title: r.ok ? r.dest : undefined },
                r.ok ? shortPath(r.dest, home) : reasonText(t, r.reason))))),
          h('div', { className: 'dc-sheet-foot' },
            h('span', { className: 'dc-sheet-count' }, `${okCount} / ${rows.length}`),
            h('button', { type: 'button', className: 'dc-btn', onClick: onClose }, t('moveCancel')),
            h('button', {
              type: 'button',
              className: 'dc-btn dc-btn--primary',
              disabled: busy || okCount === 0,
              onClick: onExecute,
            }, t('organizeExecute')))))
    }

    function Tile({ r, t, total, k: kArg, selected, anchor, decision, dim, flash, move, dash, onSelect, onOpen, onHover, onLeave }) {
      const k = kArg || 1
      const w = Math.max(0, r.w - 2)
      const hh = Math.max(0, r.h - 2)
      const sw = w * k
      const sh = hh * k
      const sz = sw >= 280 && sh >= 150 ? 'lg' : sw >= 140 && sh >= 58 ? 'md' : (sw >= 46 && sh >= 20 ? 'sm' : 'xs')
      const named = sz !== 'xs'
      const badge = w >= 34 && hh >= 26
      const moveName = move?.op === 'move' ? move.to.split('/').filter(Boolean).pop() : null
      return h('button', {
        type: 'button',
        className: 'dc-rect',
        'data-decision': decision || undefined,
        'data-facet-i': String(r.facetHue ?? -1),
        'data-dim': dim ? 'true' : undefined,
        'data-flash': flash ? 'true' : undefined,
        'data-dash': dash ? 'true' : undefined,
        'data-move': move?.op === 'move' ? 'true' : undefined,
        'data-selected': selected ? 'true' : 'false',
        'data-anchor': anchor ? 'true' : 'false',
        'data-sz': sz,
        'aria-label': `${r.name} ${formatBytes(r.bytes)}`,
        style: { left: `${r.x + 1}px`, top: `${r.y + 1}px`, width: `${w}px`, height: `${hh}px` },
        onClick: (event) => { if (onSelect) onSelect(r.path, event.metaKey || event.shiftKey) },
        onDoubleClick: () => { if (r.kind === 'dir' && onOpen) onOpen(r.path, r) },
        onMouseEnter: (event) => onHover && onHover(r, event),
        onMouseLeave: () => onLeave && onLeave(),
      },
      decision
        ? (badge
            ? h('span', { className: 'dc-mark', 'aria-hidden': 'true' }, decision === 'keep' ? '✓' : decision === 'delete' ? '✕' : '?')
            : h('span', { className: 'dc-mark dc-mark--dot', 'aria-hidden': 'true' }))
        : null,
      moveName && w >= 60 && hh >= 30
        ? h('span', { className: 'dc-move-badge', title: t('organizeBadge').replace('{name}', move.to) }, `→ ${moveName}`)
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
            (sz === 'lg' || sz === 'md') && r.semantic?.label ? h('span', { className: 'dc-tile-claim' }, r.semantic.label) : null)
        : null)
    }

    function ListView({ t, entries, annotations, picked, selected, total, width, onPick, onPickAll, onOpen }) {
      const pickedCount = entries.filter((e) => picked.has(e.path)).length
      const compact = width > 0 && width < 640
      const narrow = width > 0 && width < 460
      const all = entries.length > 0 && pickedCount === entries.length
      return h('div', {
        className: 'dc-list',
        'data-batch': picked.size > 1 ? 'true' : 'false',
        'data-compact': compact ? 'true' : 'false',
        'data-narrow': narrow ? 'true' : 'false',
      },
        h('div', { className: 'dc-list-row dc-list-row--head' },
          h('span', { className: 'dc-list-cell dc-list-cb' },
            h('input', {
              type: 'checkbox',
              checked: all,
              ref: (el) => { if (el) el.indeterminate = pickedCount > 0 && !all },
              'aria-label': t('pickedN').replace('{n}', String(entries.length)),
              onChange: () => (all ? onPickAll([]) : onPickAll(entries.map((e) => e.path))),
            })),
          h('span', { className: 'dc-list-cell dc-list-name' }, t('colName')),
          h('span', { className: 'dc-list-cell dc-list-size' }, t('bytes')),
          h('span', { className: 'dc-list-cell dc-list-share' }, t('share')),
          h('span', { className: 'dc-list-cell dc-list-risk' }, t('category')),
          h('span', { className: 'dc-list-cell dc-list-dec' }, compact ? null : t('decision'))),
        h('div', { className: 'dc-list-body' },
          entries.map((e) => {
            const a = annotations[e.path]
            const on = picked.has(e.path)
            return h('div', {
              key: e.path,
              className: 'dc-list-row',
              'data-selected': on ? 'true' : 'false',
              'data-anchor': selected === e.path ? 'true' : 'false',
              title: e.claim || e.path,
              onClick: (ev) => onPick(e.path, ev.metaKey || ev.shiftKey),
              onDoubleClick: () => { if (e.kind === 'dir') onOpen(e.path, null, e.name) },
            },
            h('label', { className: 'dc-list-cell dc-list-cb', onClick: (ev) => ev.stopPropagation() },
              h('input', { type: 'checkbox', checked: on, 'aria-label': e.name, onChange: () => onPick(e.path, true) })),
            h('span', { className: 'dc-list-cell dc-list-name' },
              h('i', { className: 'dc-dot', 'data-state': e.semantic?.state ?? 'none' }),
              h(Icon, { name: e.kind === 'dir' ? 'folder' : 'file', size: 12 }),
              h('span', { className: 'dc-list-label' }, e.name)),
            h('span', { className: 'dc-list-cell dc-list-size' }, formatBytes(e.bytes)),
            h('span', { className: 'dc-list-cell dc-list-share' }, share(e.bytes, total)),
            h('span', { className: 'dc-list-cell dc-list-risk' }, e.semantic?.category ? catLabel(t, e.semantic.category) : '—'),
            h('span', { className: 'dc-list-cell dc-list-dec' },
              a?.decision
                ? (compact
                    ? h('span', { className: 'dc-list-decmark', 'data-decision': a.decision, title: t(a.decision) },
                        a.decision === 'keep' ? '✓' : a.decision === 'delete' ? '✕' : '?')
                    : h('span', { className: 'dc-chip', 'data-decision': a.decision }, t(a.decision)))
                : h('span', { className: 'dc-list-none' }, '—')))
          })))
    }

    function IndexView({ t, index, annotations, picked, selected, home, onPick, onPickAll, onLocate }) {
      const [open, setOpen] = React.useState(() => new Set())
      const [query, setQuery] = React.useState('')
      if (!index) return h('div', { className: 'dc-empty' }, h('span', { className: 'dc-empty-text' }, t('loading')))
      const q = query.trim().toLowerCase()
      const all = index.groups ?? []
      const groups = q
        ? all.map((g) => {
            const items = g.items.filter((it) => it.path.toLowerCase().includes(q))
            if (!items.length) return null
            return { ...g, items, count: items.length, bytes: items.reduce((n, it) => n + (it.bytes || 0), 0) }
          }).filter(Boolean)
        : all
      if (groups.length === 0) {
        return h('div', { className: 'dc-empty' },
          h('span', { className: 'dc-empty-text' }, t('indexEmpty')),
          h('span', { className: 'dc-empty-sub' }, t('indexHint')))
      }
      const totalBytes = groups.reduce((n, g) => n + g.bytes, 0)
      const count = groups.reduce((n, g) => n + g.count, 0)
      const toggle = (category) => setOpen((prev) => {
        const next = new Set(prev)
        if (next.has(category)) next.delete(category)
        else next.add(category)
        return next
      })
      return h('div', { className: 'dc-index', 'data-batch': picked.size > 1 ? 'true' : 'false' },
        h('div', { className: 'dc-index-head' },
          h('span', { className: 'dc-index-title' }, t('indexTitle')),
          h('span', { className: 'dc-index-meta' },
            q ? t('searchMatches').replace('{n}', String(count)) : `${groups.length} · ${count} ${t('items')} · ${formatBytes(totalBytes)}`),
          h('label', { className: 'dc-index-search' },
            h(Icon, { name: 'search2' }),
            h('input', {
              type: 'search',
              value: query,
              placeholder: t('searchPlaceholder'),
              onChange: (ev) => setQuery(ev.target.value),
            }),
            query ? h('button', { type: 'button', className: 'dc-icon-btn', 'aria-label': t('searchClear'), onClick: () => setQuery('') }, h(Icon, { name: 'close', size: 10 })) : null)),
        h('div', { className: 'dc-index-body' },
          groups.map((g) => {
            const expanded = q ? true : open.has(g.category)
            const allPicked = g.items.length > 0 && g.items.every((it) => picked.has(it.path))
            return h('div', { key: g.category, className: 'dc-index-group' },
              h('div', { className: 'dc-index-grow', 'data-open': expanded ? 'true' : 'false' },
                h('label', { className: 'dc-index-cell dc-index-cb', onClick: (ev) => ev.stopPropagation() },
                  h('input', {
                    type: 'checkbox',
                    checked: allPicked,
                    'aria-label': g.category,
                    onChange: () => onPickAll(allPicked ? [] : g.items.map((it) => it.path)),
                  })),
                h('button', {
                  type: 'button',
                  className: 'dc-index-toggle',
                  onClick: () => toggle(g.category),
                  'aria-expanded': expanded ? 'true' : 'false',
                },
                h('i', { className: 'dc-dot', 'data-state': 'known' }),
                h('span', { className: 'dc-index-label' }, catLabel(t, g.category))),
                h('span', { className: 'dc-index-cell dc-index-count' }, String(g.count)),
                h('span', { className: 'dc-index-cell dc-index-size' }, formatBytes(g.bytes)),
                h('button', {
                  type: 'button',
                  className: 'dc-index-toggle dc-index-chev',
                  onClick: () => toggle(g.category),
                  'aria-label': expanded ? t('indexTotal') : t('indexSelectAll'),
                }, h(Icon, { name: 'chevron' }))),
              expanded
                ? h('div', { className: 'dc-index-rows' },
                    g.items.map((it) => {
                      const on = picked.has(it.path)
                      const a = annotations[it.path]
                      return h('div', {
                        key: it.path,
                        className: 'dc-index-row',
                        'data-selected': on ? 'true' : 'false',
                        'data-anchor': selected === it.path ? 'true' : 'false',
                        onClick: (ev) => onPick(it.path, ev.metaKey || ev.shiftKey),
                        onDoubleClick: () => onLocate && onLocate(it.path),
                        title: it.path,
                      },
                      h('label', { className: 'dc-index-cell dc-index-cb', onClick: (ev) => ev.stopPropagation() },
                        h('input', { type: 'checkbox', checked: on, 'aria-label': it.name, onChange: () => onPick(it.path, true) })),
                      h('span', { className: 'dc-index-cell dc-index-path', title: it.path },
                        h(Icon, { name: 'folder', size: 11 }),
                        h('span', { className: 'dc-index-name' }, shortPath(it.path, home)),
                        it.label ? h('span', { className: 'dc-index-hint-inline' }, it.label) : null),
                      h('span', { className: 'dc-index-cell dc-index-size' }, it.bytes === null ? '—' : formatBytes(it.bytes)),
                      h('span', { className: 'dc-index-cell dc-index-dec' },
                        a?.decision
                          ? h('span', { className: 'dc-list-decmark', 'data-decision': a.decision, title: t(a.decision) },
                              a.decision === 'keep' ? '✓' : '✕')
                          : h('span', { className: 'dc-list-none' }, '—')))
                    }))
                : null)
          })))
    }

    function BatchBar({ t, entries, picked, annotations, onApply, onMove, onClear }) {
      const [moving, setMoving] = React.useState(false)
      const [to, setTo] = React.useState(() => {
        try { return window.localStorage.getItem('dsh-disk-canvas:move-to') ?? '' } catch { return '' }
      })
      const submitMove = () => {
        const target = to.trim()
        if (!target.startsWith('/')) return
        try { window.localStorage.setItem('dsh-disk-canvas:move-to', target) } catch { /* ignore */ }
        setMoving(false)
        onMove?.(target)
      }
      const list = entries.filter((e) => picked.has(e.path))
      const bytes = list.reduce((n, e) => n + (e.bytes || 0), 0)
      const counts = {}
      for (const e of list) {
        const key = catLabel(t, e.semantic?.category)
        counts[key] = (counts[key] ?? 0) + 1
      }
      const categoryLine = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, n]) => `${n} ${name}`)
        .join(' · ')
      const decided = list.filter((e) => annotations[e.path]?.decision).length
      return h('div', { className: 'dc-batch' },
        h('div', { className: 'dc-batch-info' },
          h('strong', null, t('pickedN').replace('{n}', String(list.length))),
          h('span', { className: 'dc-batch-sep' }, '·'),
          h('span', { className: 'dc-batch-bytes' }, formatBytes(bytes)),
          decided ? h('span', { className: 'dc-batch-decided' }, `· ${t('pickedDecided').replace('{n}', String(decided))}`) : null),
        categoryLine ? h('span', { className: 'dc-batch-risk' }, categoryLine) : null,
        moving
          ? h('div', { className: 'dc-batch-move' },
              h('input', {
                className: 'dc-input dc-batch-move-input',
                value: to,
                placeholder: t('movePlaceholder'),
                autoFocus: true,
                onChange: (ev) => setTo(ev.target.value),
                onKeyDown: (ev) => {
                  if (ev.key === 'Enter') submitMove()
                  if (ev.key === 'Escape') setMoving(false)
                },
              }),
              h('button', { type: 'button', className: 'dc-btn', onClick: submitMove, disabled: !to.trim().startsWith('/') }, t('moveConfirm')),
              h('button', { type: 'button', className: 'dc-btn dc-btn--ghost', onClick: () => setMoving(false) }, t('moveCancel')))
          : h('div', { className: 'dc-batch-actions' },
          h('button', { type: 'button', className: 'dc-btn', onClick: () => setMoving(true) }, t('moveTo')),
          h('button', { type: 'button', className: 'dc-btn', onClick: () => onApply('keep') }, t('keep')),
          h('button', { type: 'button', className: 'dc-btn', onClick: () => onApply('delete') }, t('delete')),
          h('button', { type: 'button', className: 'dc-btn dc-btn--ghost', onClick: onClear }, t('clearPick'))))
    }

    function Sparkline({ points }) {
      if (!points || points.length < 2) return null
      const w = 56
      const boxH = 16
      const min = Math.min(...points)
      const max = Math.max(...points)
      const span = max - min || 1
      const step = w / (points.length - 1)
      const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(boxH - ((v - min) / span) * (boxH - 3) - 1.5).toFixed(1)}`).join(' ')
      return h('svg', { className: 'dc-spark', width: w, height: boxH, viewBox: `0 0 ${w} ${boxH}`, 'aria-hidden': 'true' },
        h('path', { d, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round' }))
    }

    function Stat({ value, label, tone }) {
      return h('div', { className: 'dc-stat', 'data-tone': tone, 'data-nz': Number(value) > 0 ? 'true' : 'false' },
        h('span', { className: 'dc-stat-v' }, value),
        h('span', { className: 'dc-stat-k' }, label))
    }

    function Rail({ t, state, view, preset, selectedEntry, annotation, note, noteState, hiddenTiles, onNote, onDecide, onOpen, onClose, onSelect, onShowList, onLocate, onAsk }) {
      const [copied, setCopied] = React.useState(false)
      const copiedTimer = React.useRef(null)
      React.useEffect(() => () => clearTimeout(copiedTimer.current), [])
      const entries = state?.entries ?? []
      const annotations = state?.annotations ?? {}
      const plan = state?.plan
      const total = entries.reduce((n, e) => n + (e.bytes || 0), 0)
      const reviewed = plan ? plan.entries - plan.undecidedCount : 0
      const labeled = entries.filter((x) => x.semantic).length
      const hasAgentMarks = entries.some((x) => x.semantic?.by === 'agent')
      const pctReview = plan && plan.entries ? Math.round((reviewed / plan.entries) * 100) : 0

      if (!selectedEntry && state?.scanning && entries.length === 0) {
        return h('aside', { className: 'dc-rail dc-rail--overview' },
          h('div', { className: 'dc-rail-sec' },
            h('div', { className: 'dc-rail-title' }, t('progress')),
            h('div', { className: 'dc-rail-note' }, `${t('scanning')}…`),
            h('div', { className: 'dc-bar' }, h('i', { style: { width: '35%' } }))))
      }

      if (!selectedEntry) {
        const history = state?.history ?? []
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
              h(Stat, { value: plan?.undecidedCount ?? entries.length, label: t('undecided') })),
            labeled === 0
              ? h('div', { className: 'dc-rail-note dc-cold' }, preset && preset !== 'disk-cleanup' ? t('coldStartPreset') : t('coldStart'))
              : h('div', { className: 'dc-rail-note' }, t('labeledNote').replace('{a}', String(labeled)).replace('{n}', String(entries.length))),
            history.length >= 3
              ? h('div', {
                  className: 'dc-trend',
                  title: history.map((h) => `${stampShort(h.at)} · ${formatBytes(h.totalBytes)}`).join('\n'),
                },
                h(Sparkline, { points: history.map((h) => h.totalBytes) }),
                h('span', null, t('trendScans').replace('{n}', String(history.length))),
                h('b', null, `${history[history.length - 1].totalBytes >= history[0].totalBytes ? '+' : '−'}${formatBytes(Math.abs(history[history.length - 1].totalBytes - history[0].totalBytes))}`))
              : null),
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
                    title: e.semantic?.claim || e.path,
                    onClick: () => onSelect(e.path),
                  },
                  h('i', { className: 'dc-dot', 'data-state': e.semantic?.state ?? 'none' }),
                  h('span', { className: 'dc-queue-name' }, e.name),
                  h('span', { className: 'dc-queue-size' }, formatBytes(e.bytes))))),
            hiddenTiles > 0
              ? h('div', { className: 'dc-rail-note' }, t('hiddenTiles').replace('{n}', String(hiddenTiles)))
              : null,
            view === 'tree'
              ? h('button', { type: 'button', className: 'dc-rail-link', onClick: onShowList }, t('showList'))
              : null),
          h('div', { className: 'dc-rail-sec dc-hints' },
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'Space'), t('hintSpace')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'K D'), t('hintKeys')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, '←↑↓→'), t('hintArrows')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'Enter'), t('hintEnter')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'Esc'), t('hintEsc')),
            view === 'tree' ? h('span', { className: 'dc-hint dc-hint--plain' }, t('hintDrag')) : null))
      }

      const e = selectedEntry
      const sem = e.semantic ?? null
      const warn = annotation?.decision === 'delete' && sem?.state === 'stale' ? t('warnStale') : null
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
          sem?.category ? h('span', { className: 'dc-chip' }, catLabel(t, sem.category)) : h('span', { className: 'dc-chip' }, t('unlabeled')),
          sem?.state === 'stale' ? h('span', { className: 'dc-chip dc-chip--warn' }, t('staleChip')) : null),
        // 这一块是 Agent 写的叙述：用底色和边线跟界面文案分开，不加标签
        h('div', { className: 'dc-agent', 'data-empty': sem?.claim ? undefined : 'true' },
          h('div', { className: 'dc-agent-claim' }, sem?.claim || t('noClaim')),
          sem?.label ? h('div', { className: 'dc-agent-row' }, h('span', { className: 'dc-agent-k' }, t('label')), sem.label) : null,
          sem?.evidence?.length ? h('div', { className: 'dc-agent-row' }, h('span', { className: 'dc-agent-k' }, t('evidence')), sem.evidence.join(' · ')) : null,
          sem?.at ? h('div', { className: 'dc-agent-row' }, h('span', { className: 'dc-agent-k' }, t('seenAt')), stampShort(sem.at)) : null),
        h('div', { className: 'dc-kv' },
          h('div', null, h('span', { className: 'dc-k' }, t('bytes')), h('span', { className: 'dc-v', title: e.partial ? t('partialHint') : undefined }, `${e.partial ? '≥ ' : ''}${formatBytes(e.bytes)}`)),
          h('div', null, h('span', { className: 'dc-k' }, t('share')), h('span', { className: 'dc-v' }, share(e.bytes, total))),
          h('div', null, h('span', { className: 'dc-k' }, t('files')), h('span', { className: 'dc-v' }, formatCount(e.files))),
          h('div', null, h('span', { className: 'dc-k' }, t('modified')), h('span', { className: 'dc-v' }, formatDate(e.latestModified))),
          e.deltaBytes !== null && e.deltaBytes !== undefined
            ? h('div', null, h('span', { className: 'dc-k' }, t('since')), h('span', { className: 'dc-v dc-v--delta' }, `${e.deltaBytes > 0 ? '+' : '−'}${formatBytes(Math.abs(e.deltaBytes))}`))
            : null),
        annotation?.by === 'agent'
          ? h('div', { className: 'dc-markby' }, t('markedByAgent'))
          : null,
        state?.objections?.[e.path]
          ? h('div', { className: 'dc-objection' },
              h('div', { className: 'dc-objection-k' }, t('objection')),
              h('div', null, state.objections[e.path].note))
          : null,
        h('div', { className: 'dc-detail-sec' },
          h('div', { className: 'dc-label' }, t('decision')),
          h('div', { className: 'dc-seg' },
            h('button', { type: 'button', 'data-d': 'keep', 'data-on': annotation?.decision === 'keep' ? 'true' : 'false', onClick: () => onDecide('keep') },
              h(Icon, { name: 'check', size: 12 }), t('keep'), h('em', null, 'K')),
            h('button', { type: 'button', 'data-d': 'delete', 'data-on': annotation?.decision === 'delete' ? 'true' : 'false', onClick: () => onDecide('delete') },
              h('span', { className: 'dc-seg-glyph' }, '✕'), t('delete'), h('em', null, 'D')),
            h('button', { type: 'button', 'data-d': 'none', 'data-on': !annotation?.decision ? 'true' : 'false', onClick: () => onDecide('none') },
              h('span', { className: 'dc-seg-glyph' }, '·'), t('undecided')))),
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
          : null,
        onLocate && e.path !== state?.root && !entries.some((x) => x.path === e.path)
          ? h('button', { type: 'button', className: 'dc-btn dc-btn--wide', onClick: () => onLocate(e.path) },
              h(Icon, { name: 'layers' }), t('locate'))
          : null,
        h('button', {
          type: 'button',
          className: 'dc-btn dc-btn--wide dc-ask',
          onClick: async () => {
            const sem = e.semantic
            const text = t('askPrompt')
              .replace('{path}', e.path)
              .replace('{size}', formatBytes(e.bytes))
              .replace('{label}', sem?.label ?? t('unlabeled'))
            const how = await askInChat(text)
            if (how === 'filled') onAsk?.(t('askFilled'))
            else if (how === 'copied') onAsk?.(t('askCopied'))
          },
        }, h(Icon, { name: 'chat' }), t('askInChat')))
    }

    function Page({ t, sessionId, preset }) {
      const [state, setState] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [selected, setSelected] = React.useState(null)
      const [picked, setPicked] = React.useState(() => new Set())
      const [view, setView] = React.useState(() => {
        try { return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'tree' } catch { return 'tree' }
      })
      const [marquee, setMarquee] = React.useState(null)
      const [index, setIndex] = React.useState(null)
      const [zoomK, setZoomK] = React.useState(1)
      const [activeFacet, setActiveFacet] = React.useState(null)
      const [agentOnly, setAgentOnly] = React.useState(false)
      const [pan, setPan] = React.useState({ x: 0, y: 0 })
      const [zoom, setZoom] = React.useState(null)
      const [preview, setPreview] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [note, setNote] = React.useState('')
      const [toast, setToast] = React.useState('')
      const [moveOpen, setMoveOpen] = React.useState(false)
      const [moveRows, setMoveRows] = React.useState([])
      const [moveMode, setMoveMode] = React.useState('forward')
      const [undoBatch, setUndoBatch] = React.useState(null)
      const [moving, setMoving] = React.useState(false)
      const [flashBatch, setFlashBatch] = React.useState(null)
      const seenBatch = React.useRef(null)
      const [noteState, setNoteState] = React.useState('')
      const flash = (msg) => {
        setToast(msg)
        setTimeout(() => setToast(''), 2000)
      }
      const flashRef = React.useRef(flash)
      flashRef.current = flash
      const [hover, setHover] = React.useState(null)
      const [railOpen, setRailOpen] = React.useState(() => {
        try { return window.localStorage.getItem(RAIL_KEY) !== '0' } catch { return true }
      })
      const hoverTimer = React.useRef(null)
      const hoverCardRef = React.useRef(null)
      const canvasRef = React.useRef(null)
      const size = useElementSize(canvasRef)
      const noteRef = React.useRef({ path: null, saved: '', clean: '', timer: null, seq: 0 })
      const rootRef = React.useRef(null)
      const dragRef = React.useRef(null)
      const selRef = React.useRef(null)
      const locateRef = React.useRef(null)
      const viewRef = React.useRef({ k: 1, x: 0, y: 0 })
      const noClick = React.useRef(0)
      const zoomTimer = React.useRef(null)

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

      // 当前会话跑的是哪个 preset（由 slot 注入）：只有 disk-cleanup 里才有 disk_canvas_* 工具
      // 把当前会话告诉宿主：扫描完成后由它把「该标注了」的消息投递回来
      React.useEffect(() => {
        if (!sessionId) return
        postJson(PATHS.bind, { sessionId, preset: preset ?? null }).catch(() => { /* 绑定失败不影响画布 */ })
      }, [sessionId, preset])

      React.useEffect(() => {
        try { window.localStorage.setItem(RAIL_KEY, railOpen ? '1' : '0') } catch { /* ignore */ }
      }, [railOpen])

      React.useEffect(() => {
        try { window.localStorage.setItem(VIEW_KEY, view) } catch { /* ignore */ }
        setMarquee(null)
        setHover(null)
      }, [view])

      React.useEffect(() => {
        if (view !== 'index') return undefined
        let alive = true
        fetchJson(PATHS.index)
          .then((data) => { if (alive) setIndex(data) })
          .catch((e) => { if (alive) setError(String(e.message ?? e)) })
        return () => { alive = false }
      }, [view, state?.patternsAt])

      // 新的一批 Agent 标注到达时，让被标的方块闪一下——否则画面「静止地变了」
      React.useEffect(() => {
        const id = (state?.agentBatches ?? []).at(-1)?.id ?? null
        if (seenBatch.current === null) { seenBatch.current = id; return undefined }
        if (!id || id === seenBatch.current) return undefined
        seenBatch.current = id
        setFlashBatch(id)
        const timer = setTimeout(() => setFlashBatch(null), 1200)
        return () => clearTimeout(timer)
      }, [state?.agentBatches])

      const railVisible = railOpen || Boolean(selected)
      const annotations = state?.annotations ?? {}
      const entries = state?.entries ?? []
      const hasAgentMarks = entries.some((x) => annotations[x.path]?.by === 'agent')
      const labeledCount = entries.filter((x) => x.semantic).length
      const byPath = React.useMemo(() => {
        const map = new Map()
        for (const e of entries) map.set(e.path, e)
        if (index) {
          for (const group of index.groups ?? []) {
            for (const item of group.items) {
              if (!map.has(item.path)) map.set(item.path, { path: item.path, name: item.name, kind: 'dir', bytes: item.bytes ?? 0 })
            }
          }
        }
        return map
      }, [entries, index])
      const selectedEntry = selected ? byPath.get(selected) ?? null : null
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

      const visible = React.useMemo(() => {
        let list = preview ? entries.filter((e) => annotations[e.path]?.decision !== 'delete') : entries
        if (agentOnly) list = list.filter((e) => annotations[e.path]?.by === 'agent')
        return list
      }, [entries, annotations, preview, agentOnly])
      const rects = React.useMemo(() => layout(visible, size.w, size.h), [visible, size.w, size.h])
      const total = visible.reduce((n, e) => n + (e.bytes || 0), 0)
      const hiddenTiles = visible.length - rects.filter((r) => r.w >= 1 && r.h >= 1).length
      const parent = state ? parentOf(state.root) : null

      // 定位：目标层扫完后把它选中
      React.useEffect(() => {
        const target = locateRef.current
        if (!target) return
        if (entries.some((e) => e.path === target)) {
          locateRef.current = null
          pickOne(target, false)
        }
      }, [entries])

      // 选中项消失（换层/重扫）时清空；索引里的跨层路径也算存在
      React.useEffect(() => {
        if (selected && !byPath.has(selected)) { setSelected(null); setPicked(new Set()) }
      }, [byPath, selected])

      // 选中集合里已经消失的路径剔掉；跨层索引里的路径也算「还在」
      React.useEffect(() => {
        if (picked.size === 0) return
        let stale = false
        for (const path of picked) if (!byPath.has(path)) { stale = true; break }
        if (!stale) return
        setPicked((prev) => new Set([...prev].filter((path) => byPath.has(path))))
      }, [byPath, picked])

      const pickOne = (path, additive) => {
        if (!path) { selRef.current = null; setSelected(null); setPicked(new Set()); return }
        selRef.current = path
        setSelected(path)
        if (!additive) { setPicked(new Set([path])); return }
        setPicked((prev) => {
          const next = new Set(prev)
          if (next.has(path)) next.delete(path)
          else next.add(path)
          return next
        })
      }

      const applyView = (k, x, y) => {
        const w = size.w
        const h = size.h
        const kk = Math.min(6, Math.max(1, k))
        const nx = kk <= 1.0001 ? 0 : Math.min(0, Math.max(w - w * kk, x))
        const ny = kk <= 1.0001 ? 0 : Math.min(0, Math.max(h - h * kk, y))
        viewRef.current = { k: kk, x: nx, y: ny }
        setZoomK(kk)
        setPan({ x: nx, y: ny })
      }
      const resetView = () => applyView(1, 0, 0)
      const toScreen = (r) => {
        const v = viewRef.current
        return { x: r.x * v.k + v.x, y: r.y * v.k + v.y, w: r.w * v.k, h: r.h * v.k }
      }

      // 滚轮缩放：以指针为锚点（html 层监听，必须非 passive 才能 preventDefault）
      React.useEffect(() => {
        const el = canvasRef.current
        if (!el) return undefined
        const onWheel = (event) => {
          if (view !== 'tree') return
          if (!size.w || !size.h) return
          event.preventDefault()
          const rect = el.getBoundingClientRect()
          const cx = event.clientX - rect.left
          const cy = event.clientY - rect.top
          const cur = viewRef.current
          const factor = Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0018))
          const k = Math.min(6, Math.max(1, cur.k * factor))
          if (Math.abs(k - cur.k) < 0.0005) return
          const x = cx - (cx - cur.x) * (k / cur.k)
          const y = cy - (cy - cur.y) * (k / cur.k)
          applyView(k, x, y)
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
      }, [size.w, size.h, view])

      // 视口尺寸变化时把平移拉回合法范围
      React.useEffect(() => {
        const v = viewRef.current
        if (v.k > 1) applyView(v.k, v.x, v.y)
      }, [size.w, size.h])

      const locateTarget = (path) => {
        const parent = parentOf(path)
        if (!parent) return
        if (state?.root === parent) { pickOne(path, false); return }
        locateRef.current = path
        setView('tree')
        runScan(parent)
      }

      const pickMany = (paths) => {
        const next = new Set(paths)
        selRef.current = paths.length ? paths[paths.length - 1] : null
        setPicked(next)
        setSelected(selRef.current)
      }

      const applyState = (s) => setState(s)

      const playZoom = (from, name) => {
        if (!from || !size.w || !size.h) return
        clearTimeout(zoomTimer.current)
        setZoom({ from, name, grow: false, fade: false, at: Date.now() })
        requestAnimationFrame(() => {
          setZoom((z) => (z && z.grow === false ? { ...z, grow: true } : z))
        })
        zoomTimer.current = setTimeout(() => setZoom((z) => (z ? { ...z, fade: true } : z)), 360)
        zoomTimer.current = setTimeout(() => setZoom(null), 560)
      }

      // 文件管理器式的返回/前进：只记「用户主动去过的根」
      const navRef = React.useRef({ stack: [], index: -1 })
      const [, navTick] = React.useReducer((x) => x + 1, 0)
      const navPush = (path) => {
        const { stack, index } = navRef.current
        if (index >= 0 && stack[index] === path) return
        const next = stack.slice(0, index + 1)
        next.push(path)
        navRef.current = { stack: next.slice(-50), index: Math.min(next.length, 50) - 1 }
        navTick()
      }

      const runScan = async (path, from, name, reason = 'navigate', opts = {}) => {
        if (path && from) playZoom(from, name)
        resetView()
        setBusy(true)
        try {
          const s = await postJson(PATHS.scan, path ? { path, reason } : { reason })
          applyState(s)
          if (reason === 'navigate' && !opts.fromHistory) navPush(path ?? s.root)
          setError(null)
          if (path) { setSelected(null); setPicked(new Set()) }
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

      const decide = async (decision) => {
        if (picked.size > 1) {
          const paths = [...picked]
          save({ paths, decision })
          setPicked(new Set(selected ? [selected] : []))
          return
        }
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

      const movePicked = async (to) => {
        try {
          const res = await postJson(PATHS.organize, { paths: [...picked], to })
          applyState(res.state)
          setPicked(new Set(selected ? [selected] : []))
          flash(t('movePlanned').replace('{n}', String(res.count)))
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const openCleanup = async () => {
        try {
          const data = await fetchJson(PATHS.executePreview)
          setMoveRows(data.rows ?? [])
          setMoveMode('delete')
          setUndoBatch(null)
          setMoveOpen(true)
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const askAgent = async () => {
        try {
          await postJson(PATHS.ask, {})
          flash(t('asked'))
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const openOrganize = async () => {
        try {
          const data = await fetchJson(PATHS.organizePreview)
          setMoveRows(data.rows ?? [])
          setMoveMode('forward')
          setUndoBatch(null)
          setMoveOpen(true)
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const openUndo = async (batch) => {
        try {
          const data = await fetchJson(`${PATHS.organizeUndoPreview}?batch=${encodeURIComponent(batch)}`)
          setMoveRows(data.rows ?? [])
          setMoveMode('undo')
          setUndoBatch(batch)
          setMoveOpen(true)
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const runMoves = async () => {
        setMoving(true)
        try {
          const res = moveMode === 'undo'
            ? await postJson(PATHS.organizeUndo, { batch: undoBatch })
            : moveMode === 'delete'
              ? await postJson(PATHS.execute, {})
              : await postJson(PATHS.organizeExecute, {})
          applyState(res.state)
          setMoveOpen(false)
          const ok = res.results.filter((r) => r.ok).length
          const bad = res.results.length - ok
          flash(moveMode === 'undo'
            ? t('undoDone').replace('{n}', String(ok))
            : moveMode === 'delete'
              ? (res.fallback ? t('cleanupDoneFallback') : t('cleanupDone')).replace('{n}', String(ok))
              : t('organizeDone').replace('{ok}', String(ok)).replace('{bad}', String(bad)))
        } catch (e) {
          setError(String(e.message ?? e))
        } finally {
          setMoving(false)
        }
      }

      const undoAgent = async (batch) => {
        try {
          const res = await postJson(PATHS.undo, { batch })
          applyState(res.state)
          setError(null)
          flash(t('undoDone').replace('{n}', String(res.removed)))
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const exportProposal = async () => {
        try {
          const data = await fetchJson(PATHS.proposal)
          download('disk-canvas-proposal.json', JSON.stringify(data, null, 2), 'application/json')
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const importProposal = (file) => {
        if (!file) return
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            const parsed = JSON.parse(String(reader.result))
            if (parsed?.kind !== 'proposal' && !parsed?.annotations) throw new Error(t('proposalInvalid'))
            const res = await postJson(PATHS.proposal, parsed)
            applyState(res.state)
            setError(null)
            flashRef.current(t('proposalImported')
              .replace('{d}', String(res.decisions)).replace('{c}', String(res.claims))
              .replace('{r}', String(res.rules)).replace('{s}', String(res.skipped)))
          } catch (e) {
            setError(String(e.message ?? e))
          }
        }
        reader.readAsText(file)
      }

      const cycle = (current) => (current === undefined ? 'delete' : current === 'delete' ? 'keep' : 'none')

      const moveInList = (delta) => {
        const i = visible.findIndex((e) => e.path === selRef.current)
        const next = visible[Math.min(visible.length - 1, Math.max(0, (i < 0 ? (delta > 0 ? -1 : visible.length) : i) + delta))]
        if (next) pickOne(next.path, false)
      }

      const move = (dir) => {
        const cur = rects.find((r) => r.path === selRef.current)
        if (!cur) {
          if (rects.length) pickOne(rects[0].path, false)
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
        if (best) pickOne(best.path, false)
      }

      const onKeyDown = (event) => {
        const tag = event.target?.tagName
        if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return
        const inRail = event.target?.closest?.('.dc-rail')
        const onControl = inRail && (tag === 'BUTTON' || tag === 'A')
        const key = event.key
        if (key === 'Escape') {
          event.preventDefault()
          // Esc 只做「取消」：先取消拖拽中的框选，再清空选择；不拿它做「返回上层」
          if (dragRef.current) { dragRef.current = null; setMarquee(null) }
          if (selected || picked.size) { setSelected(null); setPicked(new Set()) }
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
            if (view === 'list') moveInList(key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1)
            else if (rects.length) pickOne(rects[0].path, false)
          }
          return
        }
        if (key === 'k' || key === 'K') decide('keep')
        else if (key === 'd' || key === 'D') decide('delete')
        else if (key === 'Backspace') { event.preventDefault(); decide('none') }
        else if (key === '0') { event.preventDefault(); resetView() }
        else if (key === 'ArrowLeft') { event.preventDefault(); if (view === 'tree') move('left') }
        else if (key === 'ArrowRight') { event.preventDefault(); if (view === 'tree') move('right') }
        else if (key === 'ArrowUp') { event.preventDefault(); if (view === 'list') moveInList(-1); else move('up') }
        else if (key === 'ArrowDown') { event.preventDefault(); if (view === 'list') moveInList(1); else move('down') }
        else if (key === 'Enter' && selectedEntry?.kind === 'dir') { event.preventDefault(); runScan(selectedEntry.path) }
      }

      const showHover = (entry, event) => {
        if (Date.now() - noClick.current < 400) return
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

      const boxOf = (d) => ({
        x: Math.min(d.x0, d.x),
        y: Math.min(d.y0, d.y),
        w: Math.abs(d.x - d.x0),
        h: Math.abs(d.y - d.y0),
      })
      const hitsIn = (box) => rects
        .filter((r) => {
          const ix = Math.min(r.x + r.w, box.x + box.w) - Math.max(r.x, box.x)
          const iy = Math.min(r.y + r.h, box.y + box.h) - Math.max(r.y, box.y)
          return ix > 1 && iy > 1
        })
        .map((r) => r.path)

      const onPointerDown = (event) => {
        if (event.button !== 0 && event.button !== 1) return
        const el = canvasRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const local = { x: event.clientX - rect.left, y: event.clientY - rect.top }
        dragRef.current = {
          x0: local.x, y0: local.y, x: local.x, y: local.y,
          moved: false, additive: event.metaKey || event.shiftKey,
          rect, background: event.target === el, pointerId: event.pointerId,
          panMode: event.altKey || event.button === 1,
          panStart: { ...viewRef.current },
        }
        if (event.altKey || event.button === 1) event.preventDefault()
      }
      const onPointerMove = (event) => {
        const d = dragRef.current
        if (!d) return
        d.x = event.clientX - d.rect.left
        d.y = event.clientY - d.rect.top
        if (!d.moved && Math.hypot(d.x - d.x0, d.y - d.y0) < 5) return
        if (d.panMode) {
          if (!d.moved) {
            d.moved = true
            hideHover()
            try { canvasRef.current?.setPointerCapture(d.pointerId) } catch { /* ignore */ }
          }
          applyView(d.panStart.k, d.panStart.x + (d.x - d.x0), d.panStart.y + (d.y - d.y0))
          return
        }
        if (!d.moved) {
          d.moved = true
          hideHover()
          // 只有真的开始拖了才捕获指针，避免影响单击/双击的命中目标
          try { canvasRef.current?.setPointerCapture(d.pointerId) } catch { /* ignore */ }
        }
        setMarquee(boxOf(d))
      }
      const onPointerUp = (event) => {
        const d = dragRef.current
        dragRef.current = null
        if (!d) return
        try { canvasRef.current?.releasePointerCapture(event.pointerId) } catch { /* ignore */ }
        if (d.panMode) { noClick.current = Date.now(); return }
        if (!d.moved) {
          if (d.background) { setSelected(null); setPicked(new Set()) }
          return
        }
        const box = boxOf(d)
        const v = viewRef.current
        const hits = hitsIn({ x: (box.x - v.x) / v.k, y: (box.y - v.y) / v.k, w: box.w / v.k, h: box.h / v.k })
        setMarquee(null)
        noClick.current = Date.now()
        if (hits.length === 0) {
          if (!d.additive) { setSelected(null); setPicked(new Set()) }
          return
        }
        if (d.additive) {
          setPicked((prev) => new Set([...prev, ...hits]))
          setSelected(hits[hits.length - 1])
        } else {
          pickMany(hits)
        }
      }

      const plan = state?.plan
      const lastBatchId = (state?.agentBatches ?? []).at(-1)?.id ?? null
      const dataAge = state?.scannedAt ? Date.now() - state.scannedAt : 0
      const showAge = Boolean(state?.scannedAt) && !state?.scanning && (state.fromCache || dataAge > 60_000)
      const moved = state?.executions?.at(-1) ?? null
      const lastBatch = (state?.agentBatches ?? []).at(-1) ?? null
      const lastMoveBatch = (state?.moveBatches ?? []).at(-1) ?? null
      const movedHint = moved
        ? `${stampShort(moved.at)} · ${moved.count} ${t('items')} · ${formatBytes(moved.bytes)}`
        : undefined
      const risky = state?.partial && !state?.scanning
      const delta = state?.delta
      const deltaChip = delta?.previousAt && delta.totalDelta
        ? `${delta.totalDelta > 0 ? '+' : '−'}${formatBytes(Math.abs(delta.totalDelta))} ${t('since')}`
        : null
      // facet = 本层 Agent 给出的类别；点一个就高亮那一类、其余降饱和。
      // 颜色不是「结论」，是「我现在想看清哪一类」。
      const facets = []
      {
        const map = new Map()
        for (const e of entries) {
          const key = e.semantic?.category
          if (!key) continue
          if (!map.has(key)) map.set(key, { name: key, count: 0, bytes: 0, hue: e.facetHue ?? -1 })
          const f = map.get(key)
          f.count += 1
          f.bytes += e.bytes || 0
        }
        for (const f of map.values()) facets.push(f)
        facets.sort((a, b) => b.bytes - a.bytes)
      }
      const facet = activeFacet && facets.some((f) => f.name === activeFacet) ? activeFacet : null

      return h('div', { className: 'dc-root', 'data-disk-canvas-view': '', tabIndex: 0, onKeyDown, ref: rootRef },
        h('div', { className: 'dc-top' },
          h('div', { className: 'dc-top-main' },
            h('div', { className: 'dc-nav' },
              h('button', {
                type: 'button',
                className: 'dc-icon-btn',
                title: t('navBack'),
                'aria-label': t('navBack'),
                disabled: navRef.current.index <= 0,
                onClick: () => {
                  const { stack, index } = navRef.current
                  if (index <= 0) return
                  navRef.current = { stack, index: index - 1 }
                  navTick()
                  runScan(stack[index - 1], undefined, undefined, 'navigate', { fromHistory: true })
                },
              }, h(Icon, { name: 'navLeft' })),
              h('button', {
                type: 'button',
                className: 'dc-icon-btn',
                title: t('navForward'),
                'aria-label': t('navForward'),
                disabled: navRef.current.index >= navRef.current.stack.length - 1,
                onClick: () => {
                  const { stack, index } = navRef.current
                  if (index >= stack.length - 1) return
                  navRef.current = { stack, index: index + 1 }
                  navTick()
                  runScan(stack[index + 1], undefined, undefined, 'navigate', { fromHistory: true })
                },
              }, h(Icon, { name: 'navRight' })),
              h('button', {
                type: 'button',
                className: 'dc-icon-btn',
                title: t('up'),
                'aria-label': t('up'),
                disabled: !parent,
                onClick: () => parent && runScan(parent),
              }, h(Icon, { name: 'up' }))),
            state
              ? h(Breadcrumb, { root: state.root, home: state.home, onJump: (path) => runScan(path) })
              : h('span', { className: 'dc-crumbs' }, t('loading')),
            state ? h('span', { className: 'dc-vsep' }) : null,
            state
              ? h('span', { className: 'dc-meta' },
                  h('strong', null, formatBytes(total)),
                  ` · ${visible.length} ${visible.length === 1 ? t('item') : t('items')}`)
              : null,
            showAge
              ? h('button', {
                  type: 'button',
                  className: 'dc-chip dc-chip--age',
                  title: t('refreshNow'),
                  onClick: () => runScan(state?.root ?? undefined, undefined, undefined, 'refresh'),
                }, state.revalidating
                  ? t('updating')
                  : `${state.fromCache ? t('cachedTag') + ' · ' : ''}${sinceText(dataAge, t)}`)
              : null,
            deltaChip ? h('span', { className: 'dc-chip dc-chip--delta', 'data-tone': delta.totalDelta > 0 ? 'up' : 'down' }, deltaChip) : null,
            state?.scanning ? h('span', { className: 'dc-chip' }, `${t('scanning')} · ${formatCount(entries.length)}`) : null,
            risky ? h('span', { className: 'dc-chip', 'data-tone': 'warn', title: t('partialHint') }, t('partial')) : null),
          h('div', { className: 'dc-top-side' },
            hasAgentMarks
              ? h('button', {
                  type: 'button',
                  className: 'dc-facet',
                  'data-on': agentOnly ? 'true' : 'false',
                  title: t('agentOnlyHint'),
                  onClick: () => setAgentOnly((v) => !v),
                }, t('agentOnly'))
              : null,
            facets.length
              ? h('div', { className: 'dc-legend' },
                  facets.slice(0, 6).map((f) => h('button', {
                    key: f.name,
                    type: 'button',
                    className: 'dc-facet',
                    'data-on': facet === f.name ? 'true' : 'false',
                    'data-facet-i': String(f.hue),
                    title: t('facetHint'),
                    onClick: () => setActiveFacet(facet === f.name ? null : f.name),
                  },
                  h('span', { className: 'dc-facet-swatch' }),
                  h('span', { className: 'dc-facet-name' }, catLabel(t, f.name)),
                  h('b', null, f.count))))
              : null,
            h('div', { className: 'dc-actions' },
              h('button', {
                type: 'button',
                className: `dc-btn dc-btn--ghost${railVisible ? ' dc-btn--on' : ''}`,
                onClick: () => {
                  if (railVisible) { setRailOpen(false); setSelected(null) } else setRailOpen(true)
                },
                title: railVisible ? t('railHide') : t('railShow'),
                'aria-pressed': railVisible ? 'true' : 'false',
              }, h(Icon, { name: 'rail' })),
              h('div', { className: 'dc-views' },
                [['tree', 'grid', 'viewTree'], ['list', 'list', 'viewList'], ['index', 'layers', 'viewIndex']]
                  .map(([mode, icon, label]) => h('button', {
                    key: mode,
                    type: 'button',
                    className: 'dc-view-btn',
                    'data-on': view === mode ? 'true' : 'false',
                    title: t(label),
                    'aria-pressed': view === mode ? 'true' : 'false',
                    onClick: () => setView(mode),
                  }, h(Icon, { name: icon })))),
              h('button', {
                type: 'button',
                className: 'dc-btn dc-btn--primary',
                onClick: () => runScan(state?.root ?? undefined, undefined, undefined, 'refresh'),
                disabled: busy || state?.scanning,
              }, h(Icon, { name: 'rescan' }), (busy || state?.scanning) ? t('scanning') : t('rescan'))))),

        error ? h('div', { className: 'dc-banner' }, error) : null,
        toast ? h('div', { className: 'dc-toast', role: 'status' }, toast) : null,
        preview ? h('div', { className: 'dc-banner dc-banner--preview' }, t('previewBanner')) : null,

        h('div', {
          className: `dc-body${railVisible ? ' dc-body--rail' : ''}`,
          'data-rail': selectedEntry ? 'open' : 'none',
        },
          h('div', {
            className: `dc-canvas${view === 'tree' ? '' : ' dc-canvas--list'}`,
            ref: canvasRef,
            onPointerDown: view === 'tree' ? onPointerDown : undefined,
            onPointerMove: view === 'tree' ? onPointerMove : undefined,
            onPointerUp: view === 'tree' ? onPointerUp : undefined,
            onPointerCancel: view === 'tree' ? onPointerUp : undefined,
            onMouseMove: (event) => {
              const card = hoverCardRef.current
              if (!hover || !card) return
              const x = Math.max(8, Math.min(event.clientX + 16, (window.innerWidth || 1200) - 284))
              const y = Math.max(8, Math.min(event.clientY + 18, (window.innerHeight || 800) - 160))
              card.style.left = `${x}px`
              card.style.top = `${y}px`
            },
            onClickCapture: (event) => { if (Date.now() - noClick.current < 250) { event.stopPropagation(); event.preventDefault() } },
            onDoubleClickCapture: (event) => { if (Date.now() - noClick.current < 250) { event.stopPropagation(); event.preventDefault() } },
          },
            state?.scanning ? h('div', { className: 'dc-scanline' }, h('i', null)) : null,
            view === 'index'
              ? h(IndexView, {
                  t,
                  index,
                  annotations,
                  picked,
                  selected,
                  home: state?.home,
                  onPick: pickOne,
                  onPickAll: pickMany,
                  onLocate: locateTarget,
                })
              : view === 'list'
              ? h(ListView, {
                  t,
                  entries: visible,
                  annotations,
                  picked,
                  selected,
                  total,
                  width: size.w,
                  onPick: pickOne,
                  onPickAll: pickMany,
                  onOpen: (path, from, name) => runScan(path, from, name),
                })
              : !state
                ? h('div', { className: 'dc-empty' }, h('span', { className: 'dc-empty-text' }, t('loading')))
                : rects.length === 0
                  ? h('div', { className: 'dc-empty' },
                      h('span', { className: 'dc-empty-text' }, state.scanning ? `${t('scanning')}…` : (state.entries.length ? t('empty') : t('emptyScan'))),
                      state.entries.length === 0 && !state.scanning
                        ? h('button', { type: 'button', className: 'dc-btn dc-btn--primary', onClick: () => runScan(undefined, undefined, undefined, 'refresh'), disabled: busy }, t('startScan'))
                        : null)
                  : h('div', {
                      className: 'dc-viewport',
                      style: {
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomK})`,
                        '--dc-k': zoomK,
                      },
                    },
                    rects.map((r) => h(Tile, {
                      key: r.path,
                      r,
                      t,
                      total,
                      k: zoomK,
                      selected: picked.has(r.path),
                      anchor: selected === r.path,
                      decision: annotations[r.path]?.decision,
                      dim: Boolean(facet && r.semantic?.category !== facet),
                      flash: Boolean(flashBatch && annotations[r.path]?.batch === flashBatch),
                      move: state?.operations?.[r.path],
                      dash: Boolean(!r.semantic && labeledCount > 0),
                      onSelect: pickOne,
                      onOpen: (path) => runScan(path, toScreen(r), r.name),
                      onHover: showHover,
                      onLeave: hideHover,
                    }))),
            zoomK > 1.01
              ? h('button', {
                  type: 'button',
                  className: 'dc-zoomchip',
                  onClick: resetView,
                  title: t('resetZoom'),
                }, `${Math.round(zoomK * 100)}%`, h('span', null, t('resetZoom')))
              : null,
            marquee ? h('div', {
              className: 'dc-marquee',
              style: { left: `${marquee.x}px`, top: `${marquee.y}px`, width: `${marquee.w}px`, height: `${marquee.h}px` },
            }) : null,
            zoom ? h('div', {
              key: zoom.at,
              className: 'dc-zoom',
              'data-grow': zoom.grow ? 'true' : 'false',
              'data-fade': zoom.fade ? 'true' : 'false',
              style: zoom.grow
                ? { left: 0, top: 0, width: `${size.w}px`, height: `${size.h}px` }
                : { left: `${zoom.from.x}px`, top: `${zoom.from.y}px`, width: `${zoom.from.w}px`, height: `${zoom.from.h}px` },
            }, zoom.grow && zoom.name ? h('span', { className: 'dc-zoom-name' }, zoom.name) : null) : null,
            picked.size > 1 ? h(BatchBar, {
              t,
              entries: [...byPath.values()],
              picked,
              annotations,
              onApply: decide,
              onMove: movePicked,
              onClear: () => { setPicked(new Set(selected ? [selected] : [])) },
            }) : null),
          railVisible
            ? h(Rail, {
                t,
                preset,
                state,
                selectedEntry,
                annotation,
                note,
                noteState,
                view,
                hiddenTiles: view === 'list' ? 0 : hiddenTiles,
                onShowList: () => setView('list'),
                onAsk: (msg) => flash(msg),
                onLocate: locateTarget,
                onNote: changeNote,
                onDecide: decide,
                onOpen: (path) => {
                  const r = rects.find((x) => x.path === path)
                  runScan(path, r, r?.name)
                },
                onClose: () => { setSelected(null); setPicked(new Set()) },
                onSelect: (path) => pickOne(path, false),
              })
            : null),

        h('div', { className: 'dc-plan' },
          h('div', { className: 'dc-plan-stats' },
            h('span', { className: 'dc-plan-item dc-plan-item--delete' },
              h('i', { className: 'dc-dot', 'data-decision': 'delete' }),
              `${t('plan')} ${plan?.deleteCount ?? 0}`),
            h('span', { className: 'dc-plan-item', 'data-tone': 'reclaim' },
              t('reclaim'), h('strong', null, formatBytes(plan?.reclaimBytes ?? 0))),
            plan?.moveCount
              ? h('span', { className: 'dc-plan-item' }, t('movePlanned').replace('{n}', String(plan.moveCount)),
                  h('strong', null, formatBytes(plan.moveBytes ?? 0)))
              : null,
            h('span', { className: 'dc-plan-item' }, `${t('kept')} ${plan?.keepCount ?? 0}`),
            h('span', { className: 'dc-plan-item' }, `${t('undecided')} ${plan?.undecidedCount ?? 0}`)),
          h('div', { className: 'dc-spacer' }),
          lastBatch
            ? h('button', {
                type: 'button',
                className: 'dc-btn dc-btn--ghost dc-plan-agent',
                title: t('undoAgent'),
                onClick: () => undoAgent(lastBatch.id),
              }, `${t('agentMarked').replace('{n}', String(lastBatch.count))} · ${t('undoAgent')}`)
            : null,
          moved
            ? h('span', { className: 'dc-plan-item dc-plan-moved', title: movedHint },
                `${t('movedChip').replace('{n}', String(moved.count))} · ${formatBytes(moved.bytes)}`)
            : null,
          h('span', { className: 'dc-assure' }, t('neverDelete')),
          plan?.deleteCount
            ? h('button', { type: 'button', className: 'dc-btn dc-btn--primary', onClick: openCleanup }, t('executeCleanup'))
            : null,
          h('button', { type: 'button', className: 'dc-btn dc-btn--ghost', title: t('askAgentHint'), onClick: askAgent }, t('askAgent')),
          plan?.moveCount
            ? h('button', { type: 'button', className: 'dc-btn', onClick: openOrganize }, t('organizeTitle'))
            : null,
          lastMoveBatch
            ? h('button', {
                type: 'button',
                className: 'dc-btn dc-btn--ghost dc-plan-agent',
                title: t('undoTitle'),
                onClick: () => openUndo(lastMoveBatch.id),
              }, `${t('movedBatch').replace('{n}', String(lastMoveBatch.count))} · ${t('undoMove')}`)
            : null,
          h('button', { type: 'button', className: 'dc-btn', onClick: () => setPreview((p) => !p) }, preview ? t('previewOff') : t('previewOn')),
          ),

        moveOpen ? h(OrganizePreview, {
          t,
          rows: moveRows,
          home: state?.home,
          busy: moving,
          title: moveMode === 'undo' ? t('undoTitle') : moveMode === 'delete' ? t('cleanupTitle') : t('organizeTitle'),
          hint: moveMode === 'delete' ? t('cleanupHint') : t('organizeHint'),
          onClose: () => setMoveOpen(false),
          onExecute: runMoves,
        }) : null,
        hover ? h(HoverCard, { hover, t, total, cardRef: hoverCardRef }) : null)
    }

    // ---------- 样式（只用 token） ----------
    const CSS = `
.dc-root{
  /* ---- 设计 token：颜色/形状/时长只在这一层定义，组件只引用 ---- */
  --dc-surface:var(--dsw-alias-bg-base);
  --dc-recess:var(--dsw-alias-bg-module-platform);
  --dc-line:var(--dsw-alias-border-l2);
  --dc-edge:var(--dsw-alias-border-l3);
  --dc-ink-1:var(--dsw-alias-label-primary);
  --dc-ink-2:var(--dsw-alias-label-secondary);
  --dc-ink-3:var(--dsw-alias-label-tertiary);
  --dc-mark-keep:var(--dsw-alias-state-success-primary);
  --dc-mark-delete:var(--dsw-alias-state-error-primary);
  --dc-mark-unsure:var(--dsw-alias-state-warn-primary);
  /* 类别色板：只有 8 个原色，色号由账本按「第一次出现」分配，跨会话稳定 */
  --dc-hue-0:#3b6fd4;--dc-hue-1:#2f8f8f;--dc-hue-2:#3f8f52;--dc-hue-3:#7d8a2e;
  --dc-hue-4:#b0791f;--dc-hue-5:#c46339;--dc-hue-6:#b8486f;--dc-hue-7:#7a55b5;
  --dc-hue-none:var(--dc-ink-3);
  /* 强度：整体调淡/调浓只改这三个数 */
  --dc-facet-fill:18%;
  --dc-facet-edge:72%;
  --dc-facet-dim:24%;
  /* 形状 */
  --dc-r-tile:5px;--dc-r-chip:999px;
  --dc-t-fast:.12s;--dc-t-base:.2s;
  container-type:inline-size;
  position:relative;display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;padding:12px 16px 10px;gap:10px;
  color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:13px;line-height:1.5}
.dc-root:focus{outline:none}
.dc-spacer{flex:1 1 auto;min-width:0}

/* ---- 顶部 ---- */
.dc-top{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;justify-content:space-between;min-height:28px}
.dc-nav{display:flex;align-items:center;gap:2px;margin-right:2px}
.dc-icon-btn:disabled{opacity:.35;cursor:default}
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
.dc-legend{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex-wrap:wrap}
.dc-facet{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border:1px solid var(--dc-edge);
  border-radius:var(--dc-r-chip);background:transparent;color:var(--dc-ink-2);font:inherit;font-size:11px;cursor:pointer}
.dc-facet:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dc-ink-1)}
.dc-facet[data-on="true"]{background:var(--dc-ink-1);border-color:var(--dc-ink-1);color:var(--dc-surface)}
.dc-facet-swatch{width:8px;height:8px;border-radius:2px;flex:none;background:var(--dc-facet,var(--dc-hue-none))}
.dc-facet b{font-weight:500;font-variant-numeric:tabular-nums;opacity:.7}
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
.dc-chip[data-tone="up"]{color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb,var(--dc-mark-unsure) 14%,transparent)}
.dc-chip[data-tone="down"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dc-mark-keep) 12%,transparent)}
.dc-chip[data-tone="warn"],.dc-chip--warn{color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb,var(--dc-mark-unsure) 14%,transparent)}
.dc-chip[data-decision="keep"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dc-mark-keep) 12%,transparent)}
.dc-chip[data-decision="delete"]{color:var(--dc-mark-delete);background:color-mix(in srgb,var(--dc-mark-delete) 12%,transparent)}
.dc-chip--delta{font-variant-numeric:tabular-nums}
.dc-chip--age{cursor:pointer;border:1px dashed var(--dc-edge);background:transparent;color:var(--dc-ink-3);font-variant-numeric:tabular-nums}
.dc-chip--age:hover{color:var(--dc-ink-1);border-color:var(--dc-ink-3)}

/* ---- banner ---- */
.dc-plan-agent{height:26px;font-size:11.5px;padding:0 8px}
.dc-rect[data-flash="true"]{animation:dc-flash 1s ease-out}
@keyframes dc-flash{0%{box-shadow:inset 0 0 0 2px var(--dc-ink-1),0 0 0 4px color-mix(in srgb,var(--dc-ink-1) 18%,transparent)}100%{box-shadow:inset 0 0 0 1px var(--dc-line),0 0 0 0 transparent}}
.dc-objection{margin:8px 0 0;padding:7px 9px;border-radius:var(--dsw-radius-sm);font-size:11.5px;line-height:1.5;
  background:color-mix(in srgb,var(--dc-mark-unsure) 10%,transparent);color:var(--dsw-alias-state-warn-label)}
.dc-objection-k{font-weight:500;margin-bottom:2px}
.dc-cold{line-height:1.6}
.dc-markby{font-size:10.5px;color:var(--dc-ink-3);margin:2px 0 0}
.dc-input{height:28px;padding:0 8px;border-radius:var(--dsw-radius-sm);border:1px solid var(--dc-edge);
  background:var(--dc-surface);color:var(--dc-ink-1);font:inherit;font-size:12px}
.dc-input:focus{outline:2px solid var(--dsw-focus-ring-color,var(--dc-ink-1));outline-offset:-1px;border-color:transparent}
.dc-batch-move{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dc-batch-move-input{width:min(300px,46vw)}
.dc-move-badge{position:absolute;left:calc(5px / var(--dc-k,1));top:calc(6px / var(--dc-k,1));z-index:2;
  max-width:calc(100% - 10px);padding:0 6px;height:16px;display:inline-flex;align-items:center;border-radius:999px;
  font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  background:color-mix(in srgb,var(--dc-mark-keep) 14%,var(--dc-surface));color:var(--dsw-alias-state-success-primary)}
.dc-overlay{position:absolute;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;
  background:color-mix(in srgb,var(--dc-ink-1) 26%,transparent)}
.dc-sheet{width:min(720px,92%);max-height:80%;display:flex;flex-direction:column;gap:8px;padding:14px;
  background:var(--dc-surface);border-radius:var(--dsw-radius-md);box-shadow:var(--dsw-shadow-lv3);box-sizing:border-box}
.dc-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dc-sheet-title{font-size:13px;font-weight:600}
.dc-sheet-hint{font-size:11px;line-height:1.5;color:var(--dc-ink-3)}
.dc-sheet-body{flex:1 1 auto;min-height:0;overflow-y:auto;border-top:1px solid var(--dc-line);border-bottom:1px solid var(--dc-line)}
.dc-move-row{display:grid;grid-template-columns:minmax(0,1fr) 16px minmax(0,1fr);align-items:center;gap:8px;
  padding:6px 2px;font-size:11.5px;border-bottom:1px solid var(--dc-line)}
.dc-move-row:last-child{border-bottom:0}
.dc-move-row[data-ok="false"] .dc-move-to{color:var(--dsw-alias-state-warn-label)}
.dc-move-from,.dc-move-to{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-move-arrow{color:var(--dc-ink-3);text-align:center}
.dc-sheet-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px}
.dc-sheet-count{margin-right:auto;font-size:11px;color:var(--dc-ink-3);font-variant-numeric:tabular-nums}
.dc-sheet-empty{padding:24px 0;text-align:center;color:var(--dc-ink-3);font-size:12px}
.dc-toast{position:absolute;left:50%;bottom:74px;transform:translateX(-50%);z-index:60;pointer-events:none;
  padding:6px 12px;border-radius:var(--dc-r-chip);font-size:11.5px;
  background:var(--dc-ink-1);color:var(--dc-surface);box-shadow:var(--dsw-shadow-lv2)}
.dc-banner{font-size:12px;padding:6px 10px;border-radius:var(--dsw-radius-sm);
  background:color-mix(in srgb,var(--dc-mark-unsure) 12%,transparent);color:var(--dsw-alias-state-warn-label)}

/* ---- 主体 ---- */
.dc-body{position:relative;flex:1 1 auto;min-height:0;display:flex}
.dc-body--rail{padding-right:308px;box-sizing:border-box}
@container (max-width: 560px){
  .dc-body--rail{padding-right:0}
  .dc-body[data-rail="none"] .dc-rail{display:none}
  .dc-body[data-rail="open"] .dc-rail{left:8px;right:8px;width:auto;top:8px;bottom:8px;z-index:30;box-shadow:var(--dsw-shadow-lv3)}
}
.dc-viewport{position:absolute;inset:0;transform-origin:0 0;will-change:transform}
.dc-canvas{position:relative;flex:1 1 auto;min-width:0;min-height:0;border-radius:var(--dsw-radius-md);
  background:var(--dc-recess);border:1px solid var(--dc-line);overflow:hidden;user-select:none}
.dc-canvas--list{user-select:text;background:var(--dc-surface)}
.dc-zoomchip{position:absolute;right:10px;bottom:10px;z-index:8;display:inline-flex;align-items:center;gap:6px;
  height:24px;padding:0 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l3);background:var(--dc-surface);
  color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;box-shadow:var(--dsw-shadow-lv1);
  font-variant-numeric:tabular-nums}
.dc-zoomchip:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}
.dc-zoomchip span{color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.dc-marquee{position:absolute;z-index:6;pointer-events:none;border:1px dashed var(--dsw-alias-label-primary);
  background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);border-radius:3px}
.dc-zoom{position:absolute;z-index:7;pointer-events:none;border-radius:5px;overflow:hidden;
  display:flex;align-items:center;justify-content:center;background:var(--dc-surface);
  transition:left .36s cubic-bezier(.22,.75,.25,1),top .36s cubic-bezier(.22,.75,.25,1),
    width .36s cubic-bezier(.22,.75,.25,1),height .36s cubic-bezier(.22,.75,.25,1),
    border-radius .36s ease,opacity .2s ease}
.dc-zoom[data-grow="true"]{border-radius:var(--dsw-radius-md)}
.dc-zoom[data-fade="true"]{opacity:0}
.dc-zoom-name{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary);opacity:0;transition:opacity .2s .12s}
.dc-zoom[data-grow="true"] .dc-zoom-name{opacity:.95}

/* ---- 批量操作条 ---- */
.dc-batch{position:absolute;z-index:9;left:50%;bottom:12px;transform:translateX(-50%);display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;
  width:max-content;max-width:calc(100% - 24px);padding:7px 8px 7px 12px;box-sizing:border-box;border-radius:var(--dsw-radius-md);
  background:var(--dc-surface);border:1px solid var(--dsw-alias-border-l3);box-shadow:var(--dsw-shadow-lv3);font-size:12px}
.dc-batch-info{display:flex;align-items:center;gap:6px;white-space:nowrap}
.dc-batch-info strong{font-weight:600}
.dc-batch-sep{opacity:.4}
.dc-batch-bytes{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dc-batch-decided{color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dc-batch-risk{color:var(--dsw-alias-state-warn-label);white-space:nowrap;font-size:11px}
.dc-batch-actions{display:flex;align-items:center;gap:4px}
.dc-batch .dc-btn{height:26px;font-size:11.5px}

/* ---- 列表视图 ---- */
.dc-views{display:inline-flex;align-items:center;gap:1px;padding:2px;border-radius:var(--dsw-radius-sm);background:var(--dc-recess);flex:none}
.dc-view-btn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:22px;border:0;border-radius:5px;
  background:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:0}
.dc-view-btn:hover{color:var(--dsw-alias-label-primary)}
.dc-view-btn[data-on="true"]{background:var(--dc-surface);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv1)}

/* ---- 跨层索引 ---- */
.dc-index{position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;font-size:12px}
.dc-index-head{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:none;min-width:0}
.dc-index-title{font-weight:600;white-space:nowrap}
.dc-index-meta{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dc-index-search{margin-left:auto;display:flex;align-items:center;gap:4px;height:24px;padding:0 8px;min-width:180px;max-width:280px;
  border:1px solid var(--dc-line);border-radius:999px;background:var(--dc-surface);color:var(--dsw-alias-label-tertiary)}
.dc-index-search:focus-within{border-color:var(--dsw-alias-border-l4)}
.dc-index-search .dc-ico{flex:none;opacity:.7}
.dc-index-search input{flex:1 1 auto;min-width:0;border:0;background:none;font:inherit;font-size:11.5px;color:var(--dsw-alias-label-primary);outline:none}
.dc-index-search input::placeholder{color:var(--dsw-alias-label-caption)}
.dc-index-search input::-webkit-search-cancel-button{display:none}
.dc-index-hint{min-width:0;color:var(--dsw-alias-label-tertiary);font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:32%}
.dc-index-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding-bottom:10px}
.dc-index[data-batch="true"] .dc-index-body{padding-bottom:58px}
.dc-index-group{border-bottom:1px solid var(--dsw-alias-border-l1)}
.dc-index-grow{display:grid;grid-template-columns:24px minmax(0,1fr) 48px 68px 20px;align-items:center;gap:8px;height:34px;padding:0 10px}
.dc-index-grow:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dc-index-cell{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-index-cb{display:flex;align-items:center;justify-content:center}
.dc-index-cb input{margin:0;cursor:pointer;accent-color:var(--dsw-alias-label-primary)}
.dc-index-toggle{display:flex;align-items:center;gap:7px;min-width:0;border:0;background:none;color:inherit;font:inherit;cursor:pointer;padding:0;text-align:left}
.dc-index-label{font-weight:600;white-space:nowrap}
.dc-index-hint-inline{color:var(--dsw-alias-label-tertiary);font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-index-chev{justify-content:flex-end;color:var(--dsw-alias-label-tertiary);transition:transform .12s ease}
.dc-index-chev[aria-expanded="true"]{transform:rotate(90deg)}
.dc-index-count{text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dc-index-size{text-align:right;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dc-index-rows{padding:0 10px 6px 34px}
.dc-index-row{display:grid;grid-template-columns:20px minmax(0,1fr) 68px 22px;align-items:center;gap:6px;
  height:26px;padding:0 4px;border-radius:var(--dsw-radius-xs);cursor:default}
.dc-index-row:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dc-index-row[data-selected="true"]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
.dc-index-row[data-anchor="true"]{box-shadow:inset 2px 0 0 var(--dsw-alias-label-primary)}
.dc-index-path{display:flex;align-items:center;gap:5px;color:var(--dsw-alias-label-secondary)}
.dc-index-path .dc-ico{flex:none;color:var(--dsw-alias-label-tertiary)}
.dc-index-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-index-dec{text-align:right}
.dc-index-more{padding:4px 0 2px;color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.dc-index-restore{height:22px;padding:0 8px;font-size:11px;justify-self:end;white-space:nowrap}
.dc-empty-sub{font-size:11px;color:var(--dsw-alias-label-tertiary);max-width:48ch;text-align:center;line-height:1.5}
.dc-list{position:absolute;inset:0;display:flex;flex-direction:column;min-height:0;overflow:hidden;font-size:12px}
.dc-list-row{display:grid;grid-template-columns:26px minmax(0,1fr) 74px 44px 64px 72px;align-items:center;gap:8px;
  padding:0 12px;height:30px;border-bottom:1px solid var(--dsw-alias-border-l1);cursor:default}
.dc-list[data-compact="true"] .dc-list-row{grid-template-columns:24px minmax(0,1fr) 64px 40px 52px;gap:6px;padding:0 8px}
.dc-list[data-compact="true"] .dc-list-risk{display:none}
.dc-list[data-compact="true"] .dc-list-row--head,
.dc-list[data-compact="true"] .dc-list-row{font-size:11.5px}
.dc-list[data-narrow="true"] .dc-list-row{grid-template-columns:22px minmax(0,1fr) 60px 52px;gap:6px;padding:0 6px}
.dc-list[data-narrow="true"] .dc-list-share,
.dc-list[data-narrow="true"] .dc-list-risk{display:none}
.dc-list[data-narrow="true"] .dc-list-row--head,
.dc-list[data-narrow="true"] .dc-list-row{font-size:11px}
.dc-list[data-narrow="true"] .dc-list-name{gap:4px}
.dc-list-row--head{height:28px;color:var(--dsw-alias-label-tertiary);font-size:10.5px;position:sticky;top:0;background:var(--dc-surface);z-index:2;border-bottom-color:var(--dsw-alias-border-l2)}
.dc-list-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.dc-list-row:not(.dc-list-row--head):hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dc-list-row[data-selected="true"]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}
.dc-list-row[data-anchor="true"]{box-shadow:inset 2px 0 0 var(--dsw-alias-label-primary)}
.dc-list-cell{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-list-cb{display:flex;align-items:center;justify-content:center}
.dc-list-cb input{margin:0;cursor:pointer;accent-color:var(--dsw-alias-label-primary)}
.dc-list-name{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-primary)}
.dc-list-name .dc-ico{color:var(--dsw-alias-label-tertiary);flex:none}
.dc-list-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-list-size,.dc-list-share{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);text-align:right}
.dc-list-risk{color:var(--dsw-alias-label-tertiary)}
.dc-list-dec{text-align:right}
.dc-list-none{color:var(--dsw-alias-label-dimmed)}
.dc-list-decmark{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:999px;
  font-size:10px;line-height:1;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);font-weight:600}
.dc-list-decmark[data-decision="keep"]{color:var(--dc-mark-keep);background:color-mix(in srgb,var(--dc-mark-keep) 15%,transparent)}
.dc-list-decmark[data-decision="delete"]{color:var(--dc-mark-delete);background:color-mix(in srgb,var(--dc-mark-delete) 14%,transparent)}
.dc-list[data-compact="true"] .dc-list-dec{text-align:center}
.dc-list-row--head .dc-list-size,.dc-list-row--head .dc-list-share{text-align:right}
.dc-list[data-batch="true"] .dc-list-body{padding-bottom:58px}
.dc-scanline{position:absolute;left:0;right:0;top:0;height:2px;overflow:hidden;z-index:5;background:color-mix(in srgb,var(--dc-ink-3) 12%,transparent)}
.dc-scanline i{display:block;height:100%;width:28%;background:var(--dsw-alias-label-tertiary);animation:dc-scan 1.5s ease-in-out infinite}
@keyframes dc-scan{0%{transform:translateX(-100%)}100%{transform:translateX(460%)}}
.dc-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--dsw-alias-label-tertiary);font-size:12px}

/* ---- 方块 ---- */
.dc-rect[data-facet-i="0"],.dc-facet[data-facet-i="0"]{--dc-facet:var(--dc-hue-0)}
.dc-rect[data-facet-i="1"],.dc-facet[data-facet-i="1"]{--dc-facet:var(--dc-hue-1)}
.dc-rect[data-facet-i="2"],.dc-facet[data-facet-i="2"]{--dc-facet:var(--dc-hue-2)}
.dc-rect[data-facet-i="3"],.dc-facet[data-facet-i="3"]{--dc-facet:var(--dc-hue-3)}
.dc-rect[data-facet-i="4"],.dc-facet[data-facet-i="4"]{--dc-facet:var(--dc-hue-4)}
.dc-rect[data-facet-i="5"],.dc-facet[data-facet-i="5"]{--dc-facet:var(--dc-hue-5)}
.dc-rect[data-facet-i="6"],.dc-facet[data-facet-i="6"]{--dc-facet:var(--dc-hue-6)}
.dc-rect[data-facet-i="7"],.dc-facet[data-facet-i="7"]{--dc-facet:var(--dc-hue-7)}
.dc-rect[data-facet-i="-1"],.dc-facet[data-facet-i="-1"]{--dc-facet:var(--dc-hue-none)}
.dc-rect{position:absolute;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:0;
  padding:0;margin:0;border:0;border-radius:calc(var(--dc-r-tile) / var(--dc-k,1));overflow:hidden;text-align:left;font:inherit;
  color:var(--dc-ink-1);background:var(--dc-surface);cursor:pointer;
  box-shadow:inset 0 0 0 1px var(--dc-line);
  transition:box-shadow var(--dc-t-fast) ease,filter var(--dc-t-fast) ease,opacity var(--dc-t-fast) ease}
.dc-rect[data-facet-i]{background:color-mix(in srgb,var(--dc-facet) var(--dc-facet-fill),var(--dc-surface))}
/* 决定要压过类别底色：否则 18% 的类别色会把 5% 的红色吃掉 */
.dc-rect[data-decision="delete"]{background:color-mix(in srgb,var(--dc-mark-delete) 24%,var(--dc-surface));
  box-shadow:inset 0 0 0 calc(2px / var(--dc-k,1)) color-mix(in srgb,var(--dc-mark-delete) 60%,transparent)}
.dc-rect[data-decision="keep"]{box-shadow:inset 0 0 0 calc(2px / var(--dc-k,1)) color-mix(in srgb,var(--dc-mark-keep) 60%,transparent)}
.dc-rect[data-facet-i]::before{content:"";position:absolute;left:0;top:0;bottom:0;width:calc(3px / var(--dc-k,1));z-index:1;
  background:color-mix(in srgb,var(--dc-facet) var(--dc-facet-edge),var(--dc-surface))}
.dc-rect[data-dash="true"]{outline:1px dashed var(--dc-edge);outline-offset:-2px}
.dc-rect[data-facet-i="-1"]::before{display:none}
.dc-rect[data-dim="true"]{filter:grayscale(1);opacity:calc(1 - var(--dc-facet-dim))}
.dc-rect:hover{box-shadow:inset 0 0 0 1px var(--dc-edge),var(--dsw-shadow-lv1)}
.dc-tile-in{display:flex;flex-direction:column;align-items:flex-start;gap:calc(1px / var(--dc-k,1));
  padding:calc(6px / var(--dc-k,1)) calc(8px / var(--dc-k,1));min-width:0;max-width:100%;box-sizing:border-box}
.dc-tile-name{display:flex;align-items:center;gap:calc(5px / var(--dc-k,1));min-width:0;max-width:100%;
  font-size:calc(12px / var(--dc-k,1));font-weight:600;line-height:1.3}
.dc-tile-kind{display:inline-flex;align-items:center;flex:none;color:var(--dsw-alias-label-tertiary);opacity:.9}
.dc-tile-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-tile-meta{font-size:calc(11px / var(--dc-k,1));line-height:1.35;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:4px;max-width:100%;overflow:hidden;white-space:nowrap}
.dc-tile-meta--soft{color:var(--dsw-alias-label-tertiary)}
.dc-tile-dot{opacity:.45}
.dc-tile-claim{font-size:calc(11px / var(--dc-k,1));line-height:1.45;color:var(--dsw-alias-label-tertiary);margin-top:calc(4px / var(--dc-k,1));max-width:36ch;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dc-rect[data-sz="sm"] .dc-tile-in{padding:calc(4px / var(--dc-k,1)) calc(7px / var(--dc-k,1))}
.dc-rect[data-sz="sm"] .dc-tile-name{font-size:calc(11px / var(--dc-k,1));font-weight:500}
.dc-rect[data-sz="md"] .dc-tile-name{font-size:calc(12px / var(--dc-k,1))}
.dc-rect[data-sz="lg"] .dc-tile-in{padding:calc(14px / var(--dc-k,1)) calc(18px / var(--dc-k,1));gap:calc(2px / var(--dc-k,1))}
.dc-rect[data-sz="lg"] .dc-tile-name{font-size:calc(16px / var(--dc-k,1));font-weight:600;letter-spacing:-.01em;gap:calc(7px / var(--dc-k,1))}
.dc-rect[data-sz="lg"] .dc-tile-meta{font-size:calc(12px / var(--dc-k,1))}
.dc-rect[data-sz="lg"] .dc-tile-claim{font-size:calc(12px / var(--dc-k,1));line-height:1.5;max-width:46ch;margin-top:calc(7px / var(--dc-k,1));-webkit-line-clamp:3}
.dc-rect:hover{z-index:2}
.dc-rect:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dc-ink-1));outline-offset:-2px;z-index:3}
.dc-rect[data-selected="true"]{z-index:4;background-image:linear-gradient(color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent),color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent))}
.dc-rect[data-selected="true"][data-anchor="true"]{outline:calc(2px / var(--dc-k,1)) solid var(--dsw-alias-label-primary);outline-offset:calc(-2px / var(--dc-k,1));box-shadow:var(--dsw-shadow-lv2)}
.dc-mark{position:absolute;right:calc(5px / var(--dc-k,1));top:calc(6px / var(--dc-k,1));z-index:1;
  display:inline-flex;align-items:center;justify-content:center;
  width:calc(15px / var(--dc-k,1));height:calc(15px / var(--dc-k,1));border-radius:999px;
  font-size:calc(9px / var(--dc-k,1));line-height:1;background:var(--dc-surface);
  color:var(--dsw-alias-label-secondary);box-shadow:0 0 0 calc(1px / var(--dc-k,1)) var(--dsw-alias-border-l3);font-weight:600}
.dc-mark--dot{width:calc(6px / var(--dc-k,1));height:calc(6px / var(--dc-k,1));right:calc(4px / var(--dc-k,1));top:calc(4px / var(--dc-k,1));box-shadow:none;background:var(--dsw-alias-label-tertiary)}
.dc-rect[data-decision="keep"] .dc-mark{color:var(--dc-mark-keep);background:color-mix(in srgb,var(--dc-mark-keep) 16%,var(--dc-surface))}
.dc-rect[data-decision="delete"] .dc-mark{color:var(--dc-mark-delete);background:color-mix(in srgb,var(--dc-mark-delete) 16%,var(--dc-surface))}
.dc-rect[data-decision="keep"]{box-shadow:inset 0 0 0 calc(1.5px / var(--dc-k,1)) color-mix(in srgb,var(--dc-mark-keep) 55%,transparent)}
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
.dc-trend{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--dsw-alias-label-tertiary);padding:1px 1px 0}
.dc-trend b{font-weight:500;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dc-spark{color:var(--dsw-alias-label-tertiary);flex:none}
.dc-stat{display:flex;flex-direction:column;gap:0;padding:5px 8px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-module-platform)}
.dc-stat-v{font-size:15px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums}
.dc-stat-k{font-size:10px;line-height:1.4;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-stat[data-tone="delete"][data-nz="true"] .dc-stat-v{color:var(--dc-mark-delete)}
.dc-stat[data-tone="keep"][data-nz="true"] .dc-stat-v{color:var(--dsw-alias-state-success-primary)}
.dc-rail--overview{overflow:hidden}
.dc-queue{display:flex;flex-direction:column;gap:1px;margin:0 -6px;flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.dc-queue-row{display:flex;align-items:center;gap:7px;width:100%;padding:5px 6px;border:0;border-radius:var(--dsw-radius-xs);
  background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer;text-align:left}
.dc-queue-row:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dc-queue-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-queue-size{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dc-dot{flex:none;width:6px;height:6px;border-radius:999px;background:var(--dc-ink-3);display:inline-block}
.dc-dot[data-state="known"]{background:var(--dsw-alias-label-tertiary)}
.dc-dot[data-state="stale"]{background:var(--dc-mark-unsure)}
.dc-dot[data-state="none"]{background:transparent;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l3)}
.dc-dot[data-decision="delete"]{background:var(--dc-mark-delete)}
.dc-rail-note{font-size:11px;color:var(--dsw-alias-label-tertiary);padding:2px 0}
.dc-menuwrap{position:relative;display:inline-flex}
.dc-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:40;min-width:196px;padding:5px;box-sizing:border-box;
  border-radius:var(--dsw-radius-md);background:var(--dc-surface);border:1px solid var(--dsw-alias-border-l3);
  box-shadow:var(--dsw-shadow-lv3);display:flex;flex-direction:column;gap:1px}
.dc-menu-title{font-size:10.5px;color:var(--dsw-alias-label-tertiary);padding:4px 8px 3px}
.dc-menu-item{display:flex;align-items:center;gap:8px;height:28px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);
  background:none;color:inherit;font:inherit;font-size:12px;cursor:pointer;text-align:left}
.dc-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dc-menu-item b{margin-left:auto;font-weight:500;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dc-menu--wide{min-width:232px;padding:7px}
.dc-menu--up{top:auto;bottom:calc(100% + 6px);min-width:160px}
.dc-menu--up .dc-menu-item{height:30px}
.dc-menu-seg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin:2px 0 6px}
.dc-menu-segbtn{height:26px;border:1px solid var(--dc-line);border-radius:var(--dsw-radius-sm);background:var(--dc-surface);
  color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer}
.dc-menu-segbtn:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dc-menu-segbtn[data-on="true"]{background:var(--dsw-alias-interactive-bg-active);border-color:transparent;color:var(--dsw-alias-label-primary);font-weight:500}
.dc-menu-note{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary);padding:2px 4px 4px}
.dc-menu-rule{display:flex;align-items:center;gap:8px;height:26px;padding:0 4px;font-size:12px}
.dc-menu-rule-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-menu-rule-dec{color:var(--dsw-alias-label-tertiary);font-size:11.5px}
.dc-menu-rules-actions{display:flex;gap:12px;padding:2px 4px 6px}
.dc-menu-link{border:0;background:none;padding:0;font:inherit;font-size:11px;color:var(--dsw-alias-link);
  cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.dc-rail-link{align-self:flex-start;border:0;background:none;padding:0;font:inherit;font-size:11px;
  color:var(--dsw-alias-link);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.dc-hints{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:4px 8px;flex:none;padding-top:8px;margin-top:auto;border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.dc-hint{display:inline-flex;align-items:center;gap:4px}
.dc-hint-sep{opacity:.4}
.dc-hint--plain{color:var(--dsw-alias-label-tertiary);padding-left:2px}
.dc-kbd{font-family:inherit;font-size:10px;line-height:1;padding:3px 5px;border-radius:4px;border:1px solid var(--dc-line);
  border-bottom-width:1.5px;background:var(--dc-recess);color:var(--dsw-alias-label-secondary)}
.dc-detail-head{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary)}
.dc-detail-name{flex:1 1 auto;min-width:0;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-detail-path{font-size:11px;color:var(--dsw-alias-label-tertiary);word-break:break-all;margin-top:-4px}
.dc-chips{display:flex;gap:5px;flex-wrap:wrap}
.dc-agent{margin:2px 0 0;padding:8px 10px;border-radius:var(--dsw-radius-sm);
  background:color-mix(in srgb,var(--dc-ink-1) 4%,var(--dc-surface));border-left:2px solid var(--dc-edge)}
.dc-agent[data-empty="true"]{background:transparent;border-left-color:var(--dc-line)}
.dc-agent-claim{font-size:12px;line-height:1.6;color:var(--dc-ink-1)}
.dc-agent[data-empty="true"] .dc-agent-claim{color:var(--dc-ink-3)}
.dc-agent-row{display:flex;gap:6px;margin-top:4px;font-size:11px;line-height:1.5;color:var(--dc-ink-2);min-width:0}
.dc-agent-row > span:last-child{min-width:0;overflow-wrap:anywhere;word-break:break-word}
.dc-agent-k{flex:none;color:var(--dc-ink-3)}
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
.dc-seg button[data-on="true"][data-d="keep"]{background:color-mix(in srgb,var(--dc-mark-keep) 16%,transparent);border-color:color-mix(in srgb,var(--dc-mark-keep) 50%,transparent);color:var(--dsw-alias-state-success-primary)}
.dc-seg button[data-on="true"][data-d="delete"]{background:color-mix(in srgb,var(--dc-mark-delete) 12%,transparent);border-color:color-mix(in srgb,var(--dc-mark-delete) 45%,transparent);color:var(--dc-mark-delete)}
.dc-warn{font-size:11.5px;line-height:1.5;color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb,var(--dc-mark-unsure) 10%,transparent);border-radius:var(--dsw-radius-sm);padding:7px 9px}
.dc-detail-sec--note{flex:1 1 auto;min-height:0}
.dc-seg-glyph{font-size:11px;line-height:1}
.dc-note{width:100%;box-sizing:border-box;min-height:72px;flex:1 1 auto;resize:none;border:1px solid var(--dc-line);border-radius:var(--dsw-radius-sm);
  background:var(--dc-surface);color:inherit;font:inherit;font-size:12px;line-height:1.5;padding:7px 9px}
.dc-note::placeholder{color:var(--dsw-alias-label-caption)}
.dc-note:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dc-ink-3));outline-offset:-2px;border-color:transparent}

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
      const presetOf = (sessionId) => {
        try {
          return ctx.sessions?.list?.getSnapshot()?.byId?.[sessionId]?.projectionValues?.agentPreset ?? null
        } catch {
          return null
        }
      }
      ctx.effect(() => ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: PANEL_ID,
        order: 20,
        locale: NS,
        label: () => t('panel'),
        inject: (sessionId) => ({ t, sessionId, preset: presetOf(sessionId) }),
      }, Page)), 'disk-canvas: conversation tab')
    }

    exports.apply = apply
    exports.inject = ['slots', 'locale', 'sessions']
    return module.exports
  },
})
