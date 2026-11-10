#!/usr/bin/env node
'use strict';
// Stdio-to-HTTP bridge for the LogoAPI MCP server.
// Reads newline-delimited JSON-RPC on stdin, POSTs each message to the server,
// writes JSON-RPC replies on stdout. Logs go to stderr only.

const pkg = require('./package.json');
const readline = require('readline');

const args = process.argv.slice(2);
if (args.includes('--version') || args.includes('-v')) {
  process.stdout.write(pkg.version + '\n');
  process.exit(0);
}
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    'logoapi-mcp ' + pkg.version + '\n\n' +
    'Stdio bridge to the LogoAPI MCP server (company logos and favicons by domain).\n' +
    'Free, no key.\n\n' +
    'Usage: npx -y logoapi-mcp\n\n' +
    'Env:   LOGOAPI_MCP_URL  server URL (default https://logoapi.sh/mcp)\n' +
    'Docs:  https://logoapi.sh/docs/mcp\n'
  );
  process.exit(0);
}

const URL_ = process.env.LOGOAPI_MCP_URL || 'https://logoapi.sh/mcp';
const TIMEOUT_MS = 30000;
const UA = 'logoapi-mcp/' + pkg.version;

let sessionId = null;
let protocolVersion = null;

function log(msg) {
  process.stderr.write('[logoapi-mcp] ' + msg + '\n');
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function sendError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function hasId(m) {
  return m && typeof m === 'object' && !Array.isArray(m) && m.id !== undefined && m.id !== null && m.method !== undefined;
}

// Parse a response body into a list of JSON-RPC messages.
function parseBody(text, contentType) {
  if (!text || !text.trim()) return [];
  if (/text\/event-stream/i.test(contentType || '')) {
    const out = [];
    for (const event of text.split(/\r?\n\r?\n/)) {
      const data = event
        .split(/\r?\n/)
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).replace(/^ /, ''))
        .join('\n');
      if (!data.trim()) continue;
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    }
    return out;
  }
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function post(msg) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'User-Agent': UA,
  };
  if (protocolVersion) headers['MCP-Protocol-Version'] = protocolVersion;
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const res = await fetch(URL_, {
    method: 'POST',
    headers,
    body: JSON.stringify(msg),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;
  const text = await res.text();

  if (res.status === 202 || (res.ok && !text.trim())) return [];
  if (!res.ok) {
    if (res.status === 429) throw new Error('LogoAPI MCP is rate limited (HTTP 429). Try again later.');
    throw new Error('LogoAPI MCP server returned HTTP ' + res.status + '.');
  }
  try {
    return parseBody(text, res.headers.get('content-type'));
  } catch (e) {
    throw new Error('LogoAPI MCP server sent a reply that is not JSON.');
  }
}

async function handle(msg) {
  const ids = (Array.isArray(msg) ? msg : [msg]).filter(hasId).map((m) => m.id);
  try {
    const replies = await post(msg);
    for (const r of replies) {
      send(r);
      if (!Array.isArray(msg) && msg.method === 'initialize' && r && r.result && r.result.protocolVersion) {
        protocolVersion = r.result.protocolVersion;
      }
    }
  } catch (e) {
    const reason = e && e.name === 'TimeoutError'
      ? 'LogoAPI MCP request timed out after 30 seconds.'
      : e && e.message && /^LogoAPI/.test(e.message)
        ? e.message
        : 'Could not reach the LogoAPI MCP server (' + ((e && e.cause && e.cause.code) || (e && e.message) || 'network error') + ').';
    log(reason);
    for (const id of ids) sendError(id, -32603, reason);
  }
}

const inflight = new Set();
let initPromise = null;

function dispatch(msg) {
  const isInit = !Array.isArray(msg) && msg && msg.method === 'initialize';
  let p;
  if (isInit) {
    p = handle(msg);
    initPromise = p;
  } else {
    // Wait for initialize so the protocol version and session id are known.
    p = (initPromise || Promise.resolve()).then(() => handle(msg));
  }
  inflight.add(p);
  p.finally(() => inflight.delete(p));
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch (e) {
    sendError(null, -32700, 'Parse error: input line is not valid JSON.');
    return;
  }
  if (!msg || typeof msg !== 'object') {
    sendError(null, -32600, 'Invalid request: expected a JSON-RPC object.');
    return;
  }
  dispatch(msg);
});
rl.on('close', async () => {
  while (inflight.size) await Promise.allSettled([...inflight]);
  process.exit(0);
});
