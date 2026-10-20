# 盘查 · 交互契约（v3）

这份文件是 `dsh-pancha` 对外的稳定面：画布数据、批注、计划、以及「不做什么」的边界。
改这里的任何一条都要带一次真实装载的验证记录。

## 1. 对象

扫描结果是**当前目录的直接子项**（一层），每项：

```jsonc
{
  "path": "/Users/me/Library/Caches",   // 身份：绝对路径，跨轮次、跨重扫稳定
  "name": "Caches",
  "kind": "dir",                         // dir | file
  "bytes": 482344960,                    // 递归体积
  "files": 18234,                        // 递归文件数
  "latestModified": 1750000000000,
  "semantic": {                          // Agent 写的语义；没有就是 null（= 未标注，不是「安全」）
    "label": "Xcode 编译中间产物",        // 短名字，画布上优先显示
    "category": "build",                  // 封闭词表：project/deps/build/cache/installer/media/doc/system/other
    "claim": "删掉会重新编译，源码不受影响",
    "evidence": ["目录里有 Build/Intermediates.noindex"],   // 读了什么，可核验
    "by": "agent",                       // agent | human
    "model": "…",                        // 可空
    "at": 1792387357844,                 // 写这条语义的时间
    "state": "fresh"                     // fresh | stale（对象变了）| orphan（找不到了）
  },
  "partial": false                       // 该子项的遍历被预算截断
}
```

**面积 = 字节，高亮 = 你正在看的那一类，决定 = 标记**。三个通道互不复用，避免读者把「大」误读成「重要」。

插件不判断「这是什么」：语义由 Agent 写入（`label` / `category` / `claim` / `evidence`），人可以覆盖；
没有语义就是「未标注」，不是「安全」。颜色只用于高亮当前选中的 facet，不编码类别。

## 1.5 账本（持久）

扫描快照、决定、标注都存在 `$DSH_HOME/data/dsh-pancha/ledger.json`（原子写，debounce 800ms，
进程退出前 flush）。形状：

```jsonc
{
  "version": 1,
  "roots": {
    "/Users/me": {
      "scans": [                       // 最多 20 条，90 天，全局 ≤5 MB
        { "at": 1792387357844, "totalBytes": 146000000000, "partial": false,
          "entries": [{ "path": "…", "name": "…", "kind": "dir", "bytes": 0, "files": 0, "modified": 1750000000000, "partial": false }] }
      ]
    }
  },
  "annotations": { "/Users/me/Downloads/x.dmg": { "decision": "delete", "note": "…", "by": "human", "at": 0 } },
  "claims": { "/Users/me/Library/Caches": { "claim": "…", "label": "…", "category": "…", "evidence": ["…"], "by": "agent", "at": 0,
                                              "m": { "kind": "d", "bytes": 482344960, "files": 18234, "day": 20347 } } }
}
```

- **扫描是持久周期**：账本跨进程/跨会话存在；启动时用 `latest` 秒开，不自动重扫。
- **导航不是测量**：`navigate` 的扫描只更新当前画面（`fromCache` / `revalidating`），不追加历史，
  也不推进增量与执行台账——否则趋势图记的是「你点了哪里」。
- **决定与标注是全局的**（按绝对路径），不随根目录或会话丢失；`by` 记录是人类还是 Agent 写的。
- **`facetHue` 是「类别 → 色号」的持久映射**（0–7，-1 = 中性色）。类别第一次出现时分配，
  之后跨会话、跨重扫都不变；调色板只有 8 格，用完后新类别退回中性色。
- **`m` 是写语义时对象的样子**（体积/文件数/日期）：下一次扫描拿它比，判断这条语义还能不能复用。
  目录按「≥25% 且 ≥1 MB（或 ≥50 个文件）」判变化，文件按体积或日期判——见 `lib/src/semantics.mjs`。
- **历史只存顶层聚合**，不存整棵树；超限按「条数 → 时间 → 体积」裁剪。

## 2. 人的批注

