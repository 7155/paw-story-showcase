# PAW story diagrams

These diagrams are editable source assets for the Agents detail page. Each file answers one question:

- `paw-runtime-ownership.excalidraw`: who owns each Runtime and projection responsibility?
- `paw-feature-slice.excalidraw`: how does one feature become a bounded, verifiable vertical slice?
- `project-story-spine.excalidraw`: which eight questions make a project explanation complete?

The SVG exports live in `public/evidence/agents/`. They describe the source-level PAW architecture snapshot on 2026-09-02; they are not evidence that a current private Runtime is installed or running. The generator normalizes the tool's stock dark theme to the PAW palette: warm-white primary text, readable grey-green supporting text, ink-green cards, and mint only for the critical Runtime / evidence path.

Regenerate them with the reviewed MIT-licensed Excalidraw Architect MCP pinned to commit `6280bb323e041ba31c3548be92476c9c9a3bff17`:

```bash
uv run --with 'git+https://github.com/BV-Venky/excalidraw-architect-mcp.git@6280bb323e041ba31c3548be92476c9c9a3bff17' python diagrams/generate.py
```
