# 工程备忘（实现证据，不属于 README）

## 2026-10-18 · v0 真实装载与浏览器验收（dsh 0.2.1-rc.1）

隔离环境：`DSH_HOME=/tmp/dsh-canvas-verify`，pnpm store/cache 也在 `/tmp`，不碰共享 profile。
安装：`dsh plugin --profile web add ./dsh-disk-canvas-0.1.0.tgz`（tarball 进 profile 树，避免本地目录装在树外）。

### 服务端

- `--dump-config` 末尾出现 `- id: dsh-disk-canvas`；条目无 `Config`，不声明设置命名空间。
- 启动 `dsh web --port 0 --no-open`：日志只有 URL，**无** `entry did not activate`。
- HTTP（带 token cookie）：
  - `POST /plugins/dsh-disk-canvas/scan {"path":"/tmp/dsh-fixture"}` → 3 项，体积 300000 / 120000 / 90000；
  - `POST .../annotate {"path":"…/tmp.log","decision":"delete","note":"测试批注"}` → plan
    `{deleteCount:1, reclaimBytes:90000}`；`GET .../plan` 导出含 risk / claim / note；
  - 跨源 POST（`Origin: http://evil.example`）→ **403**。
- 扫描预算校准（真实主目录 153 GB，`du -sh` 33 s 冷缓存）：
  - 全局 9 s / 12 万条目 → 只出 4.7 GB 且大目录被截断；
  - 改为**按子项切分**（40 万条目 / 20 s 每子项，全局 60 s）→ 直接跑 `scanChildren(HOME)`
    **14 s、146 GB、76 项、仅 1 个目录 partial**；
  - UI 里渐进上屏：2.5 s 时 5.8 GB / 60 项（`Scanning…`），18 s 时 136 GB / 76 项。
- client half：boot HTML 的 `__DSH_BOOT__` 含 `dsh-disk-canvas/client.js`；组合 bundle
  `GET /plugins/??…dsh-disk-canvas/client.js…` → 200、含本插件 id 与样式。
- 单元测试：`npm test`（9 项）覆盖规则分档、计划累计、批注清除、Agent 覆盖、递归体积、渐进状态。

### 浏览器（headless Chrome + CDP，1440×900）

- 侧边栏出现 **Disk Canvas** 图标（aria-label 即面板名），点击后 `main` 页渲染出 `dc-root`。
- 演示目录 `/tmp/dsh-demo`（7 项 / 3.6 GB）：`Library 1.1 GB`（unknown）、`Downloads 700 MB`（unknown）、
  `Movies 600 MB`（high，红）、`Documents 500 MB`（high）、`Projects 400 MB`（high）、`.Trash 300 MB`（safe，绿）。
- 点 `.Trash` → 检视器显示 Safe / Rule / 95%、体积、文件数、改动时间；点 **To delete** →
  方块加红框、计划变成 `1 item · Reclaim 300 MB`；**Preview cleanup** 与 **Export plan** 可点。
- 截图入库：`docs/preview/canvas.png`（README hero）。

### 过程中撞到并修掉的三个真问题

1. `dsh-tools` 的 schema 编译器要求**每个嵌套 object 显式**写 `additionalProperties`，
   否则整个条目 `did not activate`（负控：日志响亮报 `JsonSchemaError`）。
2. 全局条目预算被最大的目录吃光 → 其它子项归零；改成按子项切分 + 全局时间闸。
3. 扫描进行中再点「重新扫描」/换目录会被静默忽略；改成**排队**，当前轮结束后自动重扫。
   同版本重装还必须 `remove` + `add`（pnpm 按 tarball 完整性判等，直接 `add` 不刷新）。

### 2026-10-18 第二轮（preset / 页签 / 配色）

- **preset 随身分发**：patch 里新增 `preset-disk-cleanup`（`@deepseek-ai/dsh-agent-preset`），子行
  `dsh-disk-canvas` + `mode: tools`；宿主行 `mode: host` 提供 `dsh-disk-canvas.api` 服务与路由。
  实测启动无告警；`--dump-config` 里行与子行齐全；模式选择器出现「磁盘整理」（截图确认）。
  踩坑：Cordis 的 `inject` **不支持** `{required, optional}` 写法（会被当成两个服务名），
  可选依赖要用 `ctx.reflect.get(name)` 读取。
