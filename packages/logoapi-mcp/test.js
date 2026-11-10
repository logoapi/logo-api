'use strict';
// Local tests only: a fake MCP server on 127.0.0.1, no network to production.
const assert = require('assert');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const pkg = require('./package.json');

const BIN = path.join(__dirname, 'bin.js');
const seen = [];

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const msg = JSON.parse(body);
    seen.push({ headers: req.headers, msg });
    const reply = (obj) => ({ jsonrpc: '2.0', id: msg.id, result: obj });
    switch (msg.method) {
      case 'initialize':
        res.writeHead(200, { 'Content-Type': 'application/json', 'Mcp-Session-Id': 'sess-1' });
        return res.end(JSON.stringify(reply({ protocolVersion: '2025-06-18', capabilities: {} })));
      case 'ping':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(reply({ pong: true })));
      case 'sse':
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        return res.end('event: message\ndata: ' + JSON.stringify(reply({ sse: true })) + '\n\n');
      case 'notifications/initialized':
        res.writeHead(202);
        return res.end();
      case 'html500':
        res.writeHead(500, { 'Content-Type': 'text/html' });
        return res.end('<html><body>Cloudflare error</body></html>');
      case 'html200':
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end('<html>challenge</html>');
      case 'rpcerr':
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'bad params' } }));
      case 'rpcerr429':
        res.writeHead(429, { 'Content-Type': 'text/event-stream' });
        return res.end('data: ' + JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'limit' } }) + '\n\n');
      case 'empty':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end();
      case 'emptysse':
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        return res.end();
      case 'wrongid':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ jsonrpc: '2.0', id: 999, result: {} }));
      case 'nullid':
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'nope' } }));
      case 'gone':
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('session not found');
      case 'r429':
        res.writeHead(429, { 'Content-Type': 'application/json' });
        return res.end('{"error":"slow down"}');
      case 'slow':
        return setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(reply({ slow: true })));
        }, 300);
      default:
        res.writeHead(404);
        return res.end();
    }
  });
});

function run(url, lines, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN, ...(opts.args || [])], {
      env: { ...process.env, LOGOAPI_MCP_URL: url },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      const msgs = opts.args ? [] : out.split('\n').filter(Boolean).map((l) => JSON.parse(l)); // stdout must be JSON-only
      resolve({ code, msgs, err, out });
    });
    (async () => {
      for (const l of lines) {
        child.stdin.write(l + '\n');
        if (opts.gap) await new Promise((r2) => setTimeout(r2, opts.gap));
      }
      child.stdin.end();
    })();
  });
}

