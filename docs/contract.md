# 交互契约（v0）

这份文件是 `dsh-disk-canvas` 对外的稳定面：画布数据、批注、计划、以及「不做什么」的边界。
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
    "category": "构建产物",               // 开放词汇，画布据此聚成 facet
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

扫描快照、决定、标注都存在 `$DSH_HOME/data/dsh-disk-canvas/ledger.json`（原子写，debounce 800ms，
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
  "decision": "delete",                  // 省略 = 只改备注；keep | delete | unsure | none（none = 清除决定）
  "note": "装完了，确认不是唯一备份"
}
```

- 批注按 `path` 全局保留，换目录重扫、换会话、重启进程都不会丢（落在账本里）。
- **批量**：`{ paths, decision }` 等价于对每个 path 各写一次（去重、忽略非绝对路径、上限 500），
  框选后一次请求写十几个决定；返回的仍是完整 snapshot。
- **`decision` 可以省略**：即「只写备注」。备注和决定相互独立——先记一笔、晚点再定，
  不会因为还没决定就写不进去；决定清空后备注仍在，两者都空才删掉这条批注。
- 只有 `keep | delete | unsure` 计入「已审」；带备注但没决定的项仍算未审。
- **批注不等于执行**：导出计划只是 JSON，本版本没有任何删除/移动接口。

## 2.5 扫描本身

状态里还有两个扫描字段：`scanning`（正在扫）与 `partial`（有子项被截断）。扫描是**渐进**的：
每完成一个直接子项就上屏一次，客户端在 `scanning` 期间每 1.2 秒拉一次状态。

预算按子项切分（每个子项 40 万条目 / 20 秒，全局 60 秒）——这样最大的目录不会吃光预算，
其它子项不会变成 0。扫描进行中再请求 `scan` 会**排队**，当前这轮结束后自动换根重扫。

## 2.6 跨层索引

扫描过程中顺带记录「目录名命中清理规则」的目录（不额外遍历），按类分组：

```jsonc
{
  "at": 1792396422487,
  "truncated": false,
  "groups": [
    { "id": "node_modules", "label": "node_modules", "hint": "依赖目录，可由 lockfile 重装",
      "risk": "caution", "count": 72, "bytes": 13100000000, "files": 1200000, "shown": 72,
      "entries": [{ "path": "…/node_modules", "bytes": 1200000000, "files": 80933, "risk": "caution",
                    "claim": "依赖目录，可由 lockfile 重装（node_modules）", "confidence": 0.8,
                    "source": "rule", "decision": null }] }
  ]
}
```

- **匹配的是名字，不是内容**：`node_modules` / `Caches` / `dist|build|out|target|.next|.nuxt|.turbo|.parcel-cache` /
  `__pycache__|.pytest_cache|.mypy_cache|.ruff_cache|.venv|venv|.tox` / `Logs` / `.Trash` / `DerivedData`。
- 同一类里**被其它条目包含的路径会去掉**（外层的 node_modules 已经包含内层，避免合计重复计数）。
- `risk` 取「这类目录能不能重建」而不是路径位置：项目目录里的 node_modules 仍是 `caution`，不会被当成个人内容。
- 每组最多带 200 条明细（`shown`），`count` / `bytes` 始终按全部命中算。
- 快照里只给摘要（无 `entries`），完整索引走 `/patterns`；索引随扫描重建，持久在账本里（只留最近一次）。

## 2.7 记忆规则与自动扫描

```jsonc
{
  "rules": [{ "id": "node_modules", "decision": "delete", "at": 1792397157264 }],
  "config": { "autoScanHours": 168 }
}
```

- **规则**按索引的分组 id 生效：每次扫描结束后，把「还没有任何标注」的同组目录补成规则里的决定，
  标注带 `by: "rule"` 与 `rule: <groupId>`。人工改过的项不会被覆盖（规则只补空的）。
- **撤销**规则会删掉规则本身，同时把 `by: "rule"` 且 `rule` 匹配、且没被改过的标注一起收回。
- **自动扫描** `autoScanHours` ∈ [0, 720]，0 = 关；宿主进程用 `setInterval` 按间隔重扫上一次的根，
  启动时若 `now - scannedAt` 超过间隔会补扫一次。dsh 不在运行就不会扫。
- 导出计划里 `extra.{delete,keep,unsure}` 是「索引里、不在当前层」的那些决定，
  避免批量标了 72 个 node_modules 却导不出来。

## 2.8 导出物

只有两个产物：清单（进剪贴板，不落文件）和清理脚本（唯一的执行通道）。

| 产物 | 内容 | 用途 |
|---|---|---|
| 清单（Markdown） | 汇总 + 按决定分组的三张表（+ 「索引里的其他层」一节） | 复制进 issue / 聊天；**不落文件**，因为它一落盘就开始漂 |
| `disk-cleanup.sh` | 待清理项列表 + `move()` 函数；默认演练，`--yes` 才执行 | 交给用户自己跑 |

`GET /plan` 仍返回完整 JSON（给脚本与其它的工具用），但界面不再提供「导出 JSON」——
它和 HTTP 面重复，留着只是多一个会过期的副本。提案快照（第 2.10 节）另算，它带的是决定与语义，不是体积。

脚本的语义（刻意保守）：

- **只移动，不删除**：`mv -- "$p" "$HOME/.Trash/<name>"`（同名加时间后缀），不再套插件自己的隔离目录；
- **默认演练**：`DRY=1`，只有第一个参数是 `--yes` 才真正执行；
- 不存在的路径打印 `skip (gone)`；`/` 与 `$HOME` 打印 `refuse` 并跳过；
- 路径用单引号包裹并转义（`'` → `'\''`），带空格的路径安全；
- 生成时跳过含换行的路径（不生成不可读的脚本）。

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

## 2.13 整理：移动

与 `annotations` 平行的 `operations`：

```jsonc
{ "/Users/me/Downloads/setup.dmg": { "op": "move", "to": "/Users/me/Archive/Installers",
  "note": "装完了", "by": "human", "batch": "o1a2b3", "at": 0 } }