- **入口改会话页签**：`conversation.view` 槽（id `dsh-disk-canvas`，order 20），删除 sidebar/main 注册。
  实测 `ctx.slots.entries('conversation.view')` = `[chat, trajectory, dsh-disk-canvas]`；
  页签栏只在非空白会话渲染（`showTabs = tabs.length > 1`），空白首页看不到，发首条消息后出现。
- **配色重做**：新增 `personal`（个人内容，蓝）档，`high` 只留给系统级路径；`unknown` 用中性灰；
  画布底色改 layer-2、方块加 1px 分隔、加五色图例；修正字号/对比与「1 items」单复数。
  因实例没有模型凭据，无法创建非空白会话，页签内画布的最终视觉仍需人工看一眼（见下）。

### 2026-10-18 第三轮（账本 / UX / preset 只读工具）

- **持久化**：新增 `lib/src/ledger.mjs`，`$DSH_HOME/data/dsh-disk-canvas/ledger.json`，原子写、
  800ms debounce、退出 flush；每根目录 20 条 / 90 天 / ≤5MB，只存顶层聚合；标注与 claims 全局
  （按绝对路径），`by: human|agent`。启动时 `ledger.latest(HOME)` → `store.hydrate`，画布秒开。
  实测：扫描 76 项 → 账本 8346 B；标 `/Users/vlln/Project` 为 keep → 账本出现 annotations；
  **重启进程后** `GET /state` 直接返回扫描时间不变的 76 项 + keep=1，没有触发重扫。
- **UX**：面包屑可点、hover 信息卡（240ms 延迟）、键盘（空格循环 / K/D/U / Enter / Esc）、
  标记视觉（斜纹 + ✕ / 绿框 + ✓ / 黄虚线 + ?）、较上次增量 chip 与方块涨跌角标。
- **preset 工具**：加官方只读行 `dsh-tool-fs`（write/edit=false）与 `dsh-tool-fs-search`；
  查询确认 `ctx.fs` 的 workspace 限制只作用于**写/改**，读不受限（fs-sandbox README：
  "preserving the local filesystem's read behavior" / "Reads … work exactly as with fs-local"），
  因此不需要自造磁盘检查工具。
- 测试 13 项全过（新增 ledger 4 项：裁剪 / 增量 / 跨实例持久 / store 接线）。

### 2026-10-18 第四轮（UI/UX：画布 + 检查器）

真实会话里验收（`Greeting` 会话，42 分钟前有 disk-cleanup 的回复）：Chat / Trajectory / **Disk Canvas** 三个页签，
`dc-root` 渲染、68 个方块、1440×900 与 1120×780 两档都看过截图。

- **配色底座**：查了 402 个 `--dsw-*` token 的解析值，发现**浅色主题下 `bg-layer-1/2/3` 全是 `#fff`**
  ——原来「画布 = layer-2、方块 = layer-1」根本没有对比，整块看起来就是白纸。改法：
  画布用 `--dsw-alias-bg-module-platform`（`#f5f6f7`）做凹槽，方块用 `bg-base` 做凸起，靠 2px 间隙出格线。
- **风险色从「整块填充」改成「左侧 3px 色条」**：填充只留 7–10% 的淡色，色条用饱和色。
  `unknown` 不画色条（没信息就不该占视觉注意力）——这一条直接消掉了右下角那坨小方块的「灰泥」。
- **字号按方块尺寸分档**（lg / md / sm / xs）：lg 名字 16px + 体积·占比 + 文件数·改动 + 一句话判断（≤46ch）；
  xs 只剩色块纹理，靠悬停卡与检查器读。之前 640×1080 的大方块里躺着一行 12px 名字，才是「空」的根源。
- **检查器不再是空面板**：没选中时是总览（审查进度条、四档计数、按体积排的待审队列、键位提示），
  选中时是详情（判断 / 依据 / 四项数值 / 三段决定 / 备注 / 进入目录）。
- **决定态**：先用斜纹，实测 90 GB 的大方块被斜纹铺满、字看不清 → 改成 5% 红底 + 1.5px 红框 + ✕；
  保留 = 绿框 + ✓；待复查 = 黄虚线 + ?。
