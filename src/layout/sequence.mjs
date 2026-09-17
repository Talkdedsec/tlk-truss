import { measure, metrics } from './place.mjs';

export const sequenceMetrics = {
  framePad: 20,
  frameHead: 38,
  branchGap: 26,
  barWidth: 11,
  headHeight: 52,
  headGap: 56,
  firstMessage: 46,
  messageGap: 54,
  selfDrop: 34,
  selfReach: 46,
  noteGap: 30,
  margin: metrics.margin,
};

export function layoutSequence(model) {
  const lanes = model.nodes.map((node) => ({ ...node, w: measure(node.label) }));
  let cursor = sequenceMetrics.margin;
  for (const lane of lanes) {
    lane.x = cursor;
    lane.y = sequenceMetrics.margin;
    lane.h = sequenceMetrics.headHeight;
    lane.centre = cursor + lane.w / 2;
    cursor += lane.w + sequenceMetrics.headGap;
  }

  const laneOf = new Map(lanes.map((lane) => [lane.id, lane]));
  const top = sequenceMetrics.margin + sequenceMetrics.headHeight + sequenceMetrics.firstMessage;

  const frameOf = new Map((model.frames ?? []).map((frame) => [frame.id, frame]));
  const chainOf = (id) => {
    const chain = [];
    let cursor = id;
    while (cursor && frameOf.has(cursor)) {
      chain.unshift(cursor);
      cursor = frameOf.get(cursor).parent;
    }
    return chain;
  };

  let depth = top;
  let standing = [];
  let standingFrame = '';
  let standingBranch = 0;
  const messages = model.edges.map((edge, index) => {
    const wanted = chainOf(edge.frame);
    let shared = 0;
    while (shared < standing.length && shared < wanted.length && standing[shared] === wanted[shared]) {
      shared += 1;
    }
    depth += (standing.length - shared) * sequenceMetrics.framePad;
    depth += (wanted.length - shared) * sequenceMetrics.frameHead;
    if (edge.frame && edge.frame === standingFrame && (edge.branch ?? 0) !== standingBranch) {
      depth += sequenceMetrics.branchGap;
    }
    standing = wanted;
    standingFrame = edge.frame ?? '';
    standingBranch = edge.branch ?? 0;
    const from = laneOf.get(edge.from);
    const to = laneOf.get(edge.to);
    const self = edge.from === edge.to;
    const message = {
      index: index + 1,
      from: edge.from,
      to: edge.to,
      label: edge.label,
      frame: edge.frame ?? '',
      branch: edge.branch ?? 0,
      note: edge.note ?? '',
      style: edge.style,
      self,
      y: depth,
      x1: from.centre,
      x2: to.centre,
      reach: self ? from.centre + sequenceMetrics.selfReach : to.centre,
      drop: self ? sequenceMetrics.selfDrop : 0,
    };
    depth += self
      ? sequenceMetrics.selfDrop + sequenceMetrics.messageGap
      : sequenceMetrics.messageGap;
    return message;
  });

  const frames = (model.frames ?? [])
    .map((frame) => {
      const inside = messages.filter((message) => chainOf(message.frame).includes(frame.id));
      if (!inside.length) return null;
      const involved = new Set();
      for (const message of inside) {
        involved.add(message.from);
        involved.add(message.to);
      }
      const lanesInside = lanes.filter((lane) => involved.has(lane.id));
      const inset = frame.depth * 9;
      const left = Math.min(...lanesInside.map((lane) => lane.centre)) - sequenceMetrics.framePad * 2 + inset;
      const right =
        Math.max(...lanesInside.map((lane) => Math.max(lane.centre, ...inside.map((m) => m.reach)))) +
        sequenceMetrics.framePad - inset;
      const firstY = Math.min(...inside.map((message) => message.y));
      const lastY = Math.max(...inside.map((message) => message.y + message.drop));
      const dividers = (model.branches ?? [])
        .filter((branch) => branch.frame === frame.id)
        .map((branch) => {
          const opening = inside.filter((message) => message.branch === branch.index);
          if (!opening.length) return null;
          const previous = inside.filter((message) => message.branch < branch.index);
          const above = previous.length
            ? Math.max(...previous.map((message) => message.y + message.drop))
            : firstY;
          const below = Math.min(...opening.map((message) => message.y));
          return { y: (above + below) / 2 - 4, label: branch.label };
        })
        .filter(Boolean);
      return {
        id: frame.id,
        kind: frame.kind,
        label: frame.label,
        x: left,
        y: firstY - sequenceMetrics.frameHead - 8,
        w: right - left,
        h: lastY - firstY + sequenceMetrics.frameHead + sequenceMetrics.framePad + 8,
        dividers,
      };
    })
    .filter(Boolean);

  const nesting = new Map(frames.map((frame) => [frame.id, frameOf.get(frame.id).depth]));
  const byDepth = [...frames].sort((a, b) => nesting.get(b.id) - nesting.get(a.id));
  for (const inner of byDepth) {
    let parent = frameOf.get(inner.id).parent;
    while (parent) {
      const outer = frames.find((frame) => frame.id === parent);
      if (outer) {
        const bottom = Math.max(outer.y + outer.h, inner.y + inner.h + 10);
        outer.y = Math.min(outer.y, inner.y - 10);
        outer.h = bottom - outer.y;
      }
      parent = frameOf.get(parent)?.parent ?? '';
    }
  }

  const bars = [];
  const open = [];
  for (const message of messages) {
    if (message.self || message.style !== 'solid') continue;
    const top = open[open.length - 1];
    if (top && top.participant === message.from && top.caller === message.to) {
      top.end = message.y;
      bars.push(open.pop());
      continue;
    }
    open.push({
      participant: message.to,
      caller: message.from,
      start: message.y,
      end: 0,
      depth: open.filter((entry) => entry.participant === message.to).length,
    });
  }

  const lifelineEnd = depth + sequenceMetrics.messageGap / 2;
  for (const bar of open) {
    bar.end = lifelineEnd;
    bars.push(bar);
  }
  for (const bar of bars) {
    const lane = laneOf.get(bar.participant);
    bar.x = lane.centre - sequenceMetrics.barWidth / 2 + bar.depth * 5;
    bar.y = bar.start;
    bar.h = Math.max(sequenceMetrics.barWidth, bar.end - bar.start);
  }

  const rail = Math.max(...lanes.map((lane) => lane.x + lane.w)) + sequenceMetrics.noteGap;
  const notes = messages
    .filter((message) => message.note)
    .map((message) => ({
      text: message.note,
      x: rail,
      y: message.y + (message.self ? message.drop / 2 : 0),
      index: message.index,
    }));
  const width =
    Math.max(
      cursor - sequenceMetrics.headGap,
      ...messages.map((message) => message.reach + sequenceMetrics.margin),
      ...notes.map((note) => note.x + note.text.length * 6.4 + 28),
      ...frames.map((frame) => frame.x + frame.w + sequenceMetrics.margin),
    ) + sequenceMetrics.margin;

  return {
    kind: 'sequence',
    lanes,
    messages,
    frames,
    bars,
    notes,
    lifelineEnd,
    width: Math.round(width),
    height: Math.round(lifelineEnd + sequenceMetrics.margin),
    stats: {
      participants: lanes.length,
      messages: messages.length,
      asynchronous: messages.filter((message) => message.style === 'async').length,
    },
    summary: [
      { key: 'participants', value: lanes.length },
      { key: 'messages', value: messages.length },
    ],
  };
}