```jsonc
{
  "path": "/Users/me/Downloads/x.dmg",
  "decision": "delete",                  // 省略 = 只改备注；keep | delete | none（none = 清除决定）
  "note": "装完了，确认不是唯一备份"
}
```

- 批注按 `path` 全局保留，换目录重扫、换会话、重启进程都不会丢（落在账本里）。
- **批量**：`{ paths, decision }` 等价于对每个 path 各写一次（去重、忽略非绝对路径、上限 500），
  框选后一次请求写十几个决定；返回的仍是完整 snapshot。
- **`decision` 可以省略**：即「只写备注」。备注和决定相互独立——先记一笔、晚点再定，
  不会因为还没决定就写不进去；决定清空后备注仍在，两者都空才删掉这条批注。
- 只有 `keep | delete` 计入「已决定」；其余都是「未选择」（带备注但没决定也算）。
- **批注不等于执行**：导出计划只是 JSON，本版本没有任何删除/移动接口。

## 2.5 扫描本身

状态里还有两个扫描字段：`scanning`（正在扫）与 `partial`（有子项被截断）。扫描是**渐进**的：
每完成一个直接子项就上屏一次，客户端在 `scanning` 期间每 1.2 秒拉一次状态。

预算按子项切分（每个子项 40 万条目 / 20 秒，全局 60 秒）——这样最大的目录不会吃光预算，
其它子项不会变成 0。扫描进行中再请求 `scan` 会**排队**，当前这轮结束后自动换根重扫。

## 2.7 配置

当前没有设置界面。`POST /config` 仍接受 `{ autoScanHours }` 与 `{ autoAnnotate }`（API 用），
记忆规则相关字段（`rememberRule` / `forgetRule` / `rules`）是历史接口，没有入口。

## 2.9 执行台账

插件不维护隔离区。清理脚本只把待清理项 `mv` 到 `~/.Trash/`，自己不留清单。

台账由插件自己推：上一次扫描里「你的决定是 `delete`」、这一次扫描里已不存在的路径，
记成一条 `{ at, count, bytes, paths }`（每根目录保留最近 20 条）。它记录的是**「不在了」**，
不区分是脚本移走的、你手动删的、还是被别的程序清掉的。恢复不在插件职责内。

## 2.11 Agent 标注（与人的决定同构）

Agent 通过 `disk_canvas_mark` 写决定，落到的就是人的那份 `annotations`——同样的 `decision`、
同样的计划统计、同样的 ✕/✓/? 标记。区别只在数据里多了两个字段：

```jsonc
{ "decision": "delete", "note": "构建产物，可重建", "by": "agent", "batch": "a1k2j3", "at": 0 }
```

- **只补「还没有决定」的项**：人标过的（保留 / 待清理 / 待复查）跳过并计入 `skipped`。
- **可整批撤销**：`POST /undo { batch }` 只删 `by=agent && batch=id` 的批注；人后来改过的那条
  `by` 已经变回 `human`，不会被撤销。
- `state.agentBatches` 返回最近 3 批 `{id, at, decision, count, skipped, bytes}`，画布用它显示
  「Agent 标了 N 项 · 撤销这一批」。
- 视觉上和人的标注**完全一致**：画布不会用另一种颜色标「这是 AI 标的」。来源只在检查器里
  写一行「Agent 标的」，用途是事后能解释，不是事前吓人。

### 2.12 异议

Agent 可以对「人已经做过的决定」写一句异议：

```jsonc
{ "note": "这块其实是构建缓存，保留会一直占 2 GB", "by": "agent", "at": 0 }
```

- 只写说明，**不改决定**；`state.objections` 按路径返回。
- 人改了决定（decision 真的变了）→ 异议自动删除；只改备注不算改决定。
- 不能对 Agent 自己的标注提异议（那只是它的建议，不需要反对自己）。
- 这是产品 §1 规则 4 的落地：Agent 可以不同意，但必须服从并写明异议。

## 2.14 自动补语义

