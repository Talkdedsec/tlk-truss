export const palettes = {
  dark: {
    canvas: '#0b0f14',
    surface: '#161b22',
    raised: '#1c232c',
    line: '#2f3742',
    text: '#e6edf3',
    muted: '#8b949e',
    grid: '#141a21',
  },
  light: {
    canvas: '#f5f6f8',
    surface: '#ffffff',
    raised: '#eef1f5',
    line: '#d3d8e0',
    text: '#141a21',
    muted: '#5c6672',
    grid: '#e7eaef',
  },
};

export const accents = {
  service: '#4c9aff',
  store: '#a371f7',
  queue: '#f0883e',
  infra: '#3fb950',
  client: '#2bc4d4',
  external: '#8b949e',
  job: '#e3b341',
};

export function accentOf(kind) {
  return accents[kind] ?? accents.service;
}
