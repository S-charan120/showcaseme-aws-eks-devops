const test = require('node:test');
const assert = require('node:assert/strict');
const { app, pool } = require('../src/server');

test.after(async () => pool.end());

async function withServer(t, run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  await run(`http://127.0.0.1:${server.address().port}`);
}

test('health endpoint is available without database credentials', async t => {
  await withServer(t, async base => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', service: 'showcaseme-api' });
  });
});

test('readiness accurately reflects database availability', async t => {
  await withServer(t, async base => {
    const response = await fetch(`${base}/ready`);
    if (process.env.DATABASE_URL) {
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'ready', database: 'ok' });
    } else {
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { status: 'not-ready', database: 'unavailable' });
    }
  });
});