```

- `to` 是**目录**，文件名不变；同一个对象标了移动就清掉它的 `delete`（意图替代）。
- `POST /organize { paths, to, note }` 登记；`GET /organize/preview` 用只读 `stat` 预演；
  `POST /organize/execute` 才真的移动。
- **别名保护**（逐项检查，单项失败不影响其它项）：目标已存在 → 跳过；跨盘 → 跳过；
  目标在源里 → 跳过；源不存在 → 跳过；目标不是目录 → 跳过。成功项写进账本 `moves`（from/to/at/bytes）。
- 只有 `move` 一种 op。rename / group / archive 见 `annotation-canvas/ORGANIZE.md` 的 v2。

## 3. 计划

```jsonc
{
  "deleteCount": 3,
  "keepCount": 1,
  "unsureCount": 2,
  "unreviewedCount": 12,
  "reclaimBytes": 1288490188,
  "keepBytes": 48318382080,
  "entries": 18
}
```

## 4. HTTP 面（只读 + 批注）

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/plugins/dsh-disk-canvas/state` | 当前根、条目、批注、计划（首次调用会懒扫描主目录） |
| POST | `/plugins/dsh-disk-canvas/scan` | `{ path, reason }`；`reason` = `navigate` / `refresh` / `schedule` / `agent` / `boot`（缺省 `refresh`）。`navigate` 有快照时直接返回（`fromCache: true`），超过 10 分钟才后台刷新；只有非 `navigate` 才写历史 |
| POST | `/plugins/dsh-disk-canvas/annotate` | `{ path, decision?, note? }` 写决定与备注（省略 `decision` 只改备注）；`{ paths: [...], decision? }` 批量写，≤500 条 |
| GET | `/plugins/dsh-disk-canvas/patterns` | 跨层目录索引（含每条路径），只在打开「索引」视图时拉一次 |
| GET | `/plugins/dsh-disk-canvas/proposal` | 提案快照（决定 + 判断 + 规则） |
| POST | `/plugins/dsh-disk-canvas/proposal` | 导入提案：只补缺，返回 `{decisions, claims, rules, skipped}` |
| POST | `/plugins/dsh-disk-canvas/config` | `{ autoScanHours? }` / `{ rememberRule: {id, decision} }` / `{ forgetRule: id }` / `{ rules: [...] }`（整体替换），返回完整快照 |
| GET | `/plugins/dsh-disk-canvas/plan` | 可导出的计划（仍不含执行） |

POST 面校验同源（`Sec-Fetch-Site` / `Origin` 与 `Host`），并限 64 KiB 请求体。

## 5. 入口与归属

- **画布**是会话页签（`conversation.view`，id `dsh-disk-canvas`），任何模式都能打开；
- **工具**只挂在 `磁盘整理` preset（`preset-disk-cleanup`）里：preset 子行以 `mode: tools` 挂同一份包，
  通过宿主提供的 `dsh-disk-canvas.api` 服务读写同一份状态。标准 / PTC / 极简模式看不到 `disk_canvas_*`；
- 宿主行（`mode: host`）负责扫描、路由与状态，无论用哪个模式都在跑。

## 6. Agent 工具

| 工具 | 作用 |
|---|---|
| `disk_canvas_scan` | 扫描目录并返回体积最大的若干项（只读） |
| `disk_canvas_state` | 读当前画布：计划 + 条目 + 人的决定 |
| `disk_canvas_claim` | 给某路径写语义（覆盖旧语义），**不执行删除** |
| `disk_canvas_history` | 读账本历史（最多 20 条）与最近一次增量 |

这些工具都只在「磁盘整理」preset 内可见；该 preset 另外挂官方只读文件行：
`@deepseek-ai/dsh-tool-fs`（`write:false` / `edit:false`，留 read / read_image）与
`@deepseek-ai/dsh-tool-fs-search`（glob / grep）。没有 shell、没有写/删工具。

## 7. 不做（v0 明确边界）

- 不删除、不移动、不压缩任何文件；
- 不上传路径或文件清单，不发任何网络请求；
- 不假装知道内容：没有证据的项是 `unknown`，不是「安全」；
- 不自动把人的偏好变成语义（规则泛化需要显式清单，v0 还没做）。
