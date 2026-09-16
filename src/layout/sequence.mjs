import { measure, metrics } from './place.mjs';

export const sequenceMetrics = {
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

  let depth = top;
  const messages = model.edges.map((edge, index) => {
    const from = laneOf.get(edge.from);
    const to = laneOf.get(edge.to);
    const self = edge.from === edge.to;
    const message = {
      index: index + 1,
      from: edge.from,
      to: edge.to,
      label: edge.label,
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
    ) + sequenceMetrics.margin;

  return {
    kind: 'sequence',
    lanes,
    messages,
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
