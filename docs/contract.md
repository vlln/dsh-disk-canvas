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
  "risk": "caution",                     // safe | caution | high | unknown
  "claim": "缓存：删除后应用会重建…",     // 一句话判断
  "basis": "缓存规则",                    // 依据（规则名 / Agent 说明）
  "confidence": 0.92,                    // 0–1，规则把握度，不是模型概率
  "source": "rule"                       // rule | agent
}
```

**面积 = 字节，颜色 = 风险，决定 = 边框**。三个通道互不复用，避免读者把「大」误读成「重要」。

## 2. 人的批注

```jsonc
{
  "path": "/Users/me/Downloads/x.dmg",
  "decision": "delete",                  // keep | delete | unsure | none（none = 清除）
  "note": "装完了，确认不是唯一备份"
}
```

- 批注按 `path` 全局保留，换目录重扫不会丢。
- v0 只存内存，不落盘；插件重载即清空。
- **批注不等于执行**：导出计划只是 JSON，本版本没有任何删除/移动接口。

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
| POST | `/plugins/dsh-disk-canvas/annotate` | `{ path, decision, note? }` 写/清批注 |
| GET | `/plugins/dsh-disk-canvas/plan` | 可导出的计划（仍不含执行） |

POST 面校验同源（`Sec-Fetch-Site` / `Origin` 与 `Host`），并限 64 KiB 请求体。

## 5. Agent 工具

| 工具 | 作用 |
|---|---|
| `disk_canvas_scan` | 扫描目录并返回体积最大的若干项（只读） |
| `disk_canvas_state` | 读当前画布：计划 + 条目 + 人的决定 |
| `disk_canvas_claim` | 给某路径写标注（覆盖规则推断），**不执行删除** |

## 6. 不做（v0 明确边界）

- 不删除、不移动、不压缩任何文件；
- 不上传路径或文件清单，不发任何网络请求；
- 不假装知道内容：没有证据的项是 `unknown`，不是「安全」；
- 不自动把人的偏好变成风险等级（规则泛化需要显式清单，v0 还没做）。