- **布局坑（值得记）**：会话视图区高度**由内容撑开**（`viewArea` 是 `flex:1 0 auto`，不吃剩余空间），
  检查器内容一长就把整页顶下去、底部计划条被输入框盖住。改法：检查器 `position:absolute` 贴在
  `.dc-body` 右侧、画布用 `padding-right` 让位——撑高的来源消失后，页面高度回到 736，计划条不再被压。
  另外 `dc-stats` 一类的栅格如果让检查器自然高度超过 638，也会复发，所以队列是 `flex:1` + 内部滚动。
- **备注自动保存**：`onChange` → 600ms 防抖 → `POST /annotate {path, note}`（不带 decision）；
  切走方块时把未落盘的 timer 先 flush 掉。实测「打字 200ms 后立刻切走」备注仍在服务端
  （`{"note":"临时备注-不该丢","by":"human"}`）。
- **服务端契约改动**：`annotate` 的 `decision` 变为可选（省略 = 只改备注），备注与决定解耦；
  决定清空后备注保留，两者都空才删条目。账本条目新增 `modified`，重启后不再显示「—」。
- **验收读数**：740ms 轮询下 68 方块；空格循环（keep→unsure→none）；←/→ 空间导航到相邻方块；
  Esc 先取消选中再返回上层；检查器开 → 画布 873px / 关 → 1181px；预览模式 68 → 66 方块；
  1120×780 下标题行折成两行（右组自动右对齐），计划条 bottom=642 未被输入框遮挡。
- **小项看不见**：873×638 的画布上，76 项里有 **42 项不足 1 像素**（真实分布 90 GB ↔ 484 KB，
  面积比 1:200000）。试过聚合，但聚合块的面积等于各项之和、一样是 10×10 量级，治不了；
  单层树图对「少量大项 + 长尾」就是这个结果。取舍：画布只负责大项，清单负责全部，
  检查器里明说「{n} 项小于 1 像素，都在上面的清单里」，不假装画布是全量。
- 测试 14 项全过（新增「只写备注不改变决定、也不计入已审」）。
- 截图入库：`docs/screenshot.jpg`（README hero）。

### 2026-10-18 第五轮（框选批量 / 列表视图 / 进入过渡）

- **框选**：画布上 pointerdown → 超过 5px 才算拖，拖起来才 `setPointerCapture`；
  命中判定是「与框有 >1px 交集」（画布类工具的习惯，也照顾大树图里的小块）。
  释放后 `noClick` 抑制随后的 click/dblclick，避免「拖完顺手把方块选中」。
  多选视觉：选中块盖一层 8% 中性遮罩（`background-image`，不动 `background-color`，
  这样风险色和决定边框都还在），锚点单独 2px 描边——22 个相邻方块如果都画描边会变成黑色网格。
- **批量**：新增 `annotateMany`（`paths` 数组，去重 / 拒非绝对路径 / ≤500），
  一次请求写 22 个决定，返回一个 snapshot。批量条浮在画布底部，显示条数、合计体积、
  已定几项、含几个个人/谨慎项。
- **列表视图**：76 项全列（含 42 个不足 1 像素的），列：名称/体积/占比/风险/决定；
  行首复选框 + 表头三态全选。这是「画布只负责大项」的配套——检查器里也给了入口。
- **进入过渡**：双击目录时把该方块的颜色块从原位放大到整张画布（360ms），
  再淡出（200ms），底下换层。返回不做过场（面包屑/向上直接切）。
- **两个真 bug**（都是这轮加交互时冒出来的）：
  1. `onFocus` 里做「选中」→ 每次点击先 focus 再 click，⇧+点击被 focus 那一下重置，
     加选变成单选。删掉 `onFocus`（方向键已经能选中）。
  2. 列表用 `height:100%` 撑在 `flex:1` 画布里，会反过来把会话视图区顶高（页面 736 → 2485），
     底部计划条被输入框盖住。改成 `position:absolute;inset:0`——绝对定位子项不参与父级高度，
     循环断掉，页面回到 736、列表内部滚动。
- 其他：Esc 改成**只做取消**（先取消框选、再清空选择），不再兼「返回上层」——两个语义放一个键上，
  实测很容易在取消选择时误退一层。拖拽结束后 400ms 内不出悬停卡。
