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
      patterns: '/plugins/dsh-disk-canvas/patterns',
      config: '/plugins/dsh-disk-canvas/config',
      quarantine: '/plugins/dsh-disk-canvas/quarantine',
    }
    const RISK_ORDER = ['safe', 'caution', 'personal', 'unknown', 'high']
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
      toList: '列表视图（含点不到的小项）',
      toTree: '树图视图',
      colName: '名称',
      claim: '判断',
      viewTree: '树图',
      viewList: '列表',
      viewIndex: '跨层索引',
      indexTitle: '跨层索引',
      indexHint: '扫描时顺带记录名字命中规则的目录（node_modules / Caches / build …），不额外遍历',
      indexEmpty: '这次扫描没有识别到可清理的目录',
      indexScanning: '重新扫描后会重建索引',
      indexShown: '显示前 {n} 项',
      indexSelectAll: '全选这类',
      indexTotal: '合计',
      searchPlaceholder: '搜路径（如 node_modules / Project）',
      searchClear: '清空搜索',
      searchMatches: '{n} 项匹配',
      noMatch: '没有匹配的目录',
      exportMd: '导出清单',
      exportJson: 'JSON',
      exportScript: '清理脚本',
      exportMenu: '导出',
      scriptNote: '脚本默认只演练：把待清理项移动到废纸篓下的隔离目录，加 --yes 才真的移动',
      mdTitle: '磁盘清理清单',
      mdRoot: '扫描根目录',
      mdScanned: '扫描时间',
      mdGenerated: '生成时间',
      mdSummary: '汇总',
      mdDelete: '待清理',
      mdKeep: '保留',
      mdUnsure: '待复查',
      mdUnreviewed: '未审',
      mdPartial: '（部分结果：扫描预算用尽，清单可能不完整）',
      mdExtra: '索引里的其他层',
      mdFooter: '本清单由 dsh-disk-canvas 生成。插件不会删除任何文件，执行前请自行核对。',
      risk: '风险',
      pickedN: '已选 {n} 项',
      pickedDecided: '{n} 项已有决定',
      clearPick: '清除选择',
      showList: '在列表里逐项看',
      locate: '在画布中定位',
      viewQuarantine: '隔离区',
      quarantineTitle: '隔离区',
      quarantineEmpty: '隔离区是空的',
      quarantineHint: '导出的清理脚本会把项目移到这里（废纸篓下的一个目录），而不是删掉；需要时可以在这里移回去。',
      quarantineBatches: '{n} 批',
      restore: '移回原位',
      restoreBatch: '整批移回',
      restoreDone: '已移回 {n} 项',
      quarantineChip: '隔离区 {n} 项',
      ageDays: '已放 {n} 天',
      ageToday: '今天',
      expireHint: '超过 30 天：确认没问题就在废纸篓里清空',
      openQuarantine: '打开隔离区',
      restoreNone: '没有可移回的项',
      restoreNoManifest: '这批没有清单，只能在废纸篓里手动找回',
      reasonAlready: '已经移回过',
      reasonMissing: '隔离区里已经没有这个项',
      reasonTargetExists: '原位置已经有同名项，先处理它',
      reasonCrossDevice: '跨磁盘，请手动移动',
      reasonBadName: '名字不合法',
      settings: '设置',
      autoScan: '自动扫描',
      autoScanOff: '关',
      autoScanDaily: '每天',
      autoScanWeekly: '每周',
      rules: '记忆规则',
      noRules: '还没有规则。在索引里选中一类，勾「记住这类」再给决定。',
      remember: '记住这类',
      rememberHint: '以后扫到同类目录自动这样标',
      forget: '撤销这条规则',
      exportRules: '导出规则',
      importRules: '导入规则',
      rulesImported: '已导入 {n} 条规则',
      rulesInvalid: '这个文件不是规则文件',
      selectBy: '按规则选',
      resetZoom: '复位',
      selectByHint: '只作用于当前这一层',
      pickUndecided: '未审的',
      hintDrag: '拖拽框选',
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
      hintEsc: 'deselect',
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
      toList: 'List view (includes sub-pixel items)',
      toTree: 'Treemap view',
      colName: 'Name',
      claim: 'Claim',
      viewTree: 'Treemap',
      viewList: 'List',
      viewIndex: 'Cross-level index',
      indexTitle: 'Cross-level index',
      indexHint: 'Directories whose names match a cleanup rule (node_modules / Caches / build …), collected during the scan',
      indexEmpty: 'This scan found no directories matching a cleanup rule',
      indexScanning: 'Rescan to rebuild the index',
      indexShown: 'showing first {n}',
      indexSelectAll: 'Select group',
      indexTotal: 'total',
      searchPlaceholder: 'Search paths',
      searchClear: 'Clear search',
      searchMatches: '{n} matches',
      noMatch: 'No matching folders',
      exportMd: 'Export list',
      exportJson: 'JSON',
      exportScript: 'Cleanup script',
      exportMenu: 'Export',
      scriptNote: 'The script is a dry run by default: it moves items into a quarantine folder inside Trash; pass --yes to actually move',
      mdTitle: 'Disk cleanup list',
      mdRoot: 'Scan root',
      mdScanned: 'Scanned at',
      mdGenerated: 'Generated at',
      mdSummary: 'Summary',
      mdDelete: 'To delete',
      mdKeep: 'Keep',
      mdUnsure: 'Unsure',
      mdUnreviewed: 'Unreviewed',
      mdPartial: '(partial result: the scan budget ran out; this list may be incomplete)',
      mdExtra: 'Other levels (from index)',
      mdFooter: 'Generated by dsh-disk-canvas. The plugin never deletes anything — check this list before you run it.',
      risk: 'Risk',
      pickedN: '{n} selected',
      pickedDecided: '{n} already decided',
      clearPick: 'Clear selection',
      showList: 'List every item',
      locate: 'Locate on canvas',
      viewQuarantine: 'Quarantine',
      quarantineTitle: 'Quarantine',
      quarantineEmpty: 'Quarantine is empty',
      quarantineHint: 'The exported cleanup script moves items here (a folder inside Trash) instead of deleting them; you can move them back from here.',
      quarantineBatches: '{n} batches',
      restore: 'Restore',
      restoreBatch: 'Restore batch',
      restoreDone: 'Restored {n} item(s)',
      quarantineChip: 'Quarantine {n}',
      ageDays: '{n} d old',
      ageToday: 'today',
      expireHint: 'Older than 30 days: empty it in Trash once you are sure',
      openQuarantine: 'Open quarantine',
      restoreNone: 'Nothing to restore',
      restoreNoManifest: 'This batch has no manifest — restore it from Trash manually',
      reasonAlready: 'already restored',
      reasonMissing: 'no longer in quarantine',
      reasonTargetExists: 'original location already has an item with that name',
      reasonCrossDevice: 'cross-device, move it manually',
      reasonBadName: 'bad name',
      settings: 'Settings',
      autoScan: 'Auto-scan',
      autoScanOff: 'Off',
      autoScanDaily: 'Daily',
      autoScanWeekly: 'Weekly',
      rules: 'Remembered rules',
      noRules: 'No rules yet. Select a group in the index, tick “Remember this group”, then decide.',
      remember: 'Remember group',
      rememberHint: 'Future scans mark matching folders the same way',
      forget: 'Remove this rule',
      exportRules: 'Export rules',
      importRules: 'Import rules',
      rulesImported: 'Imported {n} rule(s)',
      rulesInvalid: 'That file is not a rules file',
      selectBy: 'Select by rule',
      resetZoom: 'Reset',
      selectByHint: 'Current level only',
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
    function buildScript({ plan, t }) {
      const shq = (v) => String(v).replace(/'/g, "'\\''")
      const stamp = (ms) => {
        if (!ms) return '—'
        try {
          const d = new Date(ms)
          const pad = (n) => String(n).padStart(2, '0')
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
        } catch { return '—' }
      }
      const rows = [...(plan.delete ?? []), ...(plan.extra?.delete ?? [])]
        .filter((e) => typeof e.path === 'string' && e.path.startsWith('/') && e.path !== '/'
          && !e.path.includes('\n') && !e.path.includes('\t'))
      const totalBytes = rows.reduce((n, e) => n + (e.bytes || 0), 0)
      const lines = [
        '#!/bin/sh',
        `# dsh-disk-canvas · ${t('mdTitle')}`,
        `# ${t('mdGenerated')}: ${stamp(Date.now())}`,
        `# ${t('mdRoot')}: ${plan.root}`,
        `# ${t('mdScanned')}: ${stamp(plan.scannedAt)}${plan.partial ? ' ' + t('mdPartial') : ''}`,
        `# ${t('mdDelete')}: ${rows.length} · ${formatBytes(totalBytes)}`,
        '#',
        `# ${t('scriptNote')}`,
        '#',
        'set -eu',
        '',
        'DRY=1',
        '[ "${1:-}" = "--yes" ] && DRY=0',
        'QUARANTINE="$HOME/.Trash/dsh-disk-canvas-$(date +%Y%m%d-%H%M%S)"',
        'N=0',
        '',
        'move() {',
        '  p=$1',
        '  bytes=${2:-0}',
        "  if [ ! -e \"$p\" ]; then printf 'skip (gone): %s\\n' \"$p\"; return 0; fi",
        "  case \"$p\" in /|\"$HOME\") printf 'refuse: %s\\n' \"$p\"; return 0;; esac",
        '  N=$((N+1))',
        '  if [ "$DRY" = "1" ]; then',
        "    printf '[dry-run] %s\\n' \"$p\"",
        '    return 0',
        '  fi',
        '  mkdir -p "$QUARANTINE"',
        "  name=\"$(printf '%03d' \"$N\")-$(basename \"$p\")\"",
        '  mv -- "$p" "$QUARANTINE/$name"',
        "  printf '%s\\t%s\\t%s\\n' \"$name\" \"$bytes\" \"$p\" >> \"$QUARANTINE/manifest.tsv\"",
        "  printf 'moved: %s\\n' \"$p\"",
        '}',
        '',
        `# ${t('mdDelete')} (${rows.length})`,
        ...rows.map((e) => `move '${shq(e.path)}' ${e.bytes || 0}`),
        '',
        "printf '\\n---\\n'",
        'if [ "$DRY" = "1" ]; then',
        "  printf 'dry run: %s item(s) would move to %s\\n' \"$N\" \"$QUARANTINE\"",
        "  printf 'run again with --yes to execute: sh %s --yes\\n' \"$0\"",
        'else',
        "  printf 'moved %s item(s) to %s (restore from Trash or the canvas quarantine view)\\n' \"$N\" \"$QUARANTINE\"",
        'fi',
        '',
      ]
      return lines.join('\n')
    }

    /** 给用户看的清单（Markdown）；机器可读的那份仍然走 JSON。 */
    function buildMarkdown({ plan, t }) {
      const stamp = (ms) => {
        if (!ms) return '—'
        try {
          const d = new Date(ms)
          const pad = (n) => String(n).padStart(2, '0')
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
        } catch { return '—' }
      }
      const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
      const nItems = (n) => `${n} ${n === 1 ? t('item') : t('items')}`
      const section = (title, list) => {
        const bytes = list.reduce((n, e) => n + (e.bytes || 0), 0)
        const head = `## ${title} · ${nItems(list.length)} · ${formatBytes(bytes)}`
        if (list.length === 0) return `${head}\n\n_— _\n`
        const rows = list.map((e) => `| \`${cell(e.path)}\` | ${formatBytes(e.bytes)} | ${t(e.risk)} | ${cell(e.claim)} | ${cell(e.note)} |`)
        return [
          head,
          '',
          `| ${t('colName')} | ${t('bytes')} | ${t('risk')} | ${t('claim')} | ${t('note')} |`,
          '|---|---|---|---|---|',
          ...rows,
          '',
        ].join('\n')
      }
      const p = plan.plan ?? {}
      const head = [
        `# ${t('mdTitle')}`,
        '',
        `- ${t('mdRoot')}: \`${plan.root}\``,
        `- ${t('mdScanned')}: ${stamp(plan.scannedAt)}${plan.partial ? ' ' + t('mdPartial') : ''}`,
        `- ${t('mdGenerated')}: ${stamp(plan.generatedAt ? Date.parse(plan.generatedAt) : Date.now())}`,
        '',
        `## ${t('mdSummary')}`,
        '',
        `- ${t('mdDelete')}: ${nItems(p.deleteCount ?? 0)} · ${formatBytes(p.reclaimBytes ?? 0)}`,
        `- ${t('mdKeep')}: ${p.keepCount ?? 0}`,
        `- ${t('mdUnsure')}: ${p.unsureCount ?? 0}`,
        `- ${t('mdUnreviewed')}: ${p.unreviewedCount ?? 0}`,
        '',
      ].join('\n')
      const extraDelete = plan.extra?.delete ?? []
      const body = [
        section(t('mdDelete'), plan.delete ?? []),
        section(t('mdKeep'), plan.keep ?? []),
        section(t('mdUnsure'), plan.unsure ?? []),
        extraDelete.length > 0 ? section(`${t('mdExtra')} · ${t('mdDelete')}`, extraDelete) : '',
      ].filter(Boolean).join('\n')
      return `${head}\n${body}\n> ${t('mdFooter')}\n`
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
      list: 'M3 4.4h10M3 8h10M3 11.6h10',
      grid: 'M2.9 2.9h4.3v4.3H2.9zM8.8 2.9h4.3v4.3H8.8zM2.9 8.8h4.3v4.3H2.9zM8.8 8.8h4.3v4.3H8.8z',
      check: 'M3.6 8.4 6.5 11.3 12.4 4.9',
      checklist: 'M2.5 4.2l1.3 1.3 2.1-2.1M9.4 4.4h4.1M2.5 9.6l1.3 1.3 2.1-2.1M9.4 9.8h4.1',
      layers: 'M8 2.6 2.6 5.6 8 8.6l5.4-3zM2.6 9.4 8 12.4l5.4-3',
      search2: 'M10.6 10.6 14 14M11.7 7a4.7 4.7 0 1 1-9.4 0 4.7 4.7 0 0 1 9.4 0z',
      trash: 'M3 4.4h10M4.4 4.4v8.3h7.2V4.4M6.4 4.4V3.2h3.2v1.2M6.6 6.8v3.6M9.4 6.8v3.6',
      gear: 'M8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM8 2.6v1.5M8 11.9v1.5M2.6 8h1.5M11.9 8h1.5M4.2 4.2l1.1 1.1M10.7 10.7l1.1 1.1M11.8 4.2l-1.1 1.1M5.3 10.7l-1.1 1.1',
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
        h('span', { className: 'dc-chip', 'data-risk': e.risk }, t(e.risk)),
        e.decision ? h('span', { className: 'dc-chip', 'data-decision': e.decision }, t(e.decision)) : null,
        h('span', { className: 'dc-hover-size' }, formatBytes(e.bytes)),
        h('span', { className: 'dc-hover-share' }, share(e.bytes, total)),
        e.deltaBytes ? h('span', { className: 'dc-delta' }, `${e.deltaBytes > 0 ? '▲' : '▼'} ${formatBytes(Math.abs(e.deltaBytes))}`) : null),
      h('div', { className: 'dc-hover-claim' }, e.claim))
    }

    function Tile({ r, t, total, k: kArg, selected, anchor, decision, onSelect, onOpen, onHover, onLeave }) {
      const k = kArg || 1
      const w = Math.max(0, r.w - 2)
      const hh = Math.max(0, r.h - 2)
      const sw = w * k
      const sh = hh * k
      const sz = sw >= 280 && sh >= 150 ? 'lg' : sw >= 140 && sh >= 58 ? 'md' : (sw >= 46 && sh >= 20 ? 'sm' : 'xs')
      const named = sz !== 'xs'
      const stripe = r.risk !== 'unknown' && w >= 18 && hh >= 14
      const badge = w >= 34 && hh >= 26
      return h('button', {
        type: 'button',
        className: 'dc-rect',
        'data-risk': r.risk,
        'data-decision': decision || undefined,
        'data-selected': selected ? 'true' : 'false',
        'data-anchor': anchor ? 'true' : 'false',
        'data-stripe': stripe ? 'true' : 'false',
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
          h('span', { className: 'dc-list-cell dc-list-risk' }, t('risk')),
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
              h('i', { className: 'dc-dot', 'data-risk': e.risk }),
              h(Icon, { name: e.kind === 'dir' ? 'folder' : 'file', size: 12 }),
              h('span', { className: 'dc-list-label' }, e.name)),
            h('span', { className: 'dc-list-cell dc-list-size' }, formatBytes(e.bytes)),
            h('span', { className: 'dc-list-cell dc-list-share' }, share(e.bytes, total)),
            h('span', { className: 'dc-list-cell dc-list-risk' }, t(e.risk)),
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
            const entries = g.entries.filter((e) => e.path.toLowerCase().includes(q) || e.name.toLowerCase().includes(q))
            if (!entries.length) return null
            return {
              ...g,
              entries,
              shown: entries.length,
              matched: entries.length,
              count: entries.length,
              bytes: entries.reduce((n, e) => n + (e.bytes || 0), 0),
            }
          }).filter(Boolean)
        : all
      if (groups.length === 0) {
        return h('div', { className: 'dc-empty' },
          h('span', { className: 'dc-empty-text' }, t('indexEmpty')),
          h('span', { className: 'dc-empty-sub' }, t('indexHint')))
      }
      const totalBytes = groups.reduce((n, g) => n + g.bytes, 0)
      const count = groups.reduce((n, g) => n + (g.matched ?? g.count), 0)
      const matches = q ? groups.reduce((n, g) => n + (g.matched ?? 0), 0) : 0
      const toggle = (id) => setOpen((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return h('div', { className: 'dc-index', 'data-batch': picked.size > 1 ? 'true' : 'false' },
        h('div', { className: 'dc-index-head' },
          h('span', { className: 'dc-index-title' }, t('indexTitle')),
          h('span', { className: 'dc-index-meta' },
            q ? t('searchMatches').replace('{n}', String(matches)) : `${groups.length} · ${count} ${t('items')} · ${formatBytes(totalBytes)}`),
          h('label', { className: 'dc-index-search' },
            h(Icon, { name: 'search2' }),
            h('input', {
              type: 'search',
              value: query,
              placeholder: t('searchPlaceholder'),
              onChange: (ev) => setQuery(ev.target.value),
            }),
            query ? h('button', { type: 'button', className: 'dc-icon-btn', 'aria-label': t('searchClear'), onClick: () => setQuery('') }, h(Icon, { name: 'close', size: 10 })) : null)),
        q && groups.length === 0
          ? h('div', { className: 'dc-empty' }, h('span', { className: 'dc-empty-text' }, t('noMatch')))
          : null,
        h('div', { className: 'dc-index-body' },
          groups.map((g) => {
            const expanded = q ? true : open.has(g.id)
            const allPicked = g.entries.length > 0 && g.entries.every((e) => picked.has(e.path))
            return h('div', { key: g.id, className: 'dc-index-group' },
              h('div', { className: 'dc-index-grow', 'data-open': expanded ? 'true' : 'false' },
                h('label', { className: 'dc-index-cell dc-index-cb', onClick: (ev) => ev.stopPropagation() },
                  h('input', {
                    type: 'checkbox',
                    checked: allPicked,
                    'aria-label': g.label,
                    onChange: () => onPickAll(allPicked ? [] : g.entries.map((e) => e.path)),
                  })),
                h('button', {
                  type: 'button',
                  className: 'dc-index-toggle',
                  onClick: () => toggle(g.id),
                  'aria-expanded': expanded ? 'true' : 'false',
                },
                h('i', { className: 'dc-dot', 'data-risk': g.risk }),
                h('span', { className: 'dc-index-label' }, g.label),
                h('span', { className: 'dc-index-hint-inline' }, g.hint)),
                h('span', { className: 'dc-index-cell dc-index-count' }, String(g.count)),
                h('span', { className: 'dc-index-cell dc-index-size' }, formatBytes(g.bytes)),
                h('button', {
                  type: 'button',
                  className: 'dc-index-toggle dc-index-chev',
                  onClick: () => toggle(g.id),
                  'aria-label': expanded ? t('indexTotal') : t('indexSelectAll'),
                }, h(Icon, { name: 'chevron' }))),
              expanded
                ? h('div', { className: 'dc-index-rows' },
                    g.entries.map((e) => {
                      const on = picked.has(e.path)
                      const a = annotations[e.path]
                      return h('div', {
                        key: e.path,
                        className: 'dc-index-row',
                        'data-selected': on ? 'true' : 'false',
                        'data-anchor': selected === e.path ? 'true' : 'false',
                        onClick: (ev) => onPick(e.path, ev.metaKey || ev.shiftKey),
                        onDoubleClick: () => onLocate && onLocate(e.path),
                        title: e.path,
                      },
                      h('label', { className: 'dc-index-cell dc-index-cb', onClick: (ev) => ev.stopPropagation() },
                        h('input', { type: 'checkbox', checked: on, 'aria-label': e.name, onChange: () => onPick(e.path, true) })),
                      h('span', { className: 'dc-index-cell dc-index-path', title: e.path },
                        h(Icon, { name: 'folder', size: 11 }),
                        h('span', { className: 'dc-index-name' }, shortPath(e.path, home))),
                      h('span', { className: 'dc-index-cell dc-index-size' }, formatBytes(e.bytes)),
                      h('span', { className: 'dc-index-cell dc-index-dec' },
                        a?.decision
                          ? h('span', { className: 'dc-list-decmark', 'data-decision': a.decision, title: t(a.decision) },
                              a.decision === 'keep' ? '✓' : a.decision === 'delete' ? '✕' : '?')
                          : h('span', { className: 'dc-list-none' }, '—')))
                    }),
                    g.shown < g.count
                      ? h('div', { className: 'dc-index-more' }, t('indexShown').replace('{n}', String(g.shown)))
                      : null)
                : null)
          })))
    }

    function QuarantineView({ t, data, busy, onRestore, onRestoreBatch, home }) {
      if (!data) return h('div', { className: 'dc-empty' }, h('span', { className: 'dc-empty-text' }, t('loading')))
      const batches = data.batches ?? []
      if (batches.length === 0) {
        return h('div', { className: 'dc-empty' },
          h('span', { className: 'dc-empty-text' }, t('quarantineEmpty')),
          h('span', { className: 'dc-empty-sub' }, t('quarantineHint')))
      }
      const head = h('div', { className: 'dc-index-head' },
        h('span', { className: 'dc-index-title' }, t('quarantineTitle')),
        h('span', { className: 'dc-index-meta' },
          `${t('quarantineBatches').replace('{n}', String(batches.length))} · ${data.count} ${t('items')} · ${formatBytes(data.bytes)}`),
        h('span', { className: 'dc-index-hint', title: data.base }, shortPath(data.base, home)))

      const batchRow = (batch) => {
        const days = batch.at ? Math.max(0, Math.floor((Date.now() - batch.at) / 86400000)) : 0
        const ageLabel = days === 0 ? t('ageToday') : t('ageDays').replace('{n}', String(days))
        return h('div', { className: 'dc-index-grow dc-q-batch' },
          h('span', { className: 'dc-index-cell dc-index-cb' }),
          h('span', { className: 'dc-index-toggle' },
            h(Icon, { name: 'trash' }),
            h('span', { className: 'dc-index-label' }, stampShort(batch.at)),
            h('span', {
              className: `dc-q-age${days >= 30 ? ' dc-q-age--stale' : ''}`,
              title: days >= 30 ? t('expireHint') : undefined,
            }, ageLabel),
            h('span', { className: 'dc-index-hint-inline' },
              `${batch.count} ${t('items')} · ${formatBytes(batch.bytes)}${batch.hasManifest ? '' : ' · ' + t('restoreNoManifest')}`)),
          h('span', { className: 'dc-index-cell dc-index-count' }, String(batch.count)),
          h('span', { className: 'dc-index-cell dc-index-size' }, formatBytes(batch.bytes)),
          batch.hasManifest
            ? h('button', {
                type: 'button',
                className: 'dc-btn dc-btn--ghost dc-index-restore',
                disabled: busy,
                onClick: () => onRestoreBatch(batch.id),
              }, t('restoreBatch'))
            : h('span', { className: 'dc-index-cell' }))
      }

      const entryRow = (batch) => (entry) => h('div', { key: entry.name, className: 'dc-index-row dc-q-row' },
        h('span', { className: 'dc-index-cell dc-index-cb' }),
        h('span', { className: 'dc-index-cell dc-index-path', title: entry.path ?? entry.name },
          h(Icon, { name: 'file', size: 11 }),
          h('span', { className: 'dc-index-name' }, entry.path ? shortPath(entry.path, home) : entry.name)),
        h('span', { className: 'dc-index-cell dc-index-size' }, formatBytes(entry.bytes)),
        entry.restorable
          ? h('button', {
              type: 'button',
              className: 'dc-btn dc-btn--ghost dc-index-restore',
              disabled: busy,
              onClick: () => onRestore(batch.id, entry.name),
            }, t('restore'))
          : h('span', { className: 'dc-index-cell dc-index-dec', title: t('reasonTargetExists') }, '—'))

      const body = h('div', { className: 'dc-index-body' },
        batches.map((batch) => h('div', { key: batch.id, className: 'dc-index-group' },
          batchRow(batch),
          h('div', { className: 'dc-index-rows' }, batch.entries.map(entryRow(batch))))))

      return h('div', { className: 'dc-index' }, head, body)
    }

    function BatchBar({ t, entries, picked, annotations, rememberFor, remember, onRemember, onApply, onClear }) {
      const list = entries.filter((e) => picked.has(e.path))
      const bytes = list.reduce((n, e) => n + (e.bytes || 0), 0)
      const counts = {}
      for (const e of list) counts[e.risk] = (counts[e.risk] ?? 0) + 1
      const riskLine = ['high', 'personal', 'caution'].filter((r) => counts[r]).map((r) => `${counts[r]} ${t(r)}`).join(' · ')
      const decided = list.filter((e) => annotations[e.path]?.decision).length
      return h('div', { className: 'dc-batch' },
        h('div', { className: 'dc-batch-info' },
          h('strong', null, t('pickedN').replace('{n}', String(list.length))),
          h('span', { className: 'dc-batch-sep' }, '·'),
          h('span', { className: 'dc-batch-bytes' }, formatBytes(bytes)),
          decided ? h('span', { className: 'dc-batch-decided' }, `· ${t('pickedDecided').replace('{n}', String(decided))}`) : null),
        riskLine ? h('span', { className: 'dc-batch-risk' }, riskLine) : null,
        rememberFor
          ? h('label', { className: 'dc-batch-remember', title: t('rememberHint') },
              h('input', { type: 'checkbox', checked: remember, onChange: (ev) => onRemember(ev.target.checked) }),
              t('remember'))
          : null,
        h('div', { className: 'dc-batch-actions' },
          h('button', { type: 'button', className: 'dc-btn', onClick: () => onApply('keep') }, t('keep')),
          h('button', { type: 'button', className: 'dc-btn', onClick: () => onApply('delete') }, t('delete')),
          h('button', { type: 'button', className: 'dc-btn', onClick: () => onApply('unsure') }, t('unsure')),
          h('button', { type: 'button', className: 'dc-btn dc-btn--ghost', onClick: onClear }, t('clearPick'))))
    }

    function Stat({ value, label, tone }) {
      return h('div', { className: 'dc-stat', 'data-tone': tone, 'data-nz': Number(value) > 0 ? 'true' : 'false' },
        h('span', { className: 'dc-stat-v' }, value),
        h('span', { className: 'dc-stat-k' }, label))
    }

    function Rail({ t, state, view, selectedEntry, annotation, note, noteState, hiddenTiles, onNote, onDecide, onOpen, onClose, onSelect, onShowList, onLocate }) {
      const [copied, setCopied] = React.useState(false)
      const copiedTimer = React.useRef(null)
      React.useEffect(() => () => clearTimeout(copiedTimer.current), [])
      const entries = state?.entries ?? []
      const annotations = state?.annotations ?? {}
      const plan = state?.plan
      const total = entries.reduce((n, e) => n + (e.bytes || 0), 0)
      const reviewed = plan ? plan.entries - plan.unreviewedCount : 0
      const pctReview = plan && plan.entries ? Math.round((reviewed / plan.entries) * 100) : 0

      if (!selectedEntry && state?.scanning && entries.length === 0) {
        return h('aside', { className: 'dc-rail dc-rail--overview' },
          h('div', { className: 'dc-rail-sec' },
            h('div', { className: 'dc-rail-title' }, t('progress')),
            h('div', { className: 'dc-rail-note' }, `${t('scanning')}…`),
            h('div', { className: 'dc-bar' }, h('i', { style: { width: '35%' } }))))
      }

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
              : null,
            view === 'tree'
              ? h('button', { type: 'button', className: 'dc-rail-link', onClick: onShowList }, t('showList'))
              : null),
          h('div', { className: 'dc-rail-sec dc-hints' },
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'Space'), t('hintSpace')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'K D U'), t('hintKeys')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, '←↑↓→'), t('hintArrows')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'Enter'), t('hintEnter')),
            h('span', { className: 'dc-hint' }, h(Kbd, null, 'Esc'), t('hintEsc')),
            view === 'tree' ? h('span', { className: 'dc-hint dc-hint--plain' }, t('hintDrag')) : null))
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
          h('div', null, h('span', { className: 'dc-k' }, t('bytes')), h('span', { className: 'dc-v', title: e.partial ? t('partialHint') : undefined }, `${e.partial ? '≥ ' : ''}${formatBytes(e.bytes)}`)),
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
          : null,
        onLocate && e.path !== state?.root && !entries.some((x) => x.path === e.path)
          ? h('button', { type: 'button', className: 'dc-btn dc-btn--wide', onClick: () => onLocate(e.path) },
              h(Icon, { name: 'layers' }), t('locate'))
          : null)
    }

    function Page({ t }) {
      const [state, setState] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [selected, setSelected] = React.useState(null)
      const [picked, setPicked] = React.useState(() => new Set())
      const [view, setView] = React.useState(() => {
        try { return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'tree' } catch { return 'tree' }
      })
      const [marquee, setMarquee] = React.useState(null)
      const [pickMenu, setPickMenu] = React.useState(false)
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [exportOpen, setExportOpen] = React.useState(false)
      const [remember, setRemember] = React.useState(false)
      const [index, setIndex] = React.useState(null)
      const [quarantine, setQuarantine] = React.useState(null)
      const [quarantineRev, setQuarantineRev] = React.useState(0)
      const [restoring, setRestoring] = React.useState(false)
      const [zoomK, setZoomK] = React.useState(1)
      const [pan, setPan] = React.useState({ x: 0, y: 0 })
      const [zoom, setZoom] = React.useState(null)
      const [preview, setPreview] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [note, setNote] = React.useState('')
      const [noteState, setNoteState] = React.useState('')
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

      React.useEffect(() => {
        try { window.localStorage.setItem(RAIL_KEY, railOpen ? '1' : '0') } catch { /* ignore */ }
      }, [railOpen])

      React.useEffect(() => {
        try { window.localStorage.setItem(VIEW_KEY, view) } catch { /* ignore */ }
        setMarquee(null)
        setHover(null)
        setPickMenu(false)
      }, [view])

      React.useEffect(() => {
        if (view !== 'index') return undefined
        let alive = true
        fetchJson(PATHS.patterns)
          .then((data) => { if (alive) setIndex(data) })
          .catch((e) => { if (alive) setError(String(e.message ?? e)) })
        return () => { alive = false }
      }, [view, state?.patternsAt])

      const loadQuarantine = () => {
        // 隔离区很小（一个目录列表）：挂载时拉、打开视图时再拉、恢复后重拉
        fetchJson(PATHS.quarantine)
          .then((data) => setQuarantine(data))
          .catch(() => { /* 读不到不影响主流程 */ })
      }
      React.useEffect(() => { loadQuarantine() }, [quarantineRev])
      React.useEffect(() => { if (view === 'quarantine') loadQuarantine() }, [view])

      const restoreQuarantine = async (batch, name) => {
        setRestoring(true)
        try {
          const res = await postJson(PATHS.quarantine, name ? { batch, name } : { batch })
          const failed = (res.results ?? []).filter((r) => !r.ok)
          if (failed.length > 0) {
            const reason = {
              already: t('reasonAlready'),
              missing: t('reasonMissing'),
              'target-exists': t('reasonTargetExists'),
              'cross-device': t('reasonCrossDevice'),
              'no-manifest': t('restoreNoManifest'),
              'bad-name': t('reasonBadName'),
            }[failed[0].reason] ?? failed[0].reason
            setError(`${failed[0].name}：${reason}`)
          } else {
            setError(null)
          }
          if (res.restored > 0) {
            setNote(t('restoreDone').replace('{n}', String(res.restored)))
            setTimeout(() => setNote(''), 1600)
          }
          setQuarantineRev((v) => v + 1)
        } catch (e) {
          setError(String(e.message ?? e))
        } finally {
          setRestoring(false)
        }
      }

      React.useEffect(() => {
        if (!pickMenu && !settingsOpen && !exportOpen) return undefined
        const close = () => { setPickMenu(false); setSettingsOpen(false); setExportOpen(false) }
        window.addEventListener('mousedown', close)
        return () => window.removeEventListener('mousedown', close)
      }, [pickMenu, settingsOpen, exportOpen])

      const railVisible = railOpen || Boolean(selected)
      const annotations = state?.annotations ?? {}
      const entries = state?.entries ?? []
      const byPath = React.useMemo(() => {
        const map = new Map()
        for (const e of entries) map.set(e.path, e)
        if (index) {
          for (const group of index.groups ?? []) {
            for (const e of group.entries) if (!map.has(e.path)) map.set(e.path, e)
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

      const visible = React.useMemo(
        () => (preview ? entries.filter((e) => annotations[e.path]?.decision !== 'delete') : entries),
        [entries, annotations, preview],
      )
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
        return { x: r.x * v.k + v.x, y: r.y * v.k + v.y, w: r.w * v.k, h: r.h * v.k, risk: r.risk }
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

      const pickedGroup = React.useMemo(() => {
        if (picked.size === 0 || !index) return null
        let gid = null
        for (const path of picked) {
          let found = null
          for (const group of index.groups) {
            if (group.entries.some((e) => e.path === path)) { found = group; break }
          }
          if (!found) return null
          if (gid && found.id !== gid) return null
          gid = found.id
        }
        return gid
      }, [picked, index])

      const quar = React.useMemo(() => {
        const batches = quarantine?.batches ?? []
        if (batches.length === 0) return null
        const now = Date.now()
        const withAge = batches.map((b) => ({ ...b, days: b.at ? Math.max(0, Math.floor((now - b.at) / 86400000)) : 0 }))
        return {
          count: quarantine.count ?? 0,
          bytes: quarantine.bytes ?? 0,
          batches: withAge,
          stale: withAge.some((b) => b.days >= 30),
        }
      }, [quarantine])

      const pickRules = React.useMemo(() => {
        const byRisk = (risk) => entries.filter((e) => e.risk === risk)
        const undecided = entries.filter((e) => !annotations[e.path]?.decision)
        const decidedDelete = entries.filter((e) => annotations[e.path]?.decision === 'delete')
        return [
          ...RISK_ORDER.map((risk) => ({
            id: risk, label: risk, risk, count: byRisk(risk).length, paths: byRisk(risk).map((e) => e.path),
          })),
          { id: 'undecided', label: `pickUndecided`, count: undecided.length, paths: undecided.map((e) => e.path) },
          { id: 'delete', label: `plan`, count: decidedDelete.length, paths: decidedDelete.map((e) => e.path) },
        ].filter((r) => r.count > 0)
      }, [entries, annotations])

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
        setZoom({ from, name, risk: from.risk, grow: false, fade: false, at: Date.now() })
        requestAnimationFrame(() => {
          setZoom((z) => (z && z.grow === false ? { ...z, grow: true } : z))
        })
        zoomTimer.current = setTimeout(() => setZoom((z) => (z ? { ...z, fade: true } : z)), 360)
        zoomTimer.current = setTimeout(() => setZoom(null), 560)
      }

      const runScan = async (path, from, name) => {
        if (path && from) playZoom(from, name)
        resetView()
        setBusy(true)
        try {
          const s = await postJson(PATHS.scan, path ? { path } : {})
          applyState(s)
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
          if (remember && pickedGroup) {
            try {
              const s = await postJson(PATHS.config, { rememberRule: { id: pickedGroup, decision } })
              applyState(s)
            } catch (e) {
              setError(String(e.message ?? e))
            }
            setRemember(false)
          }
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

      const download = (name, text, type) => {
        const blob = new Blob([text], { type })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        URL.revokeObjectURL(url)
      }

      const exportPlan = async () => {
        try {
          const plan = await fetchJson(PATHS.plan)
          download('disk-canvas-plan.json', JSON.stringify(plan, null, 2), 'application/json')
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const exportList = async () => {
        try {
          const plan = await fetchJson(PATHS.plan)
          download('disk-canvas-list.md', buildMarkdown({ plan, t }), 'text/markdown;charset=utf-8')
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const exportRules = () => {
        const payload = {
          version: 1,
          app: 'dsh-disk-canvas',
          exportedAt: new Date().toISOString(),
          rules: (state?.rules ?? []).map(({ id, decision }) => ({ id, decision })),
        }
        download('disk-canvas-rules.json', JSON.stringify(payload, null, 2), 'application/json')
      }

      const importRules = (file) => {
        if (!file) return
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            const parsed = JSON.parse(String(reader.result))
            const list = Array.isArray(parsed) ? parsed : parsed?.rules
            if (!Array.isArray(list)) throw new Error(t('rulesInvalid'))
            const next = await postJson(PATHS.config, { rules: list.map(({ id, decision }) => ({ id, decision })) })
            applyState(next)
            setError(null)
            setNote(t('rulesImported').replace('{n}', String(list.length)))
            setTimeout(() => setNote(''), 1600)
          } catch (e) {
            setError(String(e.message ?? e))
          }
        }
        reader.readAsText(file)
      }

      const exportScript = async () => {
        try {
          const plan = await fetchJson(PATHS.plan)
          download('disk-cleanup.sh', buildScript({ plan, t }), 'text/x-sh;charset=utf-8')
        } catch (e) {
          setError(String(e.message ?? e))
        }
      }

      const cycle = (current) => (current === undefined ? 'delete' : current === 'delete' ? 'keep' : current === 'keep' ? 'unsure' : 'none')

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
        else if (key === 'u' || key === 'U') decide('unsure')
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
              h('div', { className: 'dc-menuwrap' },
                h('button', {
                  type: 'button',
                  className: `dc-btn dc-btn--ghost${pickMenu ? ' dc-btn--on' : ''}`,
                  onClick: () => setPickMenu((v) => !v),
                  title: t('selectBy'),
                  'aria-expanded': pickMenu ? 'true' : 'false',
                }, h(Icon, { name: 'checklist' })),
                pickMenu
                  ? h('div', { className: 'dc-menu', role: 'menu', onMouseDown: (ev) => ev.stopPropagation() },
                      h('div', { className: 'dc-menu-title' }, `${t('selectBy')} · ${t('selectByHint')}`),
                      pickRules.map((rule) => h('button', {
                        key: rule.id,
                        type: 'button',
                        className: 'dc-menu-item',
                        onClick: () => { pickMany(rule.paths); setPickMenu(false) },
                      },
                      h('i', { className: 'dc-dot', 'data-risk': rule.risk ?? (rule.id === 'delete' ? 'high' : 'unknown') }),
                      h('span', null, t(rule.label)),
                      h('b', null, String(rule.count)))))
                  : null),
              h('div', { className: 'dc-menuwrap' },
                h('button', {
                  type: 'button',
                  className: `dc-btn dc-btn--ghost${settingsOpen ? ' dc-btn--on' : ''}`,
                  onClick: () => setSettingsOpen((v) => !v),
                  title: t('settings'),
                  'aria-expanded': settingsOpen ? 'true' : 'false',
                }, h(Icon, { name: 'gear' })),
                settingsOpen
                  ? h('div', { className: 'dc-menu dc-menu--wide', onMouseDown: (ev) => ev.stopPropagation() },
                      h('div', { className: 'dc-menu-title' }, t('autoScan')),
                      h('div', { className: 'dc-menu-seg' },
                        [[0, 'autoScanOff'], [24, 'autoScanDaily'], [168, 'autoScanWeekly']].map(([hours, label]) =>
                          h('button', {
                            key: hours,
                            type: 'button',
                            className: 'dc-menu-segbtn',
                            'data-on': (state?.config?.autoScanHours ?? 0) === hours ? 'true' : 'false',
                            onClick: async () => {
                              try {
                                const next = await postJson(PATHS.config, { autoScanHours: hours })
                                applyState(next)
                              } catch (e) { setError(String(e.message ?? e)) }
                            },
                          }, t(label)))),
                      h('div', { className: 'dc-menu-title' }, t('rules')),
                      h('div', { className: 'dc-menu-rules-actions' },
                        h('button', { type: 'button', className: 'dc-menu-link', onClick: exportRules }, t('exportRules')),
                        h('label', { className: 'dc-menu-link' }, t('importRules'),
                          h('input', {
                            type: 'file',
                            accept: 'application/json,.json',
                            style: { display: 'none' },
                            onChange: (ev) => { importRules(ev.target.files?.[0]); ev.target.value = '' },
                          }))),
                      (state?.rules ?? []).length === 0
                        ? h('div', { className: 'dc-menu-note' }, t('noRules'))
                        : (state.rules ?? []).map((rule) => h('div', { key: rule.id, className: 'dc-menu-rule' },
                            h('span', { className: 'dc-menu-rule-name' }, groupLabel(state, rule.id)),
                            h('span', { className: 'dc-menu-rule-dec' }, t(rule.decision)),
                            h('button', {
                              type: 'button',
                              className: 'dc-icon-btn',
                              title: t('forget'),
                              'aria-label': t('forget'),
                              onClick: async () => {
                                try {
                                  const next = await postJson(PATHS.config, { forgetRule: rule.id })
                                  applyState(next)
                                } catch (e) { setError(String(e.message ?? e)) }
                              },
                            }, h(Icon, { name: 'close', size: 11 })))))
                  : null),
              h('div', { className: 'dc-views' },
                [['tree', 'grid', 'viewTree'], ['list', 'list', 'viewList'], ['index', 'layers', 'viewIndex'], ['quarantine', 'trash', 'viewQuarantine']]
                  .map(([mode, icon, label]) => h('button', {
                    key: mode,
                    type: 'button',
                    className: 'dc-view-btn',
                    'data-on': view === mode ? 'true' : 'false',
                    title: t(label),
                    'aria-pressed': view === mode ? 'true' : 'false',
                    onClick: () => setView(mode),
                  }, h(Icon, { name: icon }),
                    mode === 'quarantine' && quar?.stale ? h('i', { className: 'dc-view-dot' }) : null))),
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
            view === 'quarantine'
              ? h(QuarantineView, {
                  t,
                  data: quarantine,
                  busy: restoring,
                  home: state?.home,
                  onRestore: restoreQuarantine,
                  onRestoreBatch: (batch) => restoreQuarantine(batch),
                })
              : view === 'index'
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
                        ? h('button', { type: 'button', className: 'dc-btn dc-btn--primary', onClick: () => runScan(), disabled: busy }, t('startScan'))
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
              'data-risk': zoom.risk,
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
              rememberFor: pickedGroup,
              remember,
              onRemember: setRemember,
              onApply: decide,
              onClear: () => { setPicked(new Set(selected ? [selected] : [])) },
            }) : null),
          railVisible
            ? h(Rail, {
                t,
                state,
                selectedEntry,
                annotation,
                note,
                noteState,
                view,
                hiddenTiles: view === 'list' ? 0 : hiddenTiles,
                onShowList: () => setView('list'),
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
              h('i', { className: 'dc-dot', 'data-risk': 'high' }),
              `${t('plan')} ${plan?.deleteCount ?? 0}`),
            h('span', { className: 'dc-plan-item', 'data-tone': 'reclaim' },
              t('reclaim'), h('strong', null, formatBytes(plan?.reclaimBytes ?? 0))),
            h('span', { className: 'dc-plan-item' }, `${t('kept')} ${plan?.keepCount ?? 0}`),
            h('span', { className: 'dc-plan-item' }, `${t('unsure')} ${plan?.unsureCount ?? 0}`),
            h('span', { className: 'dc-plan-item' }, `${t('unreviewed')} ${plan?.unreviewedCount ?? 0}`)),
          h('div', { className: 'dc-spacer' }),
          h('span', { className: 'dc-assure' }, t('neverDelete')),
          quar && quar.count > 0
            ? h('button', {
                type: 'button',
                className: `dc-btn dc-btn--ghost dc-plan-quar${quar.stale ? ' dc-plan-quar--stale' : ''}`,
                title: quar.stale ? t('expireHint') : t('openQuarantine'),
                onClick: () => setView('quarantine'),
              },
              h(Icon, { name: 'trash' }),
              t('quarantineChip').replace('{n}', String(quar.count)),
              h('span', { className: 'dc-plan-quar-bytes' }, formatBytes(quar.bytes)))
            : null,
          h('button', { type: 'button', className: 'dc-btn', onClick: () => setPreview((p) => !p) }, preview ? t('previewOff') : t('previewOn')),
          h('div', { className: 'dc-menuwrap' },
            h('button', {
              type: 'button',
              className: `dc-btn${exportOpen ? ' dc-btn--on' : ''}`,
              onClick: () => setExportOpen((v) => !v),
              'aria-expanded': exportOpen ? 'true' : 'false',
            }, t('exportMenu'), h(Icon, { name: 'chevron' })),
            exportOpen
              ? h('div', { className: 'dc-menu dc-menu--up', onMouseDown: (ev) => ev.stopPropagation() },
                  h('button', { type: 'button', className: 'dc-menu-item', onClick: () => { setExportOpen(false); exportList() } }, t('exportMd')),
                  h('button', { type: 'button', className: 'dc-menu-item', onClick: () => { setExportOpen(false); exportScript() } }, t('exportScript')),
                  h('button', { type: 'button', className: 'dc-menu-item', onClick: () => { setExportOpen(false); exportPlan() } }, t('exportJson')))
              : null)),

        hover ? h(HoverCard, { hover, t, total, cardRef: hoverCardRef }) : null)
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
.dc-zoom[data-risk="safe"]{background:color-mix(in srgb,var(--dc-safe) 40%,var(--dc-surface))}
.dc-zoom[data-risk="caution"]{background:color-mix(in srgb,var(--dc-caution) 40%,var(--dc-surface))}
.dc-zoom[data-risk="personal"]{background:color-mix(in srgb,var(--dc-personal) 35%,var(--dc-surface))}
.dc-zoom[data-risk="high"]{background:color-mix(in srgb,var(--dc-high) 35%,var(--dc-surface))}
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
.dc-q-row{grid-template-columns:20px minmax(0,1fr) 68px 84px}
.dc-q-batch{grid-template-columns:24px minmax(0,1fr) 44px 76px 116px}
.dc-q-age{margin-left:8px;padding:0 6px;height:16px;display:inline-flex;align-items:center;border-radius:999px;
  font-size:10px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dc-q-age--stale{background:color-mix(in srgb,var(--dc-caution) 16%,transparent);color:var(--dsw-alias-state-warn-label)}
.dc-view-dot{position:absolute;top:4px;right:4px;width:5px;height:5px;border-radius:999px;background:var(--dc-caution)}
.dc-view-btn{position:relative}
.dc-plan-quar{height:26px;font-size:11.5px;padding:0 8px}
.dc-plan-quar--stale{color:var(--dsw-alias-state-warn-label)}
.dc-plan-quar-bytes{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dc-q-batch .dc-index-restore{width:100%}
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
.dc-list-decmark[data-decision="keep"]{color:var(--dc-safe);background:color-mix(in srgb,var(--dc-safe) 15%,transparent)}
.dc-list-decmark[data-decision="delete"]{color:var(--dc-high);background:color-mix(in srgb,var(--dc-high) 14%,transparent)}
.dc-list-decmark[data-decision="unsure"]{color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb,var(--dc-caution) 16%,transparent)}
.dc-list[data-compact="true"] .dc-list-dec{text-align:center}
.dc-list-row--head .dc-list-size,.dc-list-row--head .dc-list-share{text-align:right}
.dc-list[data-batch="true"] .dc-list-body{padding-bottom:58px}
.dc-scanline{position:absolute;left:0;right:0;top:0;height:2px;overflow:hidden;z-index:5;background:color-mix(in srgb,var(--dc-personal) 12%,transparent)}
.dc-scanline i{display:block;height:100%;width:28%;background:var(--dc-personal);animation:dc-scan 1.5s ease-in-out infinite}
@keyframes dc-scan{0%{transform:translateX(-100%)}100%{transform:translateX(460%)}}
.dc-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--dsw-alias-label-tertiary);font-size:12px}

/* ---- 方块 ---- */
.dc-rect{position:absolute;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:0;
  padding:0;margin:0;border:0;border-radius:calc(5px / var(--dc-k,1));overflow:hidden;text-align:left;font:inherit;
  color:var(--dsw-alias-label-primary);background:var(--dc-surface);cursor:pointer;
  transition:box-shadow .12s ease,filter .12s ease}
.dc-rect[data-risk="safe"]{--dc-risk:var(--dc-safe);background:color-mix(in srgb,var(--dc-safe) 8%,var(--dc-surface))}
.dc-rect[data-risk="caution"]{--dc-risk:var(--dc-caution);background:color-mix(in srgb,var(--dc-caution) 10%,var(--dc-surface))}
.dc-rect[data-risk="personal"]{--dc-risk:var(--dc-personal);background:color-mix(in srgb,var(--dc-personal) 7%,var(--dc-surface))}
.dc-rect[data-risk="high"]{--dc-risk:var(--dc-high);background:color-mix(in srgb,var(--dc-high) 8%,var(--dc-surface))}
.dc-rect[data-risk="unknown"]{background:var(--dc-surface)}
.dc-rect[data-stripe="true"]::before{content:"";position:absolute;left:0;top:0;bottom:0;width:calc(3px / var(--dc-k,1));background:var(--dc-risk,var(--dc-unknown));opacity:.85}
.dc-tile-in{display:flex;flex-direction:column;align-items:flex-start;gap:calc(1px / var(--dc-k,1));
  padding:calc(6px / var(--dc-k,1)) calc(8px / var(--dc-k,1));min-width:0;max-width:100%;box-sizing:border-box}
.dc-rect[data-stripe="true"] .dc-tile-in{padding-left:calc(11px / var(--dc-k,1))}
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
.dc-rect:hover{box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l4), var(--dsw-shadow-lv1);z-index:2}
.dc-rect:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dc-personal));outline-offset:-2px;z-index:3}
.dc-rect[data-selected="true"]{z-index:4;background-image:linear-gradient(color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent),color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent))}
.dc-rect[data-selected="true"][data-anchor="true"]{outline:calc(2px / var(--dc-k,1)) solid var(--dsw-alias-label-primary);outline-offset:calc(-2px / var(--dc-k,1));box-shadow:var(--dsw-shadow-lv2)}
.dc-mark{position:absolute;right:calc(5px / var(--dc-k,1));top:calc(6px / var(--dc-k,1));z-index:1;
  display:inline-flex;align-items:center;justify-content:center;
  width:calc(15px / var(--dc-k,1));height:calc(15px / var(--dc-k,1));border-radius:999px;
  font-size:calc(9px / var(--dc-k,1));line-height:1;background:var(--dc-surface);
  color:var(--dsw-alias-label-secondary);box-shadow:0 0 0 calc(1px / var(--dc-k,1)) var(--dsw-alias-border-l3);font-weight:600}
