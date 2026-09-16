const catalog = {
  E100: {
    en: () => 'unterminated quote',
    tr: () => 'kapanmamış tırnak',
  },
  E101: {
    en: ({ token }) => `unknown statement "${token}"`,
    tr: ({ token }) => `bilinmeyen ifade "${token}"`,
  },
  E102: {
    en: ({ token }) => `"${token}" needs a value`,
    tr: ({ token }) => `"${token}" bir değer bekliyor`,
  },
  E103: {
    en: ({ token }) => `unknown flow "${token}"; use down or right`,
    tr: ({ token }) => `bilinmeyen akış "${token}"; asagi ya da saga kullan`,
  },
  E104: {
    en: ({ token }) => `${token} declaration needs an id`,
    tr: ({ token }) => `${token} bildirimi bir kimlik bekliyor`,
  },
  E105: {
    en: ({ token }) => `"${token}" is not a valid id`,
    tr: ({ token }) => `"${token}" geçerli bir kimlik değil`,
  },
  E106: {
    en: () => 'malformed connection',
    tr: () => 'bozuk bağlantı',
  },
  E110: {
    en: ({ token }) => `"${token}" is not a key=value attribute`,
    tr: ({ token }) => `"${token}" anahtar=değer biçiminde değil`,
  },
  E111: {
    en: ({ token }) => `unknown attribute "${token}"`,
    tr: ({ token }) => `bilinmeyen öznitelik "${token}"`,
  },
  E200: {
    en: ({ token }) => `node "${token}" is declared twice`,
    tr: ({ token }) => `"${token}" düğümü iki kez bildirildi`,
  },
  E201: {
    en: ({ token }) => `group "${token}" is declared twice`,
    tr: ({ token }) => `"${token}" grubu iki kez bildirildi`,
  },
  E202: {
    en: ({ token }) => `connection endpoint "${token}" is never declared`,
    tr: ({ token }) => `"${token}" bağlantı ucu hiç bildirilmemiş`,
  },
  E203: {
    en: ({ token }) => `unknown group "${token}"`,
    tr: ({ token }) => `bilinmeyen grup "${token}"`,
  },
  E205: {
    en: ({ token, hint }) => `unknown kind "${token}"; known kinds: ${hint}`,
    tr: ({ token, hint }) => `bilinmeyen tür "${token}"; bilinen türler: ${hint}`,
  },
  E206: {
    en: ({ token, hint }) => `unknown view "${token}"; known views: ${hint}`,
    tr: ({ token, hint }) => `bilinmeyen görünüm "${token}"; bilinen görünümler: ${hint}`,
  },
  E400: {
    en: ({ token, hint }) => `"${token}" is bound to ${hint}, which matches nothing`,
    tr: ({ token, hint }) => `"${token}" düğümü ${hint} yoluna bağlı, hiçbir şeyle eşleşmiyor`,
  },
  E500: {
    en: () => 'this is not a Mermaid flowchart, sequenceDiagram or stateDiagram',
    tr: () => 'bu bir Mermaid flowchart, sequenceDiagram ya da stateDiagram değil',
  },
  W300: {
    en: ({ token }) => `${token} is drawn more than once`,
    tr: ({ token }) => `${token} birden fazla kez çiziliyor`,
  },
  W301: {
    en: ({ token }) => `"${token}" connects to itself`,
    tr: ({ token }) => `"${token}" kendine bağlanıyor`,
  },
  W302: {
    en: ({ token }) => `"${token}" is declared but never connected`,
    tr: ({ token }) => `"${token}" bildirilmiş ama hiçbir yere bağlanmamış`,
  },
  W401: {
    en: ({ token }) => `no node claims "${token}"`,
    tr: ({ token }) => `"${token}" yolunu hiçbir düğüm sahiplenmiyor`,
  },
  W400: {
    en: ({ token }) => `"${token}" carries no code binding`,
    tr: ({ token }) => `"${token}" düğümünün kod bağı yok`,
  },
};

export function isError(code) {
  return code.startsWith('E');
}

export function describe(diagnostic, lang = 'en') {
  const entry = catalog[diagnostic.code];
  if (!entry) return diagnostic.code;
  return (entry[lang] ?? entry.en)(diagnostic);
}

export function format(diagnostic, { lang = 'en', path = '' } = {}) {
  const base = diagnostic.where ?? path;
  const where = diagnostic.line ? `${base}:${diagnostic.line}` : base;
  const mark = isError(diagnostic.code) ? '✗' : '!';
  return `${mark} ${where}  ${diagnostic.code}  ${describe(diagnostic, lang)}`;
}

export function countErrors(diagnostics) {
  return diagnostics.filter((entry) => isError(entry.code)).length;
}
