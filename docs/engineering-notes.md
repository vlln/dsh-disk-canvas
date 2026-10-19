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

### 未完成

- 真实会话里让模型调一次 `disk_canvas_scan` / `disk_canvas_claim`（需要模型凭据与一次对话）。
- Plugins 页里的插件图标视觉验收（画布页的侧栏图标已随截图确认）。

## 开发循环（本地）

```sh
npm test
npm_config_cache=/tmp/npm-cache npm pack
DSH_HOME=/tmp/dsh-canvas-verify npm_config_cache=/tmp/pnpm-cache npm_config_store_dir=/tmp/pnpm-store \
  dsh plugin --profile web remove dsh-disk-canvas
DSH_HOME=/tmp/dsh-canvas-verify npm_config_cache=/tmp/pnpm-cache npm_config_store_dir=/tmp/pnpm-store \
  dsh plugin --profile web add ./dsh-disk-canvas-0.1.0.tgz
```

改 client bundle 需要重启 web（`__DSH_BOOT__` 的 bundle 表在启动时组合）。

## 设计取舍记录

- 扫描只做一层 + 下钻，而不是整盘一次渲染：整盘遍历在真实用户机器上不可控，且画布也读不完。
- 渐进上屏优先于「等扫完再画」：大目录等待期间用户能先看已经完成的子项。
- 规则只做确定性判断，且**没有证据就当 `unknown`**；模型的判断必须经 `disk_canvas_claim` 写入并标 `agent`。
- 不做删除/隔离区/撤销：执行面需要另一套契约（确认清单、可撤销、占用检测），v0 刻意留白。
