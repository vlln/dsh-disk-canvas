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
  "risk": "caution",                     // safe | caution | personal | high | unknown
  "claim": "缓存：删除后应用会重建…",     // 一句话判断
  "basis": "缓存规则",                    // 依据（规则名 / Agent 说明）
  "confidence": 0.92,                    // 0–1，规则把握度，不是模型概率
  "source": "rule",                      // rule | agent
  "partial": false                       // 该子项的遍历被预算截断
}
```

**面积 = 字节，颜色 = 风险，决定 = 边框**。三个通道互不复用，避免读者把「大」误读成「重要」。

五档风险只表达「这类对象通常是什么、能不能动」：`safe` 可清、`caution` 需看一眼、`personal` 是你自己的内容、`high` 系统级、`unknown` 没证据。`personal` / `unknown` 不是「可删」。

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
  "claims": { "/Users/me/Library/Caches": { "claim": "…", "risk": "caution", "confidence": 0.9, "by": "agent", "at": 0 } }
}
```

- **扫描是持久周期**：账本跨进程/跨会话存在；启动时用 `latest` 秒开，不自动重扫。
- **决定与标注是全局的**（按绝对路径），不随根目录或会话丢失；`by` 记录是人类还是 Agent 写的。
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

| 产物 | 内容 | 用途 |
|---|---|---|
| `disk-canvas-list.md` | 汇总 + 按决定分组的三张表（+ 「索引里的其他层」一节） | 给人看、贴 issue |
| `disk-cleanup.sh` | 待清理项列表 + `move()` 函数；默认演练，`--yes` 才执行 | 交给用户自己跑 |
| `disk-canvas-plan.json` | 完整计划（含 `extra`） | 给脚本/其它工具 |

脚本的语义（刻意保守）：

- **只移动，不删除**：`mv -- "$p" "$QUARANTINE/NNN-basename"`，隔离区在 `$HOME/.Trash/dsh-disk-canvas-<ts>/`；
- **默认演练**：`DRY=1`，只有第一个参数是 `--yes` 才真正执行；
- 不存在的路径打印 `skip (gone)`；`/` 与 `$HOME` 打印 `refuse` 并跳过；
- 路径用单引号包裹并转义（`'` → `'\''`），带空格的路径安全；
- 生成时跳过含换行的路径（不生成不可读的脚本）。

## 2.9 隔离区

清理脚本在 `$QUARANTINE/manifest.tsv` 里每条写一行：

```
001-node_modules	12400000000	/Users/me/Project/app/node_modules
```

列：`隔离后的名字 <TAB> 记录时的体积 <TAB> 原绝对路径`。

- `GET /quarantine` 读出所有 `dsh-disk-canvas-*` 批次：`{ base, batches: [{ id, at, hasManifest, count, bytes, entries: [{ name, bytes, path, restorable }] }], count, bytes }`。
  目录名的时间戳（`dsh-disk-canvas-YYYYMMDD-HHMMSS`）用来排序；没有 manifest 的批次照样列出来，但 `restorable: false`。
- `POST /quarantine { batch, name }` 用 `rename` 移回原路径：目标已存在 → `target-exists`；
  隔离区里的副本已经没了但原位置有 → `already`；跨磁盘（`EXDEV`）→ `cross-device`（不复制，让你手动处理）。
- 插件只做 `mv`，不删除：清空废纸篓永远是你自己的动作。

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
| POST | `/plugins/dsh-disk-canvas/scan` | `{ path }` 扫描一个目录（默认主目录） |
| POST | `/plugins/dsh-disk-canvas/annotate` | `{ path, decision?, note? }` 写决定与备注（省略 `decision` 只改备注）；`{ paths: [...], decision? }` 批量写，≤500 条 |
| GET | `/plugins/dsh-disk-canvas/patterns` | 跨层目录索引（含每条路径），只在打开「索引」视图时拉一次 |
| GET | `/plugins/dsh-disk-canvas/quarantine` | 列出 `~/.Trash/dsh-disk-canvas-*` 批次（读 manifest） |
| POST | `/plugins/dsh-disk-canvas/quarantine` | `{ batch }` 整批移回 / `{ batch, name }` 单项移回 |
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
| `disk_canvas_claim` | 给某路径写标注（覆盖规则推断），**不执行删除** |
| `disk_canvas_history` | 读账本历史（最多 20 条）与最近一次增量 |

这些工具都只在「磁盘整理」preset 内可见；该 preset 另外挂官方只读文件行：
`@deepseek-ai/dsh-tool-fs`（`write:false` / `edit:false`，留 read / read_image）与
`@deepseek-ai/dsh-tool-fs-search`（glob / grep）。没有 shell、没有写/删工具。

## 7. 不做（v0 明确边界）

- 不删除、不移动、不压缩任何文件；
- 不上传路径或文件清单，不发任何网络请求；
- 不假装知道内容：没有证据的项是 `unknown`，不是「安全」；
- 不自动把人的偏好变成风险等级（规则泛化需要显式清单，v0 还没做）。
