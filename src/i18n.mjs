const messages = {
  en: {
    tagline: 'Architecture diagrams bound to real code.',
    usage: 'Usage',
    commands: 'Commands',
    options: 'Options',
    cmdDraw: 'render a .truss source into a single-file HTML diagram',
    cmdCheck: 'verify every code binding still resolves; non-zero exit on drift',
    cmdExport: 'write the diagram as svg, png, dot or mermaid',
    cmdImport: 'convert a Mermaid source into a .truss source',
    cmdHelp: 'show this help',
    optOut: 'output path',
    optLang: 'interface language (en, tr)',
    optJson: 'machine-readable output',
    optCi: 'terse output and a non-zero exit on the first failure',
    optVersion: 'print the version',
    optUncovered: 'list the paths no node on the diagram claims',
    notReady: (name) => `"${name}" is not implemented yet in this build.`,
    unknownCommand: (name) => `Unknown command: ${name}`,
    tryHelp: 'Run `truss help` to see the available commands.',
    usageLine: '  truss <command> <source.truss> [options]',
    phPath: '<path>',
    phCode: '<code>',
    needSource: 'No source file given.',
    wrote: 'Wrote',
    statNodes: 'nodes',
    statEdges: 'edges',
    statLayers: 'layers',
    statCrossings: 'crossings',
    statBound: 'nodes bound to code',
    checkPassed: 'every code binding resolves',
    checkFailed: 'binding(s) no longer resolve',
    unknownFormat: (list) => `Unknown format. Available: ${list}`,
    cmdWatch: 're-render whenever the source changes; --serve reloads the page too',
    watching: 'Watching',
    serving: 'Serving',
    stopped: 'Stopped.',
  },
  tr: {
    tagline: 'Gerçek koda bağlı mimari diyagramlar.',
    usage: 'Kullanım',
    commands: 'Komutlar',
    options: 'Seçenekler',
    cmdDraw: 'bir .truss kaynağını tek dosyalık HTML diyagrama çizer',
    cmdCheck: 'her kod bağının hâlâ çözüldüğünü denetler; sapmada sıfırdan farklı çıkış kodu',
    cmdExport: 'diyagramı svg, png, dot ya da mermaid olarak dışa aktarır',
    cmdImport: 'bir Mermaid kaynağını .truss kaynağına çevirir',
    cmdHelp: 'bu yardımı gösterir',
    optOut: 'çıktı yolu',
    optLang: 'arayüz dili (en, tr)',
    optJson: 'makine okunur çıktı',
    optCi: 'kısa çıktı ve ilk hatada sıfırdan farklı çıkış kodu',
    optVersion: 'sürümü yazar',
    optUncovered: 'diyagramda hiçbir düğümün sahiplenmediği yolları listeler',
    notReady: (name) => `"${name}" bu sürümde henüz yok.`,
    unknownCommand: (name) => `Bilinmeyen komut: ${name}`,
    tryHelp: 'Komutları görmek için `truss help` çalıştır.',
    usageLine: '  truss <komut> <kaynak.truss> [seçenekler]',
    phPath: '<yol>',
    phCode: '<kod>',
    needSource: 'Kaynak dosya verilmedi.',
    wrote: 'Yazıldı',
    statNodes: 'düğüm',
    statEdges: 'kenar',
    statLayers: 'katman',
    statCrossings: 'kesişme',
    statBound: 'düğüm koda bağlı',
    checkPassed: 'bütün kod bağları çözülüyor',
    checkFailed: 'bağ artık çözülmüyor',
    unknownFormat: (list) => `Bilinmeyen biçim. Kullanılabilir: ${list}`,
    cmdWatch: 'kaynak değişince yeniden çizer; --serve sayfayı da tazeler',
    watching: 'İzleniyor',
    serving: 'Sunuluyor',
    stopped: 'Durduruldu.',
  },
};

const statNames = {
  nodes: { en: 'nodes', tr: 'düğüm' },
  edges: { en: 'connections', tr: 'bağlantı' },
  layers: { en: 'layers', tr: 'katman' },
  crossings: { en: 'crossings', tr: 'kesişme' },
  participants: { en: 'participants', tr: 'katılımcı' },
  messages: { en: 'messages', tr: 'mesaj' },
  states: { en: 'states', tr: 'durum' },
  transitions: { en: 'transitions', tr: 'geçiş' },
  stages: { en: 'stages', tr: 'aşama' },
  bound: { en: 'bound to code', tr: 'koda bağlı' },
};

export const statLabels = statNames;

export function statName(key, lang = 'en') {
  const entry = statNames[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en;
}

export function localiseSummary(summary) {
  return summary.map((entry) => ({
    value: entry.value,
    en: statName(entry.key, 'en'),
    tr: statName(entry.key, 'tr'),
  }));
}

export const languages = Object.keys(messages);

export function resolveLanguage(explicit, env = process.env) {
  const wanted = explicit || env.TRUSS_LANG || env.TRUSS_DIL;
  if (wanted && languages.includes(wanted.slice(0, 2).toLowerCase())) {
    return wanted.slice(0, 2).toLowerCase();
  }
  return 'en';
}

export function strings(lang) {
  return messages[lang] ?? messages.en;
}
