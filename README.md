# tlk-truss

Architecture diagrams bound to real code.

Every diagram-as-code tool turns text into a picture. None of them can tell you when the picture
started lying. `truss` binds each node to a path in the repository and fails your build when that
path is gone.

```
$ truss check docs/architecture.truss --ci
✗ docs/architecture.truss:14  E400  "ledger" is bound to src/ledger/**, which matches nothing
1 binding(s) no longer resolve
$ echo $?
1
```

Turkish: [README.tr.md](README.tr.md)

## Status

v0.1 work in progress. The core is working and tested: the source language, the architecture view,
the measured layout engine, the single-file HTML output and the drift gate. Sequence, data-flow and
state views, canvas editing and Mermaid import are next.

## Install

Node 20 or newer, no runtime dependencies.

```
npm install -g @talkdedsec/tlk-truss
```

Or run it straight from the checkout:

```
node bin/truss.mjs draw examples/payments.truss
```

## The source

```
title  Payment Platform
flow   down

group edge "Edge"
group core "Core services"

node web    "Storefront"  in=edge kind=client  code=apps/web/**
node api    "API Gateway" in=core kind=service code=services/api/**
node pay    "Payment"     in=core kind=service code=services/payment/**
node bus    "Event bus"   in=core kind=queue
node bank   "Acquirer"            kind=external note="third party"

web -> api : REST
api -> pay : charge
pay ~> bus : payment.captured
pay -> bank : authorise
```

- `->` a call, `~>` an asynchronous message
- `:` after a connection carries its label
- `kind=` is one of `service`, `store`, `queue`, `infra`, `client`, `external`, `job`
- `code=` is the binding: a path or a glob, several separated by commas
- `#` starts a comment

Every keyword also has a Turkish spelling (`baslik`, `grup`, `dugum`, `icinde=`, `tur=`, `kod=`),
and the two can be mixed in one file.

## Commands

```
truss draw   <source.truss> [-o out.html]   render a single-file HTML diagram
truss check  <source.truss> [--root .]      verify every code binding still resolves
```

Both take `--lang en|tr`, `--json` and `--ci`. `check` exits 1 when a binding no longer resolves,
which is all a CI job needs:

```yaml
- run: npx @talkdedsec/tlk-truss check docs/architecture.truss --ci
```

Add `--strict` to also flag nodes that carry no binding at all.

## The drawing

One HTML file, no network calls, no build step. Dark and light themes, pan and zoom, search,
a detail panel per node showing its binding, and SVG/PNG export. It reports what it did rather than
claiming it looks good: node count, connection count, layer count and the measured number of edge
crossings sit in the footer.

The layout is automatic and always is: cycles are broken, layers assigned, order chosen by the
median heuristic, crossings counted with a Fenwick tree, coordinates relaxed towards straight lines,
and group boxes pushed clear of nodes that do not belong to them. There are no manual coordinates in
the source language, because a diagram you have to hand-place is a diagram nobody updates.

## Licence

PolyForm Noncommercial 1.0.0 — free to use, not to sell. See [LICENSE](LICENSE).
