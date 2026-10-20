<h1 align="center">盘查 · Pancha</h1>

<p align="center">
把磁盘变成一张可审查、可批注、可执行的盘面。<br/>
Agent 负责看懂每个目录，你负责做决定，执行前一定先预览。
</p>

<p align="center">
<a href="https://github.com/vlln/dsh-pancha/stargazers"><img src="https://img.shields.io/github/stars/vlln/dsh-pancha?style=flat" alt="stars"></a>
<a href="https://github.com/vlln/dsh-pancha"><img src="https://img.shields.io/badge/dsh-0.2.x-blue" alt="dsh"></a>
</p>

![盘查：树图 + 检查器](docs/canvas.png)

## 为什么需要它

Finder 和 SpaceSniffer 只回答「哪个文件夹大」，不回答「它是什么、删了会怎样」。
真要清理时，你得自己翻进去看、自己判断、自己记住哪些不能动——一次只能处理一个目录。

盘查把这一步交给工具：Agent 为每个目录写一句语义（是什么、能不能清理、依据是什么），
你只需要在盘面上做决定，执行时逐项预览、随时可撤销。

和「让 Agent 直接删」的区别：**盘查里的 Agent 没有执行权**，它只能写标记；
真正移动文件必须由你点「执行清理」。

## 30 秒安装

**在 dsh web 里**：打开 **Plugins → 添加插件**，输入 `github:vlln/dsh-pancha`，点安装。

**用 CLI**：

```sh
# 安装
dsh plugin --profile web add github:vlln/dsh-pancha

# 升级
dsh plugin --profile web update dsh-pancha

# 卸载
dsh plugin --profile web remove dsh-pancha
```

- **生效条件**：装完刷新页面即可，无需重启宿主。
- **前置**：dsh `0.2.x`（在 `0.2.1-rc.1` 上验证）；macOS / Linux。
- **装不上时**：先确认 dsh ≥ 0.2；若 Plugins 页显示「加载失败」，多半是版本不匹配。

### 装好之后怎么确认

- 左侧栏出现 **盘查**（和「自动化任务」同一栏）。
- 第一次打开会自动建一个一次性会话并扫描主目录，几秒后出现方块。
- 点一个方块，右侧出现类别、语义与依据。

## 用起来是什么样

### 看：树图与列表

![列表视图](docs/list.png)

| 区域 | 它回答什么问题 |
|---|---|
| 树图 | 哪里大、占了这一层的百分之多少 |
| facet 色条 | 这一层被 Agent 归成了哪几类 |
| 检查器 | 这个目录是什么、依据是什么、历史体积怎么变 |
| 计划条 | 现在待清理多少、预计释放多少、还有多少没选 |

### 定：保留 / 待清理

- `K` / `D` 直接标记，`空格` 循环三态，`Backspace` 清除；多选时作用于全部。
- 方块立刻变样：保留是绿框 ✓，待清理是红底 ✕，Agent 标的还会带一个小 `A`。
- 决定是唯一会被执行的东西；Agent 的语义和异议都不会改变你的决定。

### 执行：预览后移动

点 **执行清理** → 逐项预览（源是否还在、目标是否冲突）→ 确认后移到废纸篓。
macOS 拒绝写废纸篓时退到 `$DSH_HOME/trash/<时间戳>/`，界面会写明去向。
成功后记成一批，点「撤销这批」可以移回。

### 让 Agent 参与

- 扫描结束后会自动补语义；扫描过程中也会先对已读到的部分动手。
- 点 **让 Agent 提方案**，它按已有语义挑一批最有把握的待清理项。
- 右上角 **对话** 打开抽屉，可以直接和它说话，看它这一轮做了什么。

![对话](docs/chat.png)

## 能力面

| 工具 | 说明 |
|---|---|
| `disk_canvas_scan` | 扫描一个目录（默认主目录）的直接子项，返回体积最大的若干项 |
| `disk_canvas_state` | 读当前盘面：计划、条目、你的决定；`wait:false` 可在扫描中读 |
| `disk_canvas_claim` | 给某个路径写一条语义（一句话 + 类别 + 依据） |
| `disk_canvas_mark` | 直接标一批决定（和用户按键是同一份数据），只补没决定的 |
| `disk_canvas_object` | 对你不同意的决定写一句异议，不改决定 |
| `disk_canvas_history` | 读账本里的历史扫描与增量 |

## 安全与数据

- **扫描**：只读 `readdir` / `stat`，不跟随符号链接，不修改任何文件。
- **执行**：只做「移动到废纸篓」，没有删除接口；逐项检查冲突，单项失败不影响其它项。
- **落盘**：扫描快照、决定、Agent 语义存在 `$DSH_HOME/data/dsh-pancha/ledger.json`，只在本机，不上传。
- **外发**：只有你绑定的会话会把扫描结果摘要发给模型；没有遥测。
- **Agent 权限**：约束来自投递消息里的提示词（只分析、标注、预览，不改文件），是**软约束**；
  默认会话本身仍有文件/命令工具。

## 支持的宿主与版本

| 宿主 | profile | 状态 |
|---|---|---|
| 官方 `dsh web` | `web` | ✅ 已验证（dsh 0.2.1-rc.1） |
| 官方 Desktop | `desktop` | ⚠️ 未验证 |
| 其它 profile / 第三方宿主 | — | ⚠️ 未验证 |

web 与 desktop 安装互不相通，两个宿主各装一次。

## 已知限制

- 只扫描**当前层的直接子项**，逐层下钻；不建全盘索引。
- 执行只有「移动」一种动作，没有重命名 / 归档 / 压缩。
- 废纸篓权限随宿主环境而异；被拒时走插件回收目录，恢复入口是「撤销这批」。
- Agent 语义是「一句结论 + 依据」，不保证正确；决定权在用户。

## 插件管理

装/卸/启停用官方 CLI：`dsh plugin --profile web add|remove dsh-pancha`；已装插件在**侧边栏 Plugins 页**
里查看与配置。Desktop 上从应用内的 Plugins 页安装与管理。

## 兼容性

| dsh 版本 | 状态 |
|---|---|
| `0.2.1-rc.1` | ✅ 已验证（2026-10-20） |
| 其它 `0.2.x` | ⚠️ 未验证——升级后若侧栏入口消失或面板空白，多半是 client 槽位改名 |

## 反馈

- Bug / 想法：[Issues](https://github.com/vlln/dsh-pancha/issues)
- 喜欢的话给个 ⭐：[vlln/dsh-pancha](https://github.com/vlln/dsh-pancha)

## 许可

MIT
