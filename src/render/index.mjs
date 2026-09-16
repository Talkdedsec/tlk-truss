import { renderSvg } from './svg.mjs';
import { renderSequence } from './sequence.mjs';

export function renderDiagram(diagram, model) {
  if (diagram.kind === 'sequence') return renderSequence(diagram);
  return renderSvg(diagram, { horizontal: model.flow === 'right', view: model.view });
}