- 验收：22 项框选 → 批量 keep → 计划 `Kept 22 / Unreviewed 54`；⇧ 加选 2 项；
  列表全选 76 → 批量条 136 GB；空格把 13 项批量改成 unsure；1120×780 下批量条折成两行仍在画布内；
  进入 Library（8.9 GB / 87 项）过渡帧 685×485 → 871×636。
- 测试 15 项全过（新增批量标注 1 项）。

### 2026-10-18 第六轮（按规则选 / 滚轮缩放 / 列表自适应）

- **按规则选**：顶部菜单按「风险档 + 未审 + 已标待清理」一键选中整档（只作用于当前层），
  计数直接来自当前 entries；选中后走上一轮的批量条。真正的跨层需要递归索引，v0 只存一层，明确不做。
- **滚轮缩放（语义缩放）**：`.dc-viewport` 上 `translate + scale`，方块尺寸/间距跟着放大，
  **文字与内边距按 `calc(1px / var(--dc-k))` 反向缩回去**——屏幕上字号恒为 11–16px。
  好处是放大后 `sz` 分档按「屏幕尺寸」重算，小方块才会冒出名字（294% 时标签数 16 → 21）。
  滚轮以指针为锚点（`x' = cx - (cx - x) * k'/k`），`Alt`+拖 / 中键拖平移，`0` 或右下角 chip 复位。
  缩放状态在换层/换视图时复位；`pointerdown` 只认 `button 0/1`（中键要能起拖）。
- **框选坐标要换算**：方块在缩放层里，pointer 坐标是屏幕坐标，命中判定前 `(p - pan) / k` 还原；
  实测「以方块中心为锚点放大后，在它的屏幕矩形里画框」只选中它一个。
- **列表自适应**：按画布宽度分三档（默认 / <640 / <460），依次收窄数值列、藏风险列、藏占比列，
  紧凑档的决定从文字 chip 换成 ✓/✕/? 圆标（52px 装不下 "To delete"）。
- **踩到的坑（环境）**：`ResizeObserver` 在无头 Chrome + `Emulation.setDeviceMetricsOverride` 下
  **完全不回调**（手写一个 RO 也不回调），导致尺寸状态永远停在挂载时那一档。
  加了 `window.resize` 兜底，并且测试脚本改成「先设尺寸、再 reload」——真浏览器里 RO 正常。
- 验收：1500/1100/880/1000 四档宽度截图；缩放锚点、缩放后框选、Alt+拖平移（-236 → -436）、
  `0` 复位、294% 下标签 21 个；按规则选 Caution 2 项 → 批量条显示 2 项 13.8 GB。

### 2026-10-18 第七轮（跨层索引 / 清单导出 / 悬停跟随）

- **跨层索引**：`scan.mjs` 的遍历从「显式栈 + 目录字符串」改成「显式栈 + 帧对象」，
  目录退出时才把子树汇总交给父级——于是「每个目录的递归体积」是走一遍顺带得到的，
  索引不需要第二次遍历。命中规则只看目录名（`rules.PATTERN_GROUPS`），每类去嵌套重复。
  实测 `~`：node_modules 72 处 / 13 GB、Caches 3 / 7 GB、__pycache__·.venv 48 / 5 GB、
  dist·build·target 450 / 4 GB、Logs 8 / 1 GB，共 581 处 / 27.6 GB。
- **索引的 risk 用「这类目录能不能重建」**，不用路径位置：项目里的 node_modules 按路径判断会落到
  `personal`（个人内容），但它是可重装的依赖目录。改成按 pattern 给 `caution`，批量条才显示
  「72 Caution」而不是「44 Yours · 28 Caution」。
- **扫描预算（重要）**：原来每子项 40 万条目 / 20 秒。`~/Project` 有 82 万文件，
  预算会在遍历中途断掉——断在哪取决于 readdir 顺序，于是**同一个目录两次扫描可能差 10 倍**
  （实测 90 GB → 8 GB，总量 136 GB → 57 GB）。改成 200 万条目 / 40 秒、全局 90 秒后，
  `~` 30 秒扫完 160 GB、`partial: false`，数字稳定。被截断的项在检查器里用 `≥` 标出。
