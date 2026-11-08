# Kgrow.io Blueprint

**This published copy is protected.** Until the owner opens it to everyone from Settings, the map, every code file, the code entities, the dashboard copy and the pictures are stored as AES-256-GCM ciphertext and open only in the browser after the password. Settings (top bar) opens the content to everyone, changes the password or turns the blueprint MCP on and off; it publishes to this repository with a GitHub key the owner pastes for that save. The MCP server described below runs from the local project folder; it is not part of this site.

An interactive, bilingual (Arabic and English) blueprint of the whole Kgrow.io tool, drawn in the manner of Archify: lanes of section boundaries, cards for every code file and tool, orthogonal connectors with labels, and animated flows that show how a request travels through the tool.

## Open it

- Double-click `index.html`, or serve the folder: `python -m http.server 8765 --directory blueprint` and open `http://127.0.0.1:8765/`.
- The page asks for the owner's password after the opening animation. The check runs in the browser against a SHA-256 hash; it keeps casual viewers out but does not encrypt `assets/data.js`.
- Fonts load from Google Fonts when online; offline, the page falls back to Segoe UI, Tahoma and Consolas.

## What is on the page

| Part | Where |
| --- | --- |
| Opening animation, password window, move to the map | `assets/app.js` (intro, password, enterApp) |
| Blueprint layout, cards, boundary boxes, connectors, four presets (Classic, Blueprint, Editorial, Signal flow), Live and Still | `assets/app.js` (MAP), `assets/app.css` |
| Details window, glossary tooltips, search, animated flows, guide, Connect an agent | `assets/app.js` |
| Document and code reader; dashboard tour | `assets/reader.js`, `assets/tour.js` (loaded on first use) |
| All facts and texts | `assets/data.js`, generated |

## Rebuild the data

`assets/data.js` is generated from the project itself and the bilingual texts:

```
.venv\Scripts\python.exe -I blueprint\build\build_data.py
```

The builder reads the 138 tools from `src/autoskill/toolspec.py`, each module's docstring and line count, and the import graph between modules. The prose lives in `build/content_sections.py`, `content_files.py`, `content_tools.py` and `content_guide.py`. The builder stops when a tool has no Arabic text, a file named in the content is missing, or a main-path link is not an import or runtime link of the code.

## MCP server

`mcp/kgrow_blueprint_mcp.py` (standard library only) lets any MCP client ask about the tool. Tools: `kgrow_search`, `kgrow_explain`, `kgrow_list`, `kgrow_flow`, `kgrow_glossary`, `kgrow_read_source` (bounded reads inside the project folder only).

```
claude mcp add kgrow-blueprint -- "<project>\.venv\Scripts\python.exe" "<project>\blueprint\mcp\kgrow_blueprint_mcp.py"
```

The page's Connect an agent window shows the same command, a JSON block for other clients and a Codex `config.toml` block, with the paths filled in.

Self-check: `.venv\Scripts\python.exe -I blueprint\mcp\test_kgrow_blueprint_mcp.py`.

## Dashboard tour

The **Dashboard tour** button opens a split page: one half runs the real Kgrow.io dashboard (its own HTML, CSS and script from `src/autoskill/dashboard/static`, in its built-in demo run); the other half explains whatever you click on it, joined by a thin line. **Back** returns to the map, **Close** returns to the opening page and its password. `index.html#tour` opens the tour right after the password.

## Full documents, full code, kgraph entities

Every file on the map opens in full: Markdown files are rendered with their tables and code examples, every other text file is shown with line numbers (`assets/code/<n>.js`, loaded only when opened). Each file also lists the functions, classes, methods and sections the project's kgraph map knows in it (`assets/symbols.js`), and the search box finds them.

## For AI agents

- MCP: `mcp/kgrow_blueprint_mcp.py` gives any agent the same knowledge: `kgrow_search`, `kgrow_explain`, `kgrow_list`, `kgrow_flow`, `kgrow_glossary`, `kgrow_start`, `kgrow_dashboard` (every dashboard element), `kgrow_code_entities` (kgraph entities per file) and `kgrow_read_source`.
- A browser agent can use the page itself: after the password every explanation is plain text in the page, and the dashboard tour's explanations are real elements with headings.
- Raw data: `assets/data.js` (one JSON object after `window.KGROW_BLUEPRINT =`), `assets/symbols.js`, `assets/code/`.
