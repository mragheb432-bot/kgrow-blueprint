# Kgrow.io Blueprint

An interactive blueprint of Kgrow.io, built with the Kgp Builder: every section, every file with its full text, every link,
animated flows, a guide, a glossary, a live tour of the interface, Settings and an MCP server for agents.

## Open it

Serve this folder and open it in a browser (the code viewer and the tour load files on demand):

```
python -m http.server 8765 --bind 127.0.0.1 --directory "<this folder>"
```

## MCP server

`mcp/kgrow_blueprint_mcp.py` (standard library only) lets any MCP client ask about Kgrow.io:

```
claude mcp add kgrow-blueprint -- python "<this folder>/mcp/kgrow_blueprint_mcp.py"
```

Self-check: `python mcp/test_blueprint_mcp.py`.

## Rebuild

Edit `kgp/content.json` or `kgp/config.json`, then run `python <kgp-builder>/scripts/kgp.py build --project "<project>" --out "<this folder>"`.