- **清单导出**：新增 Markdown 生成（汇总 + 三张按决定分组的表），UTF-8 下载；JSON 仍在旁边。
  修了两处 i18n：漏掉 `claim` 键（表头直接显示 key）、`1 items` 的单复数。
- **悬停卡跟随**：卡片位置改为 mousemove 时直接写 DOM（不触发 React 重渲染，68 个方块时不掉帧），
  缩放状态下也跟着指针。
- **两个选择状态 bug**（都是跨层路径引起的）：
  1. 「选中项消失就清空」用当前层的 `entries` 判断 → 索引里选中的跨层路径立刻被当成消失，清空选择；
  2. 「剔除失效路径」effects 同样只看当前层 → 同上。两处都改成查统一查找表（当前层 + 索引）。
- 测试 17 项通过（新增：跨层索引只收命中名、嵌套去重与决定同步）。

### 2026-10-18 第八轮（定位 / 记忆规则 / 自动扫描）

- **定位**：索引行双击（或检查器里的「在画布中定位」）→ 记住目标路径 → 扫父目录 → 扫完自动选中它并切回树图。
  失败路径（父目录在根上）直接选中，不扫。
- **记忆规则**：`ledger.rules` 按分组 id 存决定；`finishScan` / `hydrate` 后调用 `applyRules` 补空标注
  （`by: rule`、`rule: groupId`），人工改过的不覆盖；撤销时连带收回它写下的那批。
  **坑**：最初按原始 hits 应用，写进去 577 条（72 条去重后的 node_modules 之外还有嵌套重复），
  改成先用 `dedupeNested` 过滤再应用——和索引里显示的集合保持一致。
- **自动扫描**：`config.autoScanHours`（0/24/168，夹在 0–720），宿主 `setInterval` 重扫上次的根，
  启动时数据比间隔旧就补扫；`ctx.effect` 里清理定时器。dsh 不在跑就不会扫，README 里写明。
- **设置面板**：右上角齿轮，放自动扫描三档 + 记忆规则列表（可撤销）。
- **导出的补充**：`exportPlan().extra` 带上「索引里、不在当前层」的决定，Markdown 多一节
  「索引里的其他层」；否则批量标了 72 个 node_modules，导出的清单里一个都没有。
- **一个自伤 bug**：`buildPatterns` 返回 `{at, truncated, groups}` 丢掉了 `hits`，撤销规则走一遍后
  `state.patterns.hits` 变 undefined，下一次 `setRule` 直接 `hits is not iterable` 500/400。
  改成把 `hits` 一起返回。
- 测试 19 项通过（新增：规则补空/不覆盖/撤销收回、自动扫描间隔夹取）。

### 2026-10-18 第九轮（索引搜索 / 规则导入导出 / 清理脚本）

- **索引搜索**：一个输入框按路径/名字过滤，命中时分组自动展开、组头的处数与体积改成「匹配后」的数，
  「全选这类」也就只选匹配到的那些。
- **规则导入导出**：`disk-canvas-rules.json`（`{version, app, rules:[{id,decision}]}`）。
  导入是**整体替换**：先收回所有 `by: rule` 的标注与旧规则，再按新列表补 —— 实测把规则从
  `node_modules→delete` 换成 `caches→delete + logs→unsure` 后，旧的规则标注全部消失。
- **清理脚本**（第一次给执行面，仍然不删）：
  - `mv` 到 `~/.Trash/dsh-disk-canvas-<ts>/NNN-name`，可逆；
  - 默认 `DRY=1`，`--yes` 才动；不存在的路径跳过；`/` 与 `$HOME` 拒绝；
  - 实测：干净脚本 `sh -n` 通过、演练打印 74 项（2 个当前层 + 72 个索引层）、
    在临时目录上跑 `--yes` 真的移动到隔离区而不是删除；
  - **生成的坑**：脚本行里混着单引号和双引号，用 JS 单引号字符串写会直接语法错误
    （`printf 'skip (gone): %s\n'` 把 JS 字符串截断），改成双引号字符串 + 转义。
- **导出改成菜单**：清单 / 脚本 / JSON 三项（原来两个按钮已经占满计划条），菜单向上展开。
- 测试 19 项仍全过（本轮改动都在客户端与生成器上，服务端只多了 `rules` 整体替换）。

