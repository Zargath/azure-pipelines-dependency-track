const http = require('http');
const mockTaskLib = require('./mocks/mockTaskLib');
const DTrackClient = require('../../src/dtrackClient').default;
const DTrackManager = require('../../src/dtrackManager').default;

// Mock the Azure DevOps task library to prevent localization warnings, while still
// resolving real messages from task.json via mockTaskLib's loc() implementation.
jest.mock('azure-pipelines-task-lib/task', () => mockTaskLib);

// These tests exercise the real DTrackClient + DTrackManager over real HTTP (not mocked
// functions) to prove the polling timeout actually bounds the wait end-to-end. They run
// against a tiny local stub server rather than a real Dependency Track instance, because
// a real DT server reliably completes processing/metrics quickly (confirmed separately
// against live 5.1.1/5.0.2 instances) - there is no known way to make a real server get
// deterministically and permanently "stuck" for test purposes. The stub simulates that
// stuck state directly and deterministically instead.
describe('Polling timeout - end-to-end over real HTTP', () => {
  let server;
  let baseUrl;
  let client;

  function startStubServer(handler) {
    return new Promise((resolve) => {
      server = http.createServer(handler);
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  }

  afterEach((done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('waitEventProcessing times out when the server reports "processing" forever', async () => {
    let requestCount = 0;
    await startStubServer((req, res) => {
      requestCount++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ processing: true }));
    });

    client = new DTrackClient(baseUrl, 'test-api-key');
    const dtrackManager = new DTrackManager(client, 2);

    const startTime = Date.now();
    await expect(dtrackManager.waitEventProcessing('some-token'))
      .rejects
      .toThrow('Polling Dependency Track for update timed out after 2 seconds.');
    const elapsedMs = Date.now() - startTime;

    expect(elapsedMs).toBeGreaterThanOrEqual(2000);
    // A 2s timeout with a 2s poll interval should only allow a small, bounded number of requests.
    expect(requestCount).toBeGreaterThan(0);
    expect(requestCount).toBeLessThan(5);
  });

  it('waitMetricsRefresh times out when lastOccurrence never catches up to lastBomImport', async () => {
    const lastBomImport = new Date().toISOString();
    const staleOccurrence = new Date(Date.now() - 60000).toISOString();

    await startStubServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url.startsWith('/api/v1/project/')) {
        res.end(JSON.stringify({ lastBomImport }));
      } else if (req.url.startsWith('/api/v1/metrics/project/')) {
        res.end(JSON.stringify({ lastOccurrence: staleOccurrence }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    client = new DTrackClient(baseUrl, 'test-api-key');
    const dtrackManager = new DTrackManager(client, 2);

    const startTime = Date.now();
    await expect(dtrackManager.waitMetricsRefresh('some-project-id'))
      .rejects
      .toThrow('Polling Dependency Track for update timed out after 2 seconds.');
    const elapsedMs = Date.now() - startTime;

    expect(elapsedMs).toBeGreaterThanOrEqual(2000);
  });
});
