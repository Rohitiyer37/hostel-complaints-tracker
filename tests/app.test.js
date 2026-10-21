// HTTP tests against the exported Express app. No database is needed:
// these routes answer before any query runs.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../app');

let server;
let base;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});

test.after(() => server.close());

const get = (path, headers = {}) => fetch(base + path, { redirect: 'manual', headers });
const postForm = (path, body) =>
  fetch(base + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  });

test('login page renders', async () => {
  const res = await get('/login');
  assert.strictEqual(res.status, 200);
  assert.match(await res.text(), /Log in/);
});

test('protected pages redirect to login without a token', async () => {
  for (const path of ['/dashboard', '/admin', '/admin/students', '/profile']) {
    const res = await get(path);
    assert.strictEqual(res.status, 302, path);
    assert.strictEqual(res.headers.get('location'), '/login');
  }
});

test('unknown pages get the 404 page', async () => {
  const res = await get('/no-such-page');
  assert.strictEqual(res.status, 404);
  assert.match(await res.text(), /Page not found/);
});

test('register validation errors are shown without touching the database', async () => {
  const res = await postForm('/register', { name: 'A', email: 'bad', password: '1' });
  assert.strictEqual(res.status, 400);
  assert.match(await res.text(), /Name must be 2 to 60 characters/);
});

test('logout sets a toast for the next page', async () => {
  const out = await get('/logout');
  assert.strictEqual(out.status, 302);
  const cookie = out.headers.getSetCookie().find((c) => c.startsWith('flash='));
  assert.ok(cookie, 'flash cookie set');

  const page = await get('/login', { Cookie: cookie.split(';')[0] });
  assert.match(await page.text(), /You have been logged out/);
});

test('login is rate limited after 10 failed attempts', async () => {
  let last;
  for (let i = 0; i < 11; i++) last = await postForm('/login', { email: '', password: '' });
  assert.strictEqual(last.status, 429);
  assert.match(await last.text(), /Too many login attempts/);
});