### 2026-10-18 第十轮（隔离区与恢复）

- **脚本写清单**：`mv` 之后追加 `manifest.tsv`（`名字<TAB>体积<TAB>原路径`），`move()` 因此多收一个 bytes 参数。
  实测：生成脚本 → 在临时目录上 `--yes` → 清单两行 → `parseManifest` 解回来与写入一致。
- **`lib/src/quarantine.mjs`**：`parseBatchTime` / `parseManifest` / `listQuarantine` / `restoreQuarantine`。
  列入目录时体积直接取清单里记录的值（不 `du`），逐项算 `restorable`（清单里有原路径且原位置没东西）。
- **恢复语义**：`rename` 移回；三种失败 `already`（隔离区没副本但原位置有）/ `target-exists`（原位置有东西）/
  `cross-device`（EXDEV，不复制）。第一版把「已经移回过」误报成 `missing`，测试写出来才发现，改成先判断原位置。
- **第四个视图**：按批次列出，逐项或整批移回；没有清单的批次明确写「只能在废纸篓里手动找回」。
  网格模板一开始漏了按钮列，「恢复整批」压在数字上，补 `dc-q-batch` 五列模板。
- 测试 24 项通过（新增 `tests/quarantine.test.mjs` 5 项：时间解析、清单解析、列出、整批恢复与重复恢复、无清单拒绝）。

### 2026-10-18 第十一轮（隔离区入口与过期提醒）

- **常驻入口**：计划条加「隔离区 N 项 · X GB」，点了进隔离区视图；`listQuarantine` 只是读一个目录，
  所以挂载时就拉一次，打开视图/恢复后再拉——这样跑完脚本不用切视图也能看到。
- **过期提醒**：批次按目录名的时间戳算天数，≥30 天标琥珀色并给「可以在废纸篓里清空」的提示；
  视图图标上点一个小圆点，计划条入口也变琥珀色。
- **两个小坑**：
  1. 隔离区数据改成「只在 `quarantineRev` 变化时拉」后，切视图不再刷新——脚本可能在 app 开着时跑完，
     于是又加了一条「进入视图时拉一次」的 effect；
  2. 用 mock 造未来时间戳时 `Math.floor((now - at) / 86400000)` 是负数，界面显示「-1 d old」，加了 `max(0, …)`。
- 测试 24 项仍全过（本轮只动客户端）。

### 未完成

- 真实会话里让模型调一次 `disk_canvas_scan` / `disk_canvas_claim`（需要模型凭据与一次对话）。
- Plugins 页里的插件图标视觉验收。
- 真实会话里验证「磁盘整理」preset 只挂 `disk_canvas_*` 工具（工具列表已用 `--dump-config` 核实，未跑模型）。
- 隔离区的 30 天自动清理（现在只是提醒，不自动动手——「自动删」需要另一套契约）。
- 大块独占画布时（本例 ~/Project 占 66%），单层树图天然会有大片留白；要更密需要第二层数据。

## 开发循环（本地）

```sh
npm test
npm_config_cache=/tmp/npm-cache npm pack
DSH_HOME=/tmp/dsh-canvas-verify npm_config_cache=/tmp/pnpm-cache npm_config_store_dir=/tmp/pnpm-store \
  dsh plugin --profile web remove dsh-disk-canvas
DSH_HOME=/tmp/dsh-canvas-verify npm_config_cache=/tmp/pnpm-cache npm_config_store_dir=/tmp/pnpm-store \
  dsh plugin --profile web add ./dsh-disk-canvas-0.2.0.tgz
```

改 client bundle 需要重启 web（`__DSH_BOOT__` 的 bundle 表在启动时组合）。

## 设计取舍记录

- 扫描只做一层 + 下钻，而不是整盘一次渲染：整盘遍历在真实用户机器上不可控，且画布也读不完。
- 渐进上屏优先于「等扫完再画」：大目录等待期间用户能先看已经完成的子项。
- 规则只做确定性判断，且**没有证据就当 `unknown`**；模型的判断必须经 `disk_canvas_claim` 写入并标 `agent`。
- 不做删除/隔离区/撤销：执行面需要另一套契约（确认清单、可撤销、占用检测），v0 刻意留白。
