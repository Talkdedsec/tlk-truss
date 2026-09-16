# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-09-16

### Added

- The `.truss` source language, with an English and a Turkish spelling for every keyword.
- Four views: architecture, sequence, data flow and lifecycle.
- A layered layout engine that breaks cycles, assigns layers, orders by the median heuristic,
  counts crossings with a Fenwick tree and keeps group boxes clear of nodes that do not belong.
- Single-file HTML output: dark and light themes, pan and zoom, search, a detail panel,
  SVG and PNG export, and an edit mode that re-runs the whole engine inside the page.
- `check`, the drift gate: every `code=` binding is matched against the repository and a binding
  that resolves to nothing fails the build.
- `export` to SVG, DOT, Mermaid and JSON; `import` from Mermaid flowchart, sequence and state
  diagrams.
- A browser runner built on the debugging protocol, used by the page tests.

[0.1.0]: https://github.com/Talkdedsec/tlk-truss/releases/tag/v0.1.0
