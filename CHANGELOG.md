# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.0] - 2026-09-17

### Added

- `else "otherwise"` divides a sequence block into branches, drawn with a dashed divider and the
  branch name; `alt` and `par` finally mean what they say. Turkish: `yoksa`.
- Blocks are editable on the canvas: retype one, give it a branch, or remove it and keep its
  messages.
- The README says how big a diagram this engine will carry, with measured numbers rather than a
  promise.

### Changed

- The publish workflow runs by hand until npm knows this repository as a trusted publisher, so a
  release no longer ends in a red cross it cannot avoid.

## [0.3.1] - 2026-09-16

### Fixed

- `bin.truss` pointed at `./bin/truss.mjs`. npm strips a `bin` entry whose path starts with `./`,
  so the published package would have installed without the `truss` command. `publish:check` now
  refuses that shape.

## [0.3.0] - 2026-09-16

### Added

- `block loop|alt|opt|par "why"` … `end` in the sequence view, with nesting, Turkish spellings
  (`blok dongu|secenek|istege|paralel` … `son`), and both an unclosed block and a stray `end`
  reported by their own diagnostics.
- The package is ready to publish: a public scope, a library entry point, an SPDX licence field,
  `prepublishOnly`, and a release workflow that publishes with provenance from CI.

## [0.2.0] - 2026-09-16

### Added

- `watch`, which redraws on every save and, with `--serve`, reloads the browser from a local
  address. The reload snippet is added to the served copy only.
- Groups can be created, renamed and removed on the canvas, like nodes and connections.
- `check --uncovered` reports the directories no diagram claims, across as many sources as it is
  given; `check` now accepts several sources at once.
- Connections can carry `code=` and `note=`, so a call can be bound to the file that makes it.
- Activation bars and notes in the sequence view. Only a synchronous message activates; a call that
  never returns stays active to the end of the lifeline.
- `action.yml`, so the drift gate is four lines of YAML in any workflow.
- A library entry point: `import { draw, check, toSource, fromMermaid } from '@talkdedsec/tlk-truss'`.

### Changed

- The coverage line counts connections as well as nodes.
- A group with no members is kept in the model, so one can be created before it is filled, and is
  simply not drawn.

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

[0.4.0]: https://github.com/Talkdedsec/tlk-truss/releases/tag/v0.4.0
[0.3.1]: https://github.com/Talkdedsec/tlk-truss/releases/tag/v0.3.1
[0.3.0]: https://github.com/Talkdedsec/tlk-truss/releases/tag/v0.3.0
[0.2.0]: https://github.com/Talkdedsec/tlk-truss/releases/tag/v0.2.0
[0.1.0]: https://github.com/Talkdedsec/tlk-truss/releases/tag/v0.1.0
