# 工程备忘（实现证据，不属于 README）

## 2026-10-18 · v0 真实装载与浏览器验收（dsh 0.2.1-rc.1）

隔离环境：`DSH_HOME=/tmp/dsh-canvas-verify`，pnpm store/cache 也在 `/tmp`，不碰共享 profile。
安装：`dsh plugin --profile web add ./dsh-pancha-0.1.0.tgz`（tarball 进 profile 树，避免本地目录装在树外）。

### 服务端

- `--dump-config` 末尾出现 `- id: dsh-pancha`；条目无 `Config`，不声明设置命名空间。
- 启动 `dsh web --port 0 --no-open`：日志只有 URL，**无** `entry did not activate`。
- HTTP（带 token cookie）：
  - `POST /plugins/dsh-pancha/scan {"path":"/tmp/dsh-fixture"}` → 3 项，体积 300000 / 120000 / 90000；
  - `POST .../annotate {"path":"…/tmp.log","decision":"delete","note":"测试批注"}` → plan
    `{deleteCount:1, reclaimBytes:90000}`；`GET .../plan` 导出含 risk / claim / note；
  - 跨源 POST（`Origin: http://evil.example`）→ **403**。
- 扫描预算校准（真实主目录 153 GB，`du -sh` 33 s 冷缓存）：
  - 全局 9 s / 12 万条目 → 只出 4.7 GB 且大目录被截断；
  - 改为**按子项切分**（40 万条目 / 20 s 每子项，全局 60 s）→ 直接跑 `scanChildren(HOME)`
    **14 s、146 GB、76 项、仅 1 个目录 partial**；
  - UI 里渐进上屏：2.5 s 时 5.8 GB / 60 项（`Scanning…`），18 s 时 136 GB / 76 项。
- client half：boot HTML 的 `__DSH_BOOT__` 含 `dsh-pancha/client.js`；组合 bundle
  `GET /plugins/??…dsh-pancha/client.js…` → 200、含本插件 id 与样式。
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
  `dsh-pancha` + `mode: tools`；宿主行 `mode: host` 提供 `dsh-pancha.api` 服务与路由。
  实测启动无告警；`--dump-config` 里行与子行齐全；模式选择器出现「磁盘整理」（截图确认）。
  踩坑：Cordis 的 `inject` **不支持** `{required, optional}` 写法（会被当成两个服务名），
  可选依赖要用 `ctx.reflect.get(name)` 读取。
- **入口改会话页签**：`conversation.view` 槽（id `dsh-pancha`，order 20），删除 sidebar/main 注册。
  实测 `ctx.slots.entries('conversation.view')` = `[chat, trajectory, dsh-pancha]`；
  页签栏只在非空白会话渲染（`showTabs = tabs.length > 1`），空白首页看不到，发首条消息后出现。
- **配色重做**：新增 `personal`（个人内容，蓝）档，`high` 只留给系统级路径；`unknown` 用中性灰；
  画布底色改 layer-2、方块加 1px 分隔、加五色图例；修正字号/对比与「1 items」单复数。
  因实例没有模型凭据，无法创建非空白会话，页签内画布的最终视觉仍需人工看一眼（见下）。

### 2026-10-18 第三轮（账本 / UX / preset 只读工具）

- **持久化**：新增 `lib/src/ledger.mjs`，`$DSH_HOME/data/dsh-pancha/ledger.json`，原子写、
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
  - `mv` 到 `~/.Trash/dsh-pancha-<ts>/NNN-name`，可逆；
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

### 2026-10-18 第十二轮（定时扫描的两条路）

- 查了 `@deepseek-ai/dsh-schedule` 的类型：它是**会话绑定的提醒投递**（`create(sessionId, …)` 到点把 prompt
  送回原会话），不是「插件后台任务调度器」。所以插件自己的 `setInterval` 保留——它管「数据新鲜」；
  dsh 的 schedule 管「到点让 Agent 汇报」。
- 因此这轮把后者做成了**提示词里的一句话**：preset 人设新增第 (8) 条，让 Agent 在用户想定期看时用 `schedule`
  工具建提醒，而不是自己循环扫描。没有新增代码路径，也没有伪造一个「已接入 Automation」的说法。
- Linux / Windows 这轮没动：本机只有 macOS，改 Trash 路径与规则却无法验证，宁可不写。
  真要支持，第一步是把 `~/.Trash` 换成平台查询（Linux 走 XDG Trash，Windows 走回收站 API），
  第二步是把 `~/Library`、`.Trash` 这些规则按平台拆表。

### 2026-10-18 第十三轮（提案快照 / 趋势）

- **提案快照**：`GET/POST /proposal`。导出决定、Agent 判断、规则；导入**只补缺**——
  已有决定跳过、已有规则不重复，返回 `{decisions, claims, rules, skipped}` 让界面说清楚导入了什么。
  `annotations` 里带 `imported: true` 便于以后区分来源。
- **趋势**：检查器总览里加一条「近 N 次 +X GB」+ 一条 56×16 的折线，数据来自 `history`（最近 10 次总量），
  鼠标悬停给每次的时间与体积。
- **踩到两个坑**：
  1. `Sparkline` 里写了 `const h = 16`，把 React 的 `h`（createElement）遮蔽了 → 整个 conversation.view
     槽位崩溃、页签直接消失。报错是 `h is not a function`，但表象很像「插件没加载」，
     在无头浏览器里排查了一会儿。
  2. dsh 的 client bundle 是**进程启动时组合**的：改完 `lib/client.js` 只 reload 页面不够，
     必须重启 web 进程（`?rev=` 是组合后的版本号）。这几轮里出现过两次「改了没生效」，
     都是这个原因。以后改 client 一律 `restart → 打开新 tab`。
- 测试 25 项通过（新增提案导入 1 项：只补缺、不覆盖、计划外路径也记下）。

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
  dsh plugin --profile web remove dsh-pancha
