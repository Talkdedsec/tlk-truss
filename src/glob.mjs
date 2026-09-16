const specials = /[.+^${}()|[\]\\]/g;

export function toRegExp(pattern) {
  let source = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        const slash = pattern[i + 2] === '/';
        source += slash ? '(?:.*/)?' : '.*';
        i += slash ? 2 : 1;
        continue;
      }
      source += '[^/]*';
      continue;
    }
    if (ch === '?') {
      source += '[^/]';
      continue;
    }
    if (ch === '{') {
      const close = pattern.indexOf('}', i);
      if (close > i) {
        const options = pattern.slice(i + 1, close).split(',');
        source += `(?:${options.map((option) => option.replace(specials, '\\$&')).join('|')})`;
        i = close;
        continue;
      }
    }
    source += ch.replace(specials, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

export function matches(pattern, path) {
  return toRegExp(pattern).test(path);
}
