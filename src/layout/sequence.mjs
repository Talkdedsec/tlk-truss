import { measure, metrics } from './place.mjs';

export const sequenceMetrics = {
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

  const lifelineEnd = depth + sequenceMetrics.messageGap / 2;
  const width =
    Math.max(
      cursor - sequenceMetrics.headGap,
      ...messages.map((message) => message.reach + sequenceMetrics.margin),
    ) + sequenceMetrics.margin;

  return {
    kind: 'sequence',
    lanes,
    messages,
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
