import { readFileSync } from 'node:fs';
import { resolveLanguage, strings } from './i18n.mjs';

const aliases = {
  draw: 'draw',
  ciz: 'draw',
  check: 'check',
  denetle: 'check',
  export: 'export',
  disaaktar: 'export',
  import: 'import',
  iceaktar: 'import',
  help: 'help',
  yardim: 'help',
};

export function parseArgv(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('-')) {
      positional.push(token);
      continue;
    }
    const [rawName, inlineValue] = token.replace(/^--?/, '').split('=');
    const name = rawName.toLowerCase();
    if (inlineValue !== undefined) {
      flags[name] = inlineValue;
    } else if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
      flags[name] = argv[i + 1];
      i += 1;
    } else {
      flags[name] = true;
    }
  }
  return { positional, flags };
}

function version() {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  return pkg.version;
}

function help(s) {
  return [
    `truss — ${s.tagline}`,
    '',
    `${s.usage}:`,
    s.usageLine,
    '',
    `${s.commands}:`,
    `  draw      ${s.cmdDraw}`,
    `  check     ${s.cmdCheck}`,
    `  export    ${s.cmdExport}`,
    `  import    ${s.cmdImport}`,
    `  help      ${s.cmdHelp}`,
    '',
    `${s.options}:`,
    `  -o, --out ${s.phPath.padEnd(9)} ${s.optOut}`,
    `      --lang ${s.phCode.padEnd(9)} ${s.optLang}`,
    `      --json          ${s.optJson}`,
    `      --ci            ${s.optCi}`,
    `  -v, --version       ${s.optVersion}`,
    '',
  ].join('\n');
}

export function run(argv, io = console) {
  const { positional, flags } = parseArgv(argv);
  const lang = resolveLanguage(
    typeof flags.lang === 'string' ? flags.lang : typeof flags.dil === 'string' ? flags.dil : undefined,
  );
  const s = strings(lang);

  if (flags.version || flags.v) {
    io.log(version());
    return 0;
  }

  const [rawCommand] = positional;
  if (!rawCommand || flags.help || flags.h) {
    io.log(help(s));
    return 0;
  }

  const command = aliases[rawCommand.toLowerCase()];
  if (!command) {
    io.error(s.unknownCommand(rawCommand));
    io.error(s.tryHelp);
    return 2;
  }

  if (command === 'help') {
    io.log(help(s));
    return 0;
  }

  io.error(s.notReady(command));
  return 2;
}
