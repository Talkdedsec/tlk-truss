import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const problems = [];
const notes = [];

const npmCli = process.env.npm_execpath;

function run(command, args) {
  const usable =
    command === 'npm' && npmCli
      ? { file: process.execPath, args: [npmCli, ...args] }
      : { file: command === 'npm' && process.platform === 'win32' ? 'npm.cmd' : command, args };
  return execFileSync(usable.file, usable.args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: usable.file === 'npm.cmd',
  }).trim();
}

function check(label, body) {
  try {
    const note = body();
    notes.push(`  ok    ${label}${note ? ` — ${note}` : ''}`);
  } catch (error) {
    problems.push(`  fail  ${label} — ${error.message.split('\n')[0]}`);
  }
}

check('the working tree is clean', () => {
  const dirty = run('git', ['status', '--porcelain']);
  if (dirty) throw new Error(`${dirty.split('\n').length} file(s) uncommitted`);
  return '';
});

check('the version carries a matching tag', () => {
  const tags = run('git', ['tag', '--list', `v${pkg.version}`]);
  if (!tags) throw new Error(`v${pkg.version} is not tagged`);
  return `v${pkg.version}`;
});

check('the scope is published publicly', () => {
  if (pkg.publishConfig?.access !== 'public') throw new Error('publishConfig.access is not public');
  return pkg.name;
});

check('the licence is a licence npm understands', () => {
  if (!pkg.license || pkg.license.startsWith('SEE')) throw new Error('no SPDX identifier');
  return pkg.license;
});

check('the entry points exist and npm will keep them', () => {
  readFileSync(new URL('../bin/truss.mjs', import.meta.url));
  readFileSync(new URL('../src/index.mjs', import.meta.url));
  for (const [name, target] of Object.entries(pkg.bin)) {
    if (target.startsWith('./')) {
      throw new Error(`bin.${name} starts with ./ and npm drops it on publish`);
    }
  }
  return `${pkg.bin.truss}, ${pkg.exports['.']}`;
});

check('the tests pass', () => {
  run('npm', ['test']);
  return '';
});

check('the tarball carries what it should and nothing else', () => {
  const listed = JSON.parse(run('npm', ['pack', '--dry-run', '--json']))[0];
  const files = listed.files.map((entry) => entry.path);
  for (const wanted of ['bin/truss.mjs', 'src/index.mjs', 'LICENSE', 'README.md', 'README.tr.md']) {
    if (!files.includes(wanted)) throw new Error(`${wanted} is missing`);
  }
  const strays = files.filter((path) => path.startsWith('test') || path.startsWith('out/'));
  if (strays.length) throw new Error(`${strays[0]} should not ship`);
  return `${files.length} files, ${(listed.size / 1024).toFixed(1)} kB`;
});

check('the page it produces reaches for nothing', () => {
  run('node', ['bin/truss.mjs', 'draw', 'examples/payments.truss', '-o', 'out/publish-check.html']);
  const page = readFileSync('out/publish-check.html', 'utf8');
  const external = page.match(/https?:\/\/[^"' )]+/g)?.filter((url) => !url.includes('www.w3.org'));
  rmSync('out/publish-check.html', { force: true });
  if (external?.length) throw new Error(external[0]);
  return '';
});

check('our own diagrams still match this repository', () => {
  run('node', ['bin/truss.mjs', 'check', 'examples/payments.truss', '--root', '.', '--ci']);
  return '';
});

console.log(`${pkg.name}@${pkg.version}`);
for (const line of [...notes, ...problems]) console.log(line);

if (problems.length) {
  console.log(`\n${problems.length} thing(s) to settle before publishing.`);
  process.exitCode = 1;
} else {
  console.log('\nReady. Publish with: npm publish');
}