DSH_HOME=/tmp/dsh-canvas-verify npm_config_cache=/tmp/pnpm-cache npm_config_store_dir=/tmp/pnpm-store \
  dsh plugin --profile web add ./dsh-pancha-0.2.0.tgz
```

改 client bundle 需要重启 web（`__DSH_BOOT__` 的 bundle 表在启动时组合）。

## 设计取舍记录

- 扫描只做一层 + 下钻，而不是整盘一次渲染：整盘遍历在真实用户机器上不可控，且画布也读不完。
- 渐进上屏优先于「等扫完再画」：大目录等待期间用户能先看已经完成的子项。
- 规则只做确定性判断，且**没有证据就当 `unknown`**；模型的判断必须经 `disk_canvas_claim` 写入并标 `agent`。
- 不做删除/隔离区/撤销：执行面需要另一套契约（确认清单、可撤销、占用检测），v0 刻意留白。

## 2026-10-19 · 1.1.0 语义层（去 classify / 删隔离区 / facet）

产品决定记在 `annotation-canvas/PRODUCT.md`「第十三轮修订」；这里只记实现与验证。

### 实现

- **删掉路径判断**：`classify()`、`SYSTEM`/`PERSONAL` 正则、五档 risk 全部移除。扫描只产出事实
  （bytes / files / latestModified / kind / partial），`PATTERN_GROUPS` 降级为「收集机制」，
  只决定哪些目录名值得记进索引，不再给风险档。
- **语义层** `lib/src/semantics.mjs`：`snapshotOf()` 记录写语义时对象的样子（体积/文件数/日期），
  `semanticState()` 判 `fresh | stale | orphan`。目录按「≥25% 且 ≥1 MB（或 ≥50 个文件）」判变化，
  文件按体积或日期判——刻意不用哈希分桶：桶边界会让 5% 的变化偶尔翻档，看起来像「对象变了」。
  `store.setClaim` 写入时算快照；`pendingSemantics()` 给 Agent 一份「该看哪些」的清单。
- **删隔离区**：删除 `lib/src/quarantine.mjs` + 路由 + 视图（净减 ~300 行）。脚本改为直接
  `mv` 到 `~/.Trash/`（同名加时间后缀），不写 manifest。替换物是**执行台账**：上一轮标了
  `delete`、这一轮扫描里消失的项记一条 `{at, count, bytes, paths}`（每根 20 条），只回答
  「处理过没有、回收多少」，不提供恢复。
- **配色换轴**：方块默认中性；标题行是 facet（Agent 给的 category），点一个高亮该类、其余降饱和
  （`.dc-rect[data-dim="true"]`）。风险色、色条、swatch、legend 全部删除。
- **文案**：`risk` → `category`；检查器显示 `label / claim / evidence / 标注于`，`stale` 时给
  「对象已变化」chip 与提醒。

### 验证（隔离环境）

- `npm test`：24 项通过（新增 `semantics.test.mjs` 5 项、`executions.test.mjs` 2 项；删掉 classify 3 项、
  隔离区 5 项）。
- 隔离站：`DSH_HOME=/tmp/dsh-canvas-verify`，`dsh plugin --profile web add` 安装 1.1.0 tarball，
  `dsh web --port 0` 启动无告警。`GET /state` 正常；`POST /scan {"path":"/tmp/dc-fixture"}` 正常；
  条目里已没有 `risk`，未标注项 `semantic: null`。
- 客户端 bundle：从 `__DSH_BOOT__` 取 `plugins/??dsh-pancha/client.js&rev=…` → 200 / 128 KB，
  含 `dc-facet`、`labeledNote`、`semantic` 标记，说明新代码真的进了 bundle（不是旧包）。

### 浏览器视觉验收（同一轮补上）

隔离站里没有模型凭据，画布页签又只在真实会话里出现；最后走通的路是：

1. 造一个工作区：`storages/workspace.json` 的 `tables.workspaces` 里加一条。
   **路径必须是 realpath**：`/tmp/xxx` 在 macOS 上是 `/private/tmp/xxx` 的符号链接，
   写成 `/tmp/...` 会让 `session/create` 报 `workspace-attach-failed`（its cwd resolves to '/private/tmp/...'）。
2. 打开 UI →「选择工作区」→ 选它：`session/create` 成功，会话自动建好，composer 出现。
3. 发一条消息（模型会因假 key 失败，但会话已经落盘、页签已经渲染）：对话 / 轨迹 / 磁盘画布。
4. 为了让 facet 有内容，直接往账本写 4 条 `claims`（含 `m` 快照），重启宿主；
   其中一条故意把 `m.bytes` 改大，用来验「对象已变化」。
5. 截图脚本：`.verify/dc-semantics/`（zh-1440 / en-1440 / zh-900 / zh-390 / facet / inspector / stale）。

结果：1440 与 900 无横向溢出；facet 点击后 2 个非该类方块降饱和；检查器显示
「类别 / Agent 标注 / 一句话 / 标签 / 依据 / 标注于」；过期项带琥珀「对象已变化」；
en 界面里 facet 仍是 Agent 写的中文词（预期：分类词是内容，不翻译）。
控制台无 error。

### 记一笔 390 的行为

390 宽时右侧检查器（`padding-right:308px`）把画布挤到近 0，总览里出现「4 项小于 1 像素」。
列表仍可用，但这句提示在移动宽度下是误导。下一轮候选：容器宽度 < 560 时让检查器变成抽屉/覆盖层，
而不是挤画布——属于窄屏交互债，与本次语义改造无关。

### 其他坑

- `npm pack` 在本机因 `~/.npm` 属主是 root 会失败：用 `npm_config_cache=/tmp/dc-npm-cache npm pack`。
- 同版本重装必须 `remove` + `add`；本次换了版本号所以直接 `add` 生效。
- 会话侧边栏只认 `workspace.json` 的 `sessionIds` + `session_projcache`；手工往 sessions 目录塞文件不会被列出来。


## 2026-10-19 · 1.1.1 颜色与 token（视觉反馈后的一轮）

用户看过 1.1.0 的截图后："太白，没有区分度"。原因是上一轮把颜色全部撤掉又只留了「选中时才降饱和」，
默认态就是白底白块，只差 1% 亮度。

### 做法

- **加一层插件自己的设计 token**（`.dc-root` 里定义，组件只引用）：
  面 `--dc-surface/recess/line/edge`、字 `--dc-ink-1/2/3`、决定 `--dc-mark-keep/delete/unsure`、
  类别 `--dc-hue-0…7`、强度 `--dc-facet-fill/edge/dim`、形状 `--dc-r-tile/chip`、时长 `--dc-t-*`。
  规则：组件不写颜色字面量。
- **类别色常驻**：填充 8% + 左侧 3px 色条（72% 强度）。未标注 = 白底 + 虚线框，和「看过了但普通」区分开。
- **色号落账本** `facetHue`：第一次见到该类别时取最小空位，之后固定；8 格用完退回中性。
  不这么做的话，新加一个类别会让整盘颜色重排，「橙色=安装包」刚记住就失效。
- **选中 facet 改成灰度**（`filter:grayscale(1)` + 0.76 不透明度），不再用大幅降透明——
  降透明像禁用态，灰度还读得清。
- 决定仍用饱和色（✓/✕/?）；类别只用低饱和填充，两套色不抢。

### 验证

- 单测 27 项（新增 `facets.test.mjs` 3 项：稳定分配、跨实例持久、超过 8 类退化 -1）。
- 浏览器实测（`.verify/dc-colors/`：zh-1440、facet 选中、en-1440、en-900）：
  6 个方块的 `background-color` 计算值分别为白 / 淡蓝 / 淡青 / 淡绿，色条与 chip 色块一致；
  选中「个人内容」后其余 4 块灰度；900 宽无横向溢出；控制台无 error。
- 未验证：暗色主题。当前色板按浅色背景调的（8% 混白），换深色底需要再调一次强度。


## 2026-10-19 · 1.2.0 扫描原因与缓存优先

- `POST /scan` 增加 `reason`（navigate / refresh / schedule / agent / boot）。只有后四种调用
  `store.finishScan` 的「测量」分支：写 `appendScan`、算 delta、推进执行台账；`navigate` 只更新画面。
- **缓存优先**：`openRoot()` 在 `navigate` 时先 `ledger.latest(root)` 秒开（`fromCache: true`），
  超过 10 分钟才在后台重扫；后台重扫用 `startScan(root, { keep: true })`，新结果先进 `pendingEntries`，
  扫完一次替换——不再白屏。
- 顶部加「缓存 · N 分钟前」chip（`fromCache` 或数据超过 60 秒时出现，点一下就是 refresh）。
- 死过一次的教训：`startScan` 里 `entries = []` 会让「后台刷新」变成白屏，所以刷新路径必须走 keep。
- 验证：隔离站 `POST /scan` 实测 refresh → history 8，navigate → history 仍 8 且 `fromCache=true`，
  再 refresh → 9；单测 30 项（新增 `scan-reason.test.mjs` 3 项）。
- 截图 `.verify/dc-colors/zh-1440-cache.png`（标题行的缓存 chip）。

## 2026-10-19 · 1.3.0 导出面收缩

用户的判断：导出的大多数东西是「本机某时刻的切面」，落盘就开始漂。按这个收缩：

- **清单不再落文件**：改成「复制清单」进剪贴板（剪贴板不可用才退回下载）。清单头部加一句
  「这是一份快照，不是活数据；画布永远读账本里最新的那份」。
- **删掉 JSON 计划导出**：`GET /plan` 还在（给脚本/工具），界面不再提供第二份会过期的副本。
- **删掉规则导出/导入**：规则跟着提案快照走，提案导入是合并语义；两套 handoff 通道只留一套。
- 现在导出只有两个产物：清单（剪贴板）+ 清理脚本（唯一执行通道）。

顺带修掉一个真 bug：`note` 状态是检查器里的批注输入框，却被导入提案时当 toast 用——
成功提示会直接写进批注。新增独立 `toast` 状态与 `.dc-toast`（2 秒消失，`role=status`）。

验证：菜单 DOM = 「复制清单 / 清理脚本 / 提示」；`navigator.clipboard.readText()` 拿到的 Markdown
含「这是快照」一行；复制后出现 toast「清单已复制」；控制台无 error。

## 2026-10-19 · 1.3.1 窄屏：检查器改成浮层

- 之前 390 宽时 `padding-right:308px` 把画布挤到近 0，总览还写着「4 项小于 1 像素」。
- 现在 `.dc-root` 是容器（`container-type: inline-size`），`@container (max-width: 560px)` 下：
  不选中 → 检查器不显示、画布满宽；选中 → 检查器变成浮层（inset 8px + shadow），可以点关闭。
- `.dc-body` 上加 `data-rail="open|none"` 让 CSS 知道「有没有选中」——容器查询本身读不到状态。
- 验证：390 宽画布 295px（原来近 0）、无横向溢出；选中 old.dmg 后浮层出现、关闭按钮可用；
  1440 宽行为不变。截图 `.verify/dc-colors/zh-390-canvas.png` / `zh-390-sheet.png`。


## 2026-10-19 · 1.4.0 分档提案（schema + 工具，先不碰画布 UI）

Agent 原来只能逐条写语义，不能给选项。这轮补上「提案」的数据模型与工具：

- `store.setProposal({ tiers })`：2–3 档，每档 `{id, name, paths, bytes, rationale, regret}`；
  `bytes` 由当前层的条目算，不在当前层的路径记 0。每根目录保留最近 10 份。
- `store.applyProposal({ proposalId, tierId })`：只标「还没有决定」的项，人做过的决定跳过并计数——
  这是提案与人工判断的边界。应用动作不暴露给 Agent（没有对应工具），它只会提交。
- 工具 `disk_canvas_propose`：给 preset 用，输出每档的条数与体积。
- 画布 UI 这轮刻意没做：先让数据与工具在真实会话里跑通，再决定提案在画布上长什么样
  （候选：计划条上方一排档位按钮 + 「这档会标掉 N 项 / 其中 M 项你已经保留」）。

- `POST /apply { proposalId, tierId }` 已接上（UI 还没接），返回 `{applied, skipped}` + 新快照。
- **踩到的坑**：`state.proposals` 一开始只在 `hydrate` 里载入，`startScan` 换根时忘了读——
  表现是「账本里有提案，画布上永远空」。补了载入并加了一条回归测试。

测试 35 项（新增 `proposal.test.mjs` 4 项：落账本与跨实例、应用只标未决定项、非法输入拒绝、重扫载入）。

隔离站实测：seed 一份两档提案 → `GET /state` 的 `proposals` 有 2 档（1 项/300 KB、3 项/620 KB）；
`POST /apply {p-demo, deep}` → `applied 2, skipped 1`，人标了 `keep` 的 `old.dmg` 没被覆盖。


## 2026-10-19 · 1.5.0 提案改成「直接标」（推翻 1.4.0 的分档对象）

用户的模型：Agent 提出提案就直接改画布——某些块变成待删除，和用户操作完全相同。
所以 1.4.0 的「提案对象 + 档位按钮 + /apply」整块删掉，换成：

- `store.markPaths({paths, decision, note})`：写的是**同一份 `annotations`**，带 `by: agent` 与 `batch`。
  画布、计划统计、✕/✓/? 标记全部和人工操作一致，没有第二种视觉。
- 只补「还没有决定」的项（人标过的 `skipped`），符合「产线不能覆盖人的判断」。
- `store.undoAgentBatch({batch})`：只删 `by=agent && batch=id`；人后来改过的那条 `by` 已变 human，留下。
- 工具 `disk_canvas_mark` 取代 `disk_canvas_propose`；`POST /undo` 取代 `/apply`。
- UI：计划条出现「Agent 标了 N 项 · 撤销这一批」；检查器里多一行「Agent 标的」（只是解释，不换颜色）。
- 「提案快照」改名「审查快照」，避开「提案」一词的两种含义。

测试 35 项（`mark.test.mjs` 4 项：同构写入与计划统计、跳过人的决定、撤销只撤本批、非法输入）。


## 2026-10-19 · 1.6.0 异议 + 复查过滤 + 变更闪烁

- **异议**（产品规则 4 落地）：`store.setObjection({path, note})` 只对「人做过的决定」生效，
  写进 `objections`（按路径），不改决定；`annotate` 里在「决定真的变了」时清掉它（只改备注不算）。
  工具 `disk_canvas_object`；检查器里显示成一条琥珀色的「Agent 不同意」。
- **只看 Agent 标的**：顶部一个 facet 风格的开关，过滤 `visible`，用来复查「AI 标了哪些」。
- **变更闪烁**：监听到新批次 id 时给该批方块加 1 秒描边动画——否则 Agent 标完，画面是「静止地变了」，
  用户会以为自己点错了。首次挂载用 ref 吞掉，不会把历史批次重放一遍。
- 测试 38 项（新增 `objection.test.mjs` 3 项：只对人决定生效/不改决定、决定变化才失效、不能反对自己）。


## 2026-10-19 · 1.7.0 「问这一项」：把对象塞进对话，不新开界面

- 检查器底部加「在对话里问这一项」：把 `解释这一项：<路径>（体积，语义）…` 填进宿主对话的输入框，
  用户按 Enter 发送；填不进去（宿主改版/找不到编辑器）就退回剪贴板并提示。
- **没有做 `disk_canvas_explain` 工具**：`disk_canvas_state` 已经返回每个对象的语义，再开一个
  单对象工具只是重复；真正缺的是「不用手打路径」，也就是这个按钮。
- 踩坑：`execCommand('insertText')` 之后拿旧引用读 `textContent` 会判失败——宿主 React 重渲染后
  节点已经换了。改成等 80ms、重新查询一次编辑器再校验，才返回 `filled`。
- 验证：点按钮后 composer 内容 = 提示词全文，toast「已填进对话框，按 Enter 发送」；无 console error。
  截图 `.verify/dc-mark/zh-1440-ask.png`。


## 2026-10-19 · 1.8.0 整理 v1：移动（第一次有执行面）

- 新增 `lib/src/organize.mjs`：`previewMove` / `executeMove` / `previewMoves` / `executeMoves`。
  护栏全在这里：目标绝对路径、拒绝 `/`、目标已存在跳过、跨盘跳过（比较 `stat.dev`）、
  目标在源内部跳过、目标不是目录跳过；逐项执行，单项失败不影响其它项。
- 账本 `operations`（按路径）+ `moves`（每根目录最近 50 条 from→to）。
- store：`setOperation`（写 op、清同路径的 delete）、`clearOperations`、`finishMoves`（成功后清 op、记 moves）；
  `plan()` 增加 `moveCount/moveBytes`。
- 路由：`POST /organize`、`GET /organize/preview`、`POST /organize/execute`；工具 `disk_canvas_organize` 只登记。
- UI：批量条「移到…」（记住上次目标）、方块 `→ 目录` 角标、计划条「待移动 N 项 · X GB」+「整理预览」弹层、
  执行后 toast。
- 验证：登记 old.dmg → 角标 `→ dc-archive`、计划条「待移动 1 项 · 195 KB」；预览 1 行；
  执行 → toast「已移动 1 项，跳过 0 项」，文件真的到了 `/private/tmp/dc-archive/old.dmg`，角标消失。
  截图 `.verify/dc-organize/`。
- 测试 43 项（organize 5 项：正常/冲突/子目录/逐项/拒绝 `/`）。
- 还没做：反向操作（账本已记 from→to，下一轮可以做「撤销这批移动」）；跨盘；rename/group/archive。


## 2026-10-19 · 1.9.0 反向操作：撤销这批移动

- 账本从「50 条流水」改成「批次」`moveBatches: [{id, at, items, count, bytes}]`（每根最近 10 批）——
  撤销的单位是「一批」，才说得清「撤哪一次」。
- `GET /organize/undo/preview?batch=` 复用 `previewMoves`，把 `from/to` 对调成 `to/dirname(from)`；
  `POST /organize/undo` 复用 `executeMoves`；**全部成功才丢弃批次**，有失败就留着让人重试。
- 坑：`executeMoves` 原来要求 `op === 'move'`，反向 ops 只有 `{path,to}` 会被判 `unsupported`。
  改成「没有 op 就当 move」，并补了一条反向测试。
- 顺手修：`setOperation` 没记 bytes，导致撤销批次里体积都是 0；现在登记时从当前层快照体积。
- 验证：移动 big.zip → 计划条「已移动 1 项 · 撤销这批」→ 预览标题「撤销移动」1 行 →
  执行 toast「已移回 1 项」，文件回到 `/private/tmp/dc-fixture/big.zip`，批次清空。截图 `.verify/dc-organize/`。
- 测试 45 项（organize 7 项）。

## 2026-10-19 · 1.9.1 真实磁盘一轮（home 76 项）

在隔离站扫真实主目录：76 项 / 159 GB / **33 秒**，42 项小于 1 像素（列表视图兜住）。
索引视图同时收出 572 个目录 / 37.6 GB（node_modules 74、build 类 444、Caches 3、pycache 44、Logs 7）。

### 发现的问题（冷启动）

**整层没有语义时，画布变成一片白色虚线框**：68 个方块全是 dashed，看起来像「禁用」而不是「还没标注」。
这是新用户打开画布的第一眼，不能这样。

- 虚线只在「部分标注」时有意义（少数已被解释、多数没有）；整层都没语义就保持中性底。
- 「只看 Agent 标的」在没有任何 Agent 标注时不该出现（一个点了没反应的开关）。
- 侧栏原来只写「语义 0 / 76 已标注」，等于告诉你缺什么却不给动作；改成一句可执行的提示：
  「在「磁盘整理」模式里让 Agent 扫一遍，或选中一项点「在对话里问这一项」」。

### 验证

- 修复后同一屏：虚线 0 / 68、Agent 开关隐藏、提示正确，控制台无 error。
- 截图 `.verify/dc-real/zh-1440-home.png`（修前）/ `zh-1440-home-fixed.png`（修后）、`zh-1440-list.png`、`zh-1440-index.png`。

### 一次教训

`client.js` 是单文件、无类型检查：两次把 `hasAgentMarks` / `labeled` 写在了 `Rail` 作用域、
却在 `Page` 里引用，页面直接白屏（`slot entry crashed`）。改完必须真跑一次页面，
`node --check` 只能保证语法。

## 2026-10-19 · 1.9.2 preset 从模式菜单消失（真 bug）

现象：模式选择器里没有「磁盘整理」，但 `--dump-config` 里 preset 条目齐全，web 日志无报错。

根因：`@deepseek-ai/dsh-tool-fs-search` 的 Config 里 `sampleOverCapGlobResults` 是 **required**（无默认值）。
我们的 preset 没给它 → 子插件 schema 校验失败 → 整个 preset 挂载失败（`record.broken`）→
**客户端把 broken 的 preset 从模式菜单过滤掉**（`dsh-client-ui-agent-preset` 第 1169 行
`presets.filter(p => p.broken === void 0)`），只在设置页显示「加载失败」。服务端 `logger.warn` 也没落到 stderr。

定位方法（下次照做）：
1. 造一个最小 preset（只有 persona）确认机制没坏；
2. 逐个加子插件二分：persona + tool-fs ✅、+ tool-fs-search ❌；
3. 对照 `preset-standard` 的同一子插件配置，发现少了 required 字段。

修复：preset 里补 `config: { sampleOverCapGlobResults: false }`；
新增 `tests/preset.test.mjs` 守住这个字段（漏了不报错，只会「菜单里没有」，很难查）。
顺带把人设里「你没有移动工具」改成现状：可以写语义/决定/异议/登记移动，但执行移动必须用户点。


## 2026-10-19 · 1.10.0 扫描完成后自动补语义

机制：画布把当前会话 `POST /bind` 给宿主；扫描（refresh / schedule）完成后，宿主往该会话投递一条 user 消息
（source kind `disk-canvas`），Agent 被唤醒后自己读 pending 写语义。

- 走 `sessionController.commands.prompt(request, source)`：Remote 那层 `prompt(request, signal)` 会把 source
  固定成 `user`，并用 `signal.throwIfAborted()`——直接把 source 当第二个参数会报 `signal.throwIfAborted is not a function`（踩过）。
- 保护：5 分钟冷却、只在 refresh/schedule 后触发（agent/navigate/boot 不触发，避免自激）、`config.autoAnnotate` 可关。
- 验证：绑定真实 session → refresh 扫描 → `state.auto.error === ''`，会话日志里出现
  「磁盘扫描完成：/private/tmp/dc-fixture（6 项）。其中 2 项还没有语义…」。
- 还没做「边扫边标」：`disk_canvas_scan` 仍然是等扫描完成才返回；要并发得先给工具加 `wait:false`。


## 2026-10-19 · 1.10.1 / 1.10.2 自动触发没生效的两个真原因

用户实测：扫了一次但 Agent 没动。查了 live 实例的会话日志与 `state.auto`：

1. **消息投给了标准模式的会话**：所有 live 会话的 `agentPreset` 都是 `standard`，那条「该补语义了」进去后，
   Agent 找不到 `disk_canvas_*` 工具，只能告诉用户「工具不存在」——还发生在他没看的会话里。
2. **第二扫描被 5 分钟冷却吞了**：第一次（投给 Downloads 会话）成功，第二次 user 主动重扫时 `lastAutoAt` 还在冷却窗口内。

修法：
- 绑定改为 `sessionId → {preset, at}` 的映射，自动触发只挑「最近一次、且 preset 是 disk-cleanup」的会话；
  没有就记 `no disk-cleanup session bound`，不发消息。
- 冷却改成**按 `scannedAt` 去重**：每次新扫描都能触发一次，重复轮询不会。
- 画布把会话的 preset 一起 bind；不是 disk-cleanup 时，冷启动提示改成「切到该模式后扫描一次即可」。

验证：绑 standard → `auto.error = session preset is standard...`，不发；绑 disk-cleanup → 消息进会话日志。

## 2026-10-19 · 1.10.3–1.10.5 三个把画布弄空/弄哑的 bug

1. **点「磁盘画布」空白**：`preset` 变量在 `Page` 里定义、却在 `Rail` 里引用 → `ReferenceError`，
   slot 直接崩（`slot entry crashed in 'conversation.view'`）。修：把 `preset` 作为 prop 传进 `Rail`。
   这是同一类错误第三次（hasAgentMarks / labeled / preset）——单文件 client 改完必须真开一次页面。
2. **自动补语义不触发**：见 1.10.1/1.10.2 两条（preset 门控 + 按 scannedAt 去重）。
3. **Agent 调工具报 `value is not lossless JSON`**：`summarize()` 里 `claim / confidence / source`
   在未标注项上是 `undefined`，工具输出校验拒绝 undefined。修：所有工具返回值过一遍
   `JSON.parse(JSON.stringify(...))`（`lossless()`），并确认 `disk_canvas_state` 正常。

端到端验证（真实会话、真实模型）：自动消息投递 → Agent 调 `state`（成功）→ 12 次 `disk_canvas_claim`
→ 画布上 12/76 项有语义，类别如「项目仓库 / 实验数据 / 系统数据 / 构建产物」，`state=fresh`。
Agent 自己也复述了「只写语义、没有替你做决定」。


## 2026-10-19 · 1.11.0 四项界面收缩

1. **标注索引**取代「跨层索引」：`GET /index` 从语义（claims）生成，按 `category` 分组，
   显示完整路径；嵌套去重只留最上层；不在当前层的路径体积显示 `—`。
   名字匹配的 `patterns` 仍留在扫描里（给 volume 查找 + 记忆规则用），但不再对外暴露。
2. **决策只留两档 + 未选择**：`unsure` 与 `unreviewed` 从 store、导出、计划、键盘、检查器里删掉；
   `plan()` 改为 `deleteCount / keepCount / undecidedCount`。空格循环变成 未选择 → 待清理 → 保留 → 未选择。
3. **删掉「按规则选」**：连同 pickRules、菜单、状态一起删（-60 行）。
4. **导航箭头靠左**：`.dc-top-main` 最前面放 ← → ↑ 三个箭头，带 disabled 状态；
   历史栈在 `navRef` 里（最多 50 层），前进/返回用 `fromHistory` 避免重复入栈；右侧「返回上层」按钮删除。

实测（live 实例，1440）：68 个方块、3 个箭头、无「按规则选」、计划条「待清理 0 / 预计释放 0 B / 保留 0 / 未选择 76」；
索引视图 10 组 / 12 项 / 152 GB，分组名就是 Agent 写的类别；检查器分段变成「保留 K / 待清理 D / 未选择」。


## 2026-10-19 · 1.12.x 五项再收缩

1. **去掉方块左侧 3px 色条**：只保留淡填充，避免「每条边一个颜色」的噪声。
2. **去掉「Agent 标注」chip**：Agent 写的叙述改成一块带底色 + 左边线的 `.dc-agent`，
   和界面文案（标签、字段名）在排版上分开；不靠一个标签说明「这是 AI 写的」。
3. **类别改为封闭词表**：`project / deps / build / cache / installer / media / doc / system / other`，
   `setClaim` 校验，工具参数用 `enum`；旧的中文自由类别按别名迁移（未知归 `other`）。
   自由词表的结果是「几乎每个目录都自成一类」，索引就没法用了。
4. **删除设置菜单**（自动扫描、自动补语义开关、记忆规则、导出/导入快照全部没有入口）；
   `exportProposal/importProposal` 与 `/proposal` 路由一起删除，`记住这类` 从批量条移除。
5. **自动补语义改为每次扫描都触发**（`reason != agent`），不再要求 refresh/schedule。

### 踩坑记录

改 `pickedGroup` 时按「起点到 movePicked」切片，结果 `pickedGroup` 在 `runScan` 之前，
一刀切掉了 `applyState / playZoom / runScan / save / copyList` 等一整段函数，
页面白屏（`runScan is not defined`）。教训：**按函数名切片删除时，先确认两端的顺序**，
删完立刻 `grep -c "const runScan"` 之类做一次结构断言，再继续。


## 2026-10-19 · 1.13.x 执行清理 / 让 Agent 提方案 / 颜色

- **执行清理按钮**：计划条在有 `deleteCount` 时出现「执行清理」→ `/execute/preview` 逐项预览 →
  `/execute` 真正移动。成功项删批注、从当前层移除，并记成批次（复用 `moveBatches`，所以「撤销这批」能移回）。
- **macOS 的坑**：`rename` 到 `~/.Trash` 直接 `EPERM`（TCC 保护）。现在把 `EPERM/EACCES` 映射成长度更明确的
  `denied`，`/execute` 对 denied 项**退到 `$DSH_HOME/trash/<ts>`**，前端提示「系统废纸篓没有权限，已移入插件回收目录」。
  这样按钮在任何权限下都能真的落地，而且仍可撤销。
- **让 Agent 提方案**：`POST /ask` 往绑定的 disk-cleanup 会话投一条「挑一批有把握的标成 delete」的消息，
  和自动补语义共用 `askAgent()`。
- **颜色**：`--dc-facet-fill` 8% → 18%，去掉色条后仍能看出类别。
- **色号迁移 bug**：`facetHue` 里旧的自由类别键占满了 0–7，规范键全被记成 -1，导致所有方块无色。
  现在加载时只保留封闭词表里的键，`-1` 不再被当作有效分配，有空格就重新给。


## 2026-10-19 · 1.14.0 六项修正

1. **扫描中提前触发**：`beginScan` 每完成一个子项就检查，条目 ≥6 且还有 pending 时，向绑定会话投一条
   「扫描进行中，可以先用 `disk_canvas_state { wait:false }`」；`state` 工具新增 `wait` 参数。
2. **备注对 Agent 可见**：`summarize()` 的条目里加了 `note`，人写的备注会随状态一起给模型。
3. **依据溢出**：`.dc-agent-row` 加 `min-width:0` + `overflow-wrap:anywhere`，长路径不再撑出面板。
4. **「只看 Agent 标的」无效**：筛选按 `annotations[].by === 'agent'`，但 chip 的显示条件用的是语义来源，
   两者不一致；现在都以「Agent 做的决定」为准（实测 68 → 4）。
5. **删掉导出**：按钮、菜单、`copyList` / `exportScript` / `buildMarkdown` / `buildScript`、`GET /plan`、
   `store.exportPlan()` 一起删；执行清理改成按钮 + 预览 + 撤销。
6. **待清理颜色丢失**：`.dc-rect[data-facet-i]` 在 `[data-decision="delete"]` 之后定义，同权重后来居上把红色盖掉；
   把 delete 规则移到 facet 之后并加强到 24% 红底 + 2px 红框。

又一次教训：删 `buildScript`–`Sparkline` 时把中间的 `ICONS` / `Icon` 一起删了（白屏，`Icon is not defined`）。
按函数名切片必须确认两端顺序；这次改成「删到 `const ICONS` 之前」并用 `grep -c` 断言关键符号还在。


## 2026-10-20 · 1.14.1 色条与提方案的过程状态

- 方块左侧色条又出现了：上一轮 revert 时把它带回来了，这次连 `.dc-rect[data-facet-i]::before` 两条一起删。
- 「让 Agent 提方案」有过程状态：点击后按钮变「Agent 正在看…」+ 脉冲点、禁用；收到新的
  `agentBatches` 批次时清掉并提示「Agent 标了 N 项」；90 秒没有新批次则收回按钮并提示可以重扫。
  没有新增全局进度条——按钮本身就是进度。


## 2026-10-20 · 1.15.x 详情曲线 / Agent 标记状态 / 去两个入口

- **详情里的体积曲线**：账本本来就按次存了每个根的子项（deltas 用的），新增 `ledger.pathTrends()` 跨根汇总，
  `store` 在 hydrate / scan / finishScan 时写入 `state.trends`，条目带 `trend`；界面 ≥2 个点才画曲线，
  只有 1 次扫描时显示「再扫描一次…」。
  踩坑：一开始只加在 `startScan`，启动走的是 `hydrate`，所以永远空——两处都要写。
- **Agent 标记的状态**：详情 chips 里显示「Agent 标了待清理」，方块/列表的标记角落加一个小 `A`。
- **删掉「进入目录」按钮和 Enter 快捷键**（双击方块仍可进入）；**删掉「在对话里问这一项」**（`askInChat` 一并删）。
- **「让 Agent 提方案」跨页签保持**：`asking` 存 localStorage（{at, batch}），切回画布时若期间出现了新批次
  就直接结束等待并提示；90 秒超时清除。


## 2026-10-20 · 1.16.x 语义压短 + 整理入口 + 修复

- **语义压短**：persona 要求 claim ≤40 字、结论先行、细节进 evidence（≤3 条）；服务端 `setClaim` 超过 120 字直接拒绝
  （让模型自己压短，而不是把长文塞进画布）；界面里超过 90 字的 claim 折叠成 3 行、点击展开。
- **整理入口**：检查器里加「整理」行（目标路径输入 + 按钮）→ 复用 `movePicked` + `openOrganize` 的预览 →
  执行 → 可撤销。persona 也补了一条：整理用 `disk_canvas_organize` 登记、不执行。
- **修 bug**：`onMove` 用在了 `Rail` 里却没在 props 里声明（`onMove is not defined`），已补。
  另一个：`asking` 状态起初被 `s.replace` 打进了 `BatchBar`（同样的 `const [moving...]` 起始行），
  那里没有 `state`，切到多选就会炸；已从 BatchBar 删掉，只留 Page。


## 2026-10-20 · 1.17.x 整理视图

- 整理不再是一个输入框：新增 `organize` 视图（左=当前层、右=目标树），支持拖动、新建/删除文件夹（标记）、
  一键执行。数据是 `{folders, moves}`，存账本；执行时 `mkdir -p` + 逐项移动，成功后清空方案并记成一批。
- 路由：`GET/POST /organize/plan`、`POST /organize/plan/execute`；预览自写（要容忍尚未创建的目录）。
- Sparkline 加 padding 与 fluid 模式，曲线不再贴边溢出。


## 2026-10-20 · 1.18.x 删索引与整理 + 修白屏

- **删掉「跨层/标注索引」**：视图按钮、IndexView、`/index`、`store.labeledIndex`、`tests/index.test.mjs` 全部移除。
- **删掉「整理」**：organize 视图、`/organize/plan*`、`/organize`、`/organize/preview`、`/organize/execute`、
  `disk_canvas_organize` 工具、检查器整理行、批量条移动入口；账本里的 organize 方案也删了。
  保留 `organize.mjs`（清理用的 `previewMoves/executeMoves`）与撤销批次（清理可撤销）。
- **白屏 bug**：`Sparkline` 的参数叫 `h`，把 createElement 的 `h` 遮住了——点开带历史曲线的条目
  `h is not a function`，整个 slot 崩掉。改名 `height` 后恢复。
- 删代码时又切掉了 `applyState/playZoom/navRef/runScan/save/pickMany`（`navRef is not defined` 白屏），
  从 HEAD 恢复；教训同前：按函数名切范围，删完立刻跑关键符号的 `grep -c`。


## 2026-10-20 · 1.19.0 侧边栏入口

- 新增 `main` 槽位页面（key = `disk-canvas-home`）与 `sidebar.panellist` 条目（order 30），
  和「自动化任务」同栏；点击直接进整页画布，不再需要先有会话页签。
- 页面自己选会话：每 2.5s 读 `ctx.sessions.list.getSnapshot()`，优先选 preset 为 `disk-cleanup` 的会话，
  选择存 localStorage；绑定后自动补语义/提方案才有目标。
- 会话页签入口保留。


## 2026-10-20 · 1.20.0 一次性会话

- 新路由 `POST /session`：宿主用 `sessionController.commands.create({ cwd: HOME, agentPreset: 'disk-cleanup' })`
  建一个**不挂工作区**的会话，返回 `{sessionId, preset}`；因为不在 workspace 里，左侧列表看不到它。
- 画布首页在没有任何绑定会话时自动调用一次，并把 id 记进 localStorage；下次打开复用它。
- 实测：打开首页后自动出现 `session-…`、画布正常、`auto.sessions` 里有它（preset=disk-cleanup），
  左侧列表没有新增行。


## 2026-10-21 · 1.21.x 去掉 preset + 嵌入对话

- **B 方案**：删掉 `disk-cleanup` preset，`disk_canvas_*` 工具改为挂在 profile 顶层的 `mode: tools`，
  默认会话即可用；一次性会话默认 preset（standard）；宿主不再按 preset 过滤绑定；约束改由每条投递消息
  的提示词携带（`[磁盘画布] …`）。代价：Agent 有能力改文件，只是被要求不改。
- **嵌入对话**：`GET /transcript?sessionId=` 从宿主 `ctx.sessions.get(id).snapshotEvents()` 里抽
  `agent/inbox/spliced`（用户）与 `assistant/message`（助手）的纯文本；`POST /say` 走同一个
  `askAgent`（带画布约束）。画布页右上角「对话」打开 340px 抽屉，2s 轮询。
- 实测：抽屉里发一句话，用户消息与助手回复都出现；助手也确认自己「能读写文件」——正是 B 的软约束。


## 2026-10-21 · 1.22.x 对话抽屉样式

- 重做抽屉样式：360px、角色标签、助手无气泡 + 用户右对齐气泡、语气与字号贴近 dsh 对话页；
  运行中显示「Agent 正在处理」+ 三点动画；新消息自动滚到底；输入区改成 composer（圆形发送按钮）。
- 上下文前缀（`[磁盘画布] …`）用 `\n\n---\n\n` 与用户话分隔，`/transcript` 只显示分隔符之后的部分，
  所以记录里看不到提示词。
- `/transcript` 额外返回 `running`，前端据此显示打字指示。


## 2026-10-21 · 2.0.0 改名「盘查」+ 去页签

- 包名/插件 id/服务名/路由前缀/账本目录统一改为 `dsh-pancha`；`$DSH_HOME/data/dsh-disk-canvas`
  自动认领到 `data/dsh-pancha`（rename，失败则 copy）。
- 删掉 `conversation.view` 页签：盘查现在是侧边栏整页（`main` + `sidebar.panellist`）。
- 对话入口从页头移到画布工具栏（「对话」按钮，chat 图标），同时保留页头按钮。
- 版本跳到 2.0.0，因为包名与数据目录都变了。


## 2026-10-21 · 2.1.x 对话 markdown + 侧边栏图标

- 助手消息走极简 markdown：代码块、标题、`- ` / `1. ` 列表、**粗体**、`行内代码`（只渲染文本节点，不注入 HTML）。
- 列表项把行内内容包进一个 span，否则 flex 会把每个 inline 元素当成独立 flex item（文字被拆行）。
- 对话面板 `overflow:hidden` + 各层 `min-width:0`，长代码块不再撑破 360px 面板。
- 侧边栏入口改用 `PanchaGlyph`：与 `icon.svg` 同构的描边 treemap（大块 + 右侧两块），不再用通用 grid 图标。


## 2026-10-22 · 2.4.x 细节打磨

- 概览面板删除「最大的待审」列表（树图本身就能看出大小），只保留进度、趋势、隐藏项说明与「在列表里逐项看」。
- 「让 Agent 提方案」加菱形图标（品牌色），按钮内 flex 对齐。
- 面包屑 + 前进/后退/向上 包进一个 `.dc-path` 胶囊：整条路径是一个控件，内部按钮透明、无边框。
- 对话消息卡：1px 边框 + 12px 圆角（assistant 用平台底色、user 用浅色）；注意 `border: 1px solid var(--dc-line)`
  在这个作用域里没生效（自定义属性解析失败），改用 `border-width/style/color` 长写。


## 2026-10-22 · 2.5.0 对话面板整体重做

- 面板变成一张卡片：372px、10px 外边距、1px 边框、14px 圆角、lv1 阴影。
- 输入区改成 composer：外层 `.dc-chat-box` 有边框与聚焦态，textarea 无边框透明，底部一行提示 + 圆形发送按钮。
- 消息卡统一 1px 边框 + 12px 圆角；空态居中；正文行高 1.72。


## 2026-10-22 · 2.6.0 三张卡片统一

- 画布 / 检查器 / 对话三个大面板统一为同一套卡片语言：`--dc-card-r:12px`、1px `--dc-line` 边框、
  `--dc-card-shadow`（lv1）、10px 间距。
- 检查器从绝对定位浮层改成 flex 兄弟列（`.dc-body{gap:10px;padding:10px}`），窄屏仍用媒体查询浮在画布上。