const rpc = (id, method, params) => JSON.stringify({ jsonrpc: '2.0', id, method, params });

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/mcp';

  // flags
  let r = await run(url, [], { args: ['--version'] });
  assert.strictEqual(r.out.trim(), pkg.version);
  r = await run(url, [], { args: ['--help'] });
  assert(r.out.includes('LOGOAPI_MCP_URL'));

  // normal JSON, SSE, 202 notification, headers
  seen.length = 0;
  r = await run(url, [
    rpc(1, 'initialize', { protocolVersion: '2025-06-18' }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    rpc(2, 'ping'),
    rpc(3, 'sse'),
  ]);
  assert.strictEqual(r.code, 0);
  const byId = Object.fromEntries(r.msgs.map((m) => [m.id, m]));
  assert.strictEqual(r.msgs.length, 3, 'notification writes nothing');
  assert.strictEqual(byId[1].result.protocolVersion, '2025-06-18');
  assert.strictEqual(byId[2].result.pong, true);
  assert.strictEqual(byId[3].result.sse, true);
  assert.strictEqual(seen[0].headers['user-agent'], 'logoapi-mcp/' + pkg.version);
  assert(seen[0].headers.accept.includes('text/event-stream'));
  assert.strictEqual(seen[0].headers['mcp-protocol-version'], undefined);
  for (const s of seen.slice(1)) {
    assert.strictEqual(s.headers['mcp-protocol-version'], '2025-06-18');
    assert.strictEqual(s.headers['mcp-session-id'], 'sess-1');
  }

  // 500 HTML, HTML on 200, 429
  r = await run(url, [rpc(5, 'html500'), rpc(6, 'html200'), rpc(7, 'r429')]);
  assert.strictEqual(r.code, 0);
  const e = Object.fromEntries(r.msgs.map((m) => [m.id, m]));
  assert.strictEqual(e[5].error.code, -32603);
  assert(e[5].error.message.includes('500'));
  assert.strictEqual(e[6].error.code, -32603);
  assert(e[6].error.message.includes('not JSON'));
  assert.strictEqual(e[7].error.code, -32603);
  assert(e[7].error.message.includes('429'));
  assert(!r.out.includes('<html'), 'no HTML on stdout');

  // error on a notification: nothing on stdout
  r = await run(url, [JSON.stringify({ jsonrpc: '2.0', method: 'html500' })]);
  assert.strictEqual(r.msgs.length, 0);

  // network down
  r = await run('http://127.0.0.1:1/mcp', [rpc(8, 'ping')]);
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.msgs[0].id, 8);
  assert.strictEqual(r.msgs[0].error.code, -32603);

  // parse error
  r = await run(url, ['{not json', rpc(9, 'ping')]);
  assert.strictEqual(r.msgs[0].id, null);
  assert.strictEqual(r.msgs[0].error.code, -32700);
  assert.strictEqual(r.msgs[1].result.pong, true);

  // stdin closes while a request is in flight: still answered, exit 0
  r = await run(url, [rpc(10, 'slow')]);
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.msgs[0].result.slow, true);

  // server JSON-RPC error on non-ok status is forwarded as is (JSON and SSE)
  r = await run(url, [rpc(11, 'rpcerr'), rpc(12, 'rpcerr429')]);
  const f = Object.fromEntries(r.msgs.map((m) => [m.id, m]));
  assert.strictEqual(f[11].error.code, -32602);
  assert.strictEqual(f[11].error.message, 'bad params');
  assert.strictEqual(f[12].error.code, -32000);
  assert.strictEqual(f[12].error.message, 'limit');

  // batch array is split into separate POSTs, one reply line each
  seen.length = 0;
  r = await run(url, [JSON.stringify([JSON.parse(rpc(13, 'ping')), JSON.parse(rpc(14, 'sse'))])]);
  assert.strictEqual(r.msgs.length, 2);
  assert.strictEqual(seen.length, 2);
  assert(seen.every((s) => !Array.isArray(s.msg)));
  const g = Object.fromEntries(r.msgs.map((m) => [m.id, m]));
  assert.strictEqual(g[13].result.pong, true);
  assert.strictEqual(g[14].result.sse, true);

  // many replies, then stdin close: no output lost, clean exit
  r = await run(url, Array.from({ length: 50 }, (_, i) => rpc(100 + i, 'ping')));
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.msgs.length, 50);

  // every request id gets an answer: empty body, empty SSE, mismatched id
  r = await run(url, [rpc(20, 'empty'), rpc(21, 'emptysse'), rpc(22, 'wrongid')]);
  assert.strictEqual(r.msgs.length, 3);
  for (const m of r.msgs) {
    assert.strictEqual(m.error.code, -32603);
    assert([20, 21, 22].includes(m.id));
  }
  // a notification with an empty reply still writes nothing
  r = await run(url, [JSON.stringify({ jsonrpc: '2.0', method: 'empty' })]);
  assert.strictEqual(r.msgs.length, 0);

  // server error with null id gets the request id
  r = await run(url, [rpc(23, 'nullid')]);
  assert.strictEqual(r.msgs[0].id, 23);
  assert.strictEqual(r.msgs[0].error.message, 'nope');

  // 404 with a session: next request carries no session or protocol headers
  seen.length = 0;
  r = await run(url, [rpc(1, 'initialize'), rpc(30, 'gone'), rpc(31, 'ping')], { gap: 200 });
  assert.strictEqual(r.msgs.length, 3);
  const last = seen[seen.length - 1];
  assert.strictEqual(last.msg.method, 'ping');
  assert.strictEqual(last.headers['mcp-session-id'], undefined);
  assert.strictEqual(last.headers['mcp-protocol-version'], undefined);
  assert.strictEqual(seen[1].headers['mcp-session-id'], 'sess-1');

  server.close();
  console.log('ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
