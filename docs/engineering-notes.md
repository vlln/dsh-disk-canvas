# 工程备忘（实现证据，不属于 README）

## 2026-10-18 · v0 首次真实装载（dsh 0.2.1-rc.1）

隔离环境：`DSH_HOME=/tmp/dsh-canvas-verify`，pnpm store/cache 也在 `/tmp`，不碰共享 profile。
安装：`dsh plugin --profile web add ./dsh-disk-canvas-0.1.0.tgz`（tarball 进 profile 树，避免本地目录装在树外）。

已验证：

- `--dump-config` 末尾出现 `- id: dsh-disk-canvas`；`--dump-config-schema` 里该条目存在（无 `Config`，
  不声明设置命名空间）。
- 启动 `dsh web --port 0 --no-open`：日志只有 URL，**无** `entry did not activate`。
- HTTP（带 token 的 cookie）：
  - `POST /plugins/dsh-disk-canvas/scan {"path":"/tmp/dsh-fixture"}` → 3 项，体积 300000 / 120000 / 90000；
  - `POST .../annotate {"path":".../tmp.log","decision":"delete","note":"测试批注"}` → plan
    `{deleteCount:1, reclaimBytes:90000}`；
  - `GET .../plan` 导出含路径、体积、risk、claim、note；
  - 跨源 POST（`Origin: http://evil.example`）→ **403**。
- client half：boot HTML 的 `__DSH_BOOT__` 里出现 `dsh-disk-canvas/client.js`；组合 bundle
  `GET /plugins/??…dsh-disk-canvas/client.js…` → 200、1.5 MB，含本插件的 id 与样式。
- 单元测试：`npm test`（8 项）覆盖规则分档、计划累计、批注清除、Agent 覆盖、递归体积。

负控（意外但有效）：首版工具输出 schema 里嵌套对象缺少显式 `additionalProperties`，boot 日志
响亮报 `JsonSchemaError` + `1 entry did not activate`，证明这条失败路径可见；补上后归零。
`dsh-tools` 的 schema 编译器要求**每个嵌套 object 都显式**写 `additionalProperties`。

## 未完成

- 浏览器里的人工视觉验收（headless Chrome 在活着的 SPA 上 `--dump-dom` 会挂住；需要手动开页面看
  侧边栏图标、树图与检视器）。
- 真实会话里让模型调一次 `disk_canvas_scan` / `disk_canvas_claim`（需要模型凭据与一次对话）。
- 图标视觉验收（先按 36×36 画了树图字形，未在 Plugins 页实看）。

## 开发循环（本地）

```sh
npm test
npm_config_cache=/tmp/npm-cache npm pack
DSH_HOME=/tmp/dsh-canvas-verify npm_config_cache=/tmp/pnpm-cache npm_config_store_dir=/tmp/pnpm-store \
  dsh plugin --profile web remove dsh-disk-canvas
DSH_HOME=/tmp/dsh-canvas-verify npm_config_cache=/tmp/pnpm-cache npm_config_store_dir=/tmp/pnpm-store \
  dsh plugin --profile web add ./dsh-disk-canvas-0.1.0.tgz
```

**注意**：同版本号重复 `add` 不会刷新（pnpm 按 tarball 完整性判等），改完必须 `remove` 再 `add`；
或改版本号。改 client bundle 需要重启 web（`__DSH_BOOT__` 的 bundle 表在启动时组合）。

## 设计取舍记录

- 扫描只做一层 + 下钻，而不是整盘一次渲染：整盘遍历在真实用户机器上不可控，且画布也读不完。
- 规则只做确定性判断，且**没有证据就当 `unknown`**；模型的判断必须经 `disk_canvas_claim` 写入并标 `agent`。
- 不做删除/隔离区/撤销：执行面需要另一套契约（确认清单、可撤销、占用检测），v0 刻意留白。
