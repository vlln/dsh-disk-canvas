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
- 测试 14 项全过（新增「只写备注不改变决定、也不计入已审」）。
- 截图入库：`docs/screenshot.jpg`（README hero）。

### 未完成

- 真实会话里让模型调一次 `disk_canvas_scan` / `disk_canvas_claim`（需要模型凭据与一次对话）。
- Plugins 页里的插件图标视觉验收。
- 真实会话里验证「磁盘整理」preset 只挂 `disk_canvas_*` 工具（工具列表已用 `--dump-config` 核实，未跑模型）。
- 框选批量标记、缩放动画、小方块聚合（「其余 N 项」）——下一轮。
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
