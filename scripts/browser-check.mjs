import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const edge = process.env.TRUSS_BROWSER
  ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

function wait(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

async function endpoint(profile) {
  const stamp = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const port = readFileSync(stamp, 'utf8').split('\n')[0].trim();
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      const body = await response.json();
      if (body.webSocketDebuggerUrl) return body.webSocketDebuggerUrl;
    } catch {
      await wait(120);
    }
  }
  throw new Error('the browser never opened a debugging port');
}

class Session {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.target = null;
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      const waiting = this.pending.get(message.id);
      if (!waiting) return;
      this.pending.delete(message.id);
      if (message.error) waiting.reject(new Error(message.error.message));
      else waiting.resolve(message.result);
    });
  }

  send(method, params = {}, sessionId = this.target) {
    this.id += 1;
    const id = this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.socket.send(JSON.stringify(payload));
    return new Promise((resolve_, reject) => this.pending.set(id, { resolve: resolve_, reject }));
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? 'page threw');
    }
    return result.result.value;
  }
}

export async function open(file) {
  const profile = mkdtempSync(join(tmpdir(), 'truss-browser-'));
  const child = spawn(
    edge,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--hide-scrollbars',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--window-size=1280,860',
      pathToFileURL(resolve(file)).href,
    ],
    { stdio: 'ignore' },
  );

  const socket = new WebSocket(await endpoint(profile));
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });

  const session = new Session(socket);
  const { targetInfos } = await session.send('Target.getTargets', {}, null);
  const page = targetInfos.find((info) => info.type === 'page');
  const attached = await session.send(
    'Target.attachToTarget',
    { targetId: page.targetId, flatten: true },
    null,
  );
  session.target = attached.sessionId;
  await session.send('Runtime.enable');
  await session.send('Log.enable');

  const problems = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') {
      problems.push(message.params.exceptionDetails.exception?.description ?? 'exception');
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      problems.push(message.params.entry.text);
    }
  });

  await wait(600);

  return {
    session,
    problems,
    async shot(target) {
      const { data } = await session.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(target, Buffer.from(data, 'base64'));
      return target;
    },
    async close() {
      socket.close();
      child.kill();
      await wait(200);
      rmSync(profile, { recursive: true, force: true });
    },
  };
}