- 盘查打开时 `POST /bind { sessionId }` 把当前绑定的会话告诉宿主；多开会话时按 sessionId 记一份。
- **每次扫描结束**（`reason != agent`）后，若有 `pending` 项（没语义或已过期），
  宿主往这个会话投递一条 user 消息（source kind `disk-canvas`）：

  > 磁盘扫描完成：/Users/me（76 项）。其中 12 项还没有语义。请用 disk_canvas_state 读取 pending，
  > 挑最有把握的项用 disk_canvas_claim 写语义（带 evidence）；不要替用户做决定，也不要一次标太多。

- 保护：同一次扫描只触发一次（按 `scannedAt` 去重）；`agent` 触发的扫描不触发（避免自激）；
  只投给画布页面绑定的那个会话（最近一次 bind）。
  `state.auto` 暴露 `{bound, sessions, lastAt, enabled, error}` 便于诊断。
- 走的是 `sessionController.commands.prompt(request, source)`——Remote 那层会把 source 固定成 `user`，
  宿主内部可以用自己的 kind，会话日志里能区分「这是画布让我做的」。

## 3. 计划

```jsonc
{
  "deleteCount": 3,
  "keepCount": 1,
  "undecidedCount": 12,
  "reclaimBytes": 1288490188,
  "keepBytes": 48318382080,
  "entries": 18
}
```

## 4. HTTP 面（只读 + 批注）

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/plugins/dsh-pancha/state` | 当前根、条目、批注、计划（首次调用会懒扫描主目录） |
| GET | `/plugins/dsh-pancha/execute/preview` | 清理预览：待清理项 → 废纸篓，逐项冲突检查 |
| POST | `/plugins/dsh-pancha/execute` | 执行清理：移到 `~/.Trash`；TCC 拒绝（EPERM）时退到 `$DSH_HOME/trash/<ts>`，记成可撤销批次 |
| POST | `/plugins/dsh-pancha/ask` | 让绑定的会话按已有语义提一批清理候选（Agent 自己 mark） |
| POST | `/plugins/dsh-pancha/scan` | `{ path, reason }`；`reason` = `navigate` / `refresh` / `schedule` / `agent` / `boot`（缺省 `refresh`）。`navigate` 有快照时直接返回（`fromCache: true`），超过 10 分钟才后台刷新；只有非 `navigate` 才写历史 |
| POST | `/plugins/dsh-pancha/annotate` | `{ path, decision?, note? }` 写决定与备注（省略 `decision` 只改备注）；`{ paths: [...], decision? }` 批量写，≤500 条 |
| POST | `/plugins/dsh-pancha/config` | `{ autoScanHours? }` / `{ rememberRule: {id, decision} }` / `{ forgetRule: id }` / `{ rules: [...] }`（整体替换），返回完整快照 |

POST 面校验同源（`Sec-Fetch-Site` / `Origin` 与 `Host`），并限 64 KiB 请求体。

## 5. 入口与归属

- **盘查**是侧边栏整页（`main` 槽位，key `pancha-home`），不依赖会话页签；
- **工具**挂在 profile 顶层的 `mode: tools` 行，默认会话即可用，通过宿主提供的 `dsh-pancha.api` 服务读写同一份状态；
- 宿主行（`mode: host`）负责扫描、路由与状态；
- 约束（只分析、标注、预览，不改文件）来自每条投递消息里的提示词，是**软约束**——没有工具级隔离。

## 6. Agent 工具

| 工具 | 作用 |
|---|---|
| `disk_canvas_scan` | 扫描目录并返回体积最大的若干项（只读） |
| `disk_canvas_state` | 读当前画布：计划 + 条目 + 人的决定 |
| `disk_canvas_claim` | 给某路径写语义（覆盖旧语义），**不执行删除** |
| `disk_canvas_history` | 读账本历史（最多 20 条）与最近一次增量 |

这些工具挂在默认会话里；默认会话本身还有官方文件/命令工具（**没有工具级隔离**）。

## 7. 不做（v0 明确边界）

- 不删除、不移动、不压缩任何文件；
- 不上传路径或文件清单，不发任何网络请求；
- 不假装知道内容：没有证据的项是 `unknown`，不是「安全」；
- 不自动把人的偏好变成语义（规则泛化需要显式清单，v0 还没做）。
