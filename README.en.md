<h1 align="center">Pancha</h1>

<p align="center">Turn your disk into a reviewable, annotatable, executable surface.<br/>
The agent explains every folder; you make the decisions; nothing moves before a preview.</p>

<p align="center">
  <a href="https://github.com/vlln/dsh-pancha/stargazers"><img src="https://badgen.net/github/stars/vlln/dsh-pancha" alt="stars"></a>
  <img src="https://badgen.net/badge/license/MIT/green" alt="license">
  <img src="https://badgen.net/badge/dsh/0.2.x/blue" alt="dsh">
</p>

<p align="center"><a href="README.md">中文</a> | English</p>

![Pancha: treemap + inspector](docs/canvas.jpg)

Finder and SpaceSniffer tell you *which folder is big*. They don't tell you *what it is* or *what happens if you delete it*.
So you dig in folder by folder, decide by hand, and try to remember what must not be touched.

Pancha hands that step to the tool: the agent writes one sentence of semantics per directory
(what it is, whether it can go, what evidence it has), and you just decide on the surface.
Unlike "let the agent delete things", **it has no execution rights** — it can only write marks.
Moving files requires your click.

## Install (30 seconds)

**In dsh web**: open **Plugins → Add plugin**, enter `github:vlln/dsh-pancha`, install.

**CLI**:

```sh
dsh plugin --profile web add github:vlln/dsh-pancha
```

- Takes effect after a page refresh; no host restart.
- Requires dsh `0.2.x` (verified on `0.2.1-rc.1`).
- Uninstall: `dsh plugin --profile web remove dsh-pancha`.

After installing, a **Pancha** entry appears in the left sidebar. The first open creates a throwaway
session and scans your home directory; tiles show up within seconds.

## How it feels

### Look

![List view](docs/list.jpg)

Treemap by size, facet colors by agent category, and a detail panel with semantics, evidence and a size history curve.
The list view also exposes items smaller than one pixel.

### Decide

- `K` keep, `D` delete, `Space` cycles, `Backspace` clears; works on multi-selection.
- Tiles react instantly: keep is a green ✓ outline, delete is red with ✕, agent marks carry a small `A`.
- Your decisions outrank the agent's semantics; it can only file an objection, never override you.

### Execute

**Execute cleanup** → per-item preview (source still there? target conflict?) → move to Trash.
If macOS denies Trash access, items go to `$DSH_HOME/trash/<timestamp>/` and the UI says so.
The batch is recorded, so **Undo batch** moves everything back.

### Let the agent help

![Chat](docs/chat.jpg)

Semantics are filled automatically after a scan (and partially during it). **Ask agent to propose**
lets it pick a confident batch. The **Chat** drawer lets you talk to it and watch what it did.

## Agent tools

| Tool | Purpose |
|---|---|
| `disk_canvas_scan` | Scan one directory (default: home), return the largest children |
| `disk_canvas_state` | Read the canvas: plan, entries, your decisions (`wait:false` works mid-scan) |
| `disk_canvas_claim` | Write one semantic sentence + category + evidence |
| `disk_canvas_mark` | Mark decisions directly (same data as your keys), only fills undecided items |
| `disk_canvas_object` | File an objection against a decision without changing it |
| `disk_canvas_history` | Read scan history and deltas |

The constraint is a **prompt-level** one: analyze, annotate, preview — do not modify files.
The default session still has file/command tools; add a controlled preset if you need hard isolation.

## Safety and data

- Scanning only calls `readdir` / `stat`; no symlink traversal, no writes.
- Execution only moves to Trash; there is no delete API. Conflicts are checked per item.
- Ledger lives at `$DSH_HOME/data/dsh-pancha/ledger.json`, local only, never uploaded.
- No telemetry. Only your bound session receives scan summaries.

## Compatibility

| dsh version | Status |
|---|---|
| `0.2.1-rc.1` | ✅ Verified (2026-10-20) |
| Other `0.2.x` | ⚠️ Untested — if the sidebar entry disappears, a client slot likely moved |

Official Desktop is untested; web and desktop installs are separate.

## Known limits

- Scans one level of direct children at a time; no full-disk index.
- Execution only moves files: no rename, archive or compress.
- Trash permission depends on the host environment; the fallback bin is restored via **Undo batch**.
- Agent semantics are one-line claims, not guarantees. You decide.

## Plugin management

Install / remove / toggle with the official CLI: `dsh plugin --profile web add|remove dsh-pancha`.
Installed plugins are listed on the **Plugins** page in the sidebar.

## License

MIT