.dc-mark--dot{width:calc(6px / var(--dc-k,1));height:calc(6px / var(--dc-k,1));right:calc(4px / var(--dc-k,1));top:calc(4px / var(--dc-k,1));box-shadow:none;background:var(--dsw-alias-label-tertiary)}
.dc-rect[data-decision="keep"] .dc-mark{color:var(--dc-safe);background:color-mix(in srgb,var(--dc-safe) 16%,var(--dc-surface))}
.dc-rect[data-decision="delete"] .dc-mark{color:var(--dc-high);background:color-mix(in srgb,var(--dc-high) 16%,var(--dc-surface))}
.dc-rect[data-decision="unsure"] .dc-mark{color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb,var(--dc-caution) 18%,var(--dc-surface))}
.dc-rect[data-decision="delete"]{background-color:color-mix(in srgb,var(--dc-high) 5%,var(--dc-surface));box-shadow:inset 0 0 0 calc(1.5px / var(--dc-k,1)) color-mix(in srgb,var(--dc-high) 45%,transparent)}
.dc-rect[data-decision="keep"]{box-shadow:inset 0 0 0 calc(1.5px / var(--dc-k,1)) color-mix(in srgb,var(--dc-safe) 55%,transparent)}
.dc-rect[data-decision="unsure"]{outline:calc(1.5px / var(--dc-k,1)) dashed color-mix(in srgb,var(--dc-caution) 70%,transparent);outline-offset:calc(-2px / var(--dc-k,1))}
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
.dc-batch-remember{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer}
.dc-batch-remember input{margin:0;cursor:pointer;accent-color:var(--dsw-alias-label-primary)}
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
