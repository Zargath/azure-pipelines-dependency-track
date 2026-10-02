const path = require('path');
const fs = require('fs');
const mockTaskLib = require('./mocks/mockTaskLib');
const DTrackTestFixture = require('./fixtures/DTrackTestFixture');
const { getTestApiKey, generateUniqueName } = require('./test-utils');

const { run } = require('../../src/task.js');

jest.mock('azure-pipelines-task-lib/task', () => mockTaskLib);

process.env.NODE_ENV = 'test';

/**
 * Reproduces the real-world bug reported against a live pipeline: re-uploading an
 * unchanged BOM to the same project on DT 5.1.x never advances PROJECTMETRICS.LAST_OCCURRENCE
 * (DT's own dedup optimization - see UPDATE_PROJECT_METRICS - skips the insert when the newly
 * computed values are identical to today's existing row), so waitMetricsRefresh's
 * `lastOccurrence >= lastBomImport` check can never become true again and the task times out,
 * even though nothing is actually wrong.
 */
describe('Metrics dedup-skip on re-upload (real production regression)', () => {
  const BASE_URL = 'https://localhost:8080';
  let apiKey;
  let caFilePath;
  let vulnerableBomFilePath;
  let isV4;

  beforeAll(async () => {
    // Needs VIEW_VULNERABILITY + VIEW_POLICY_VIOLATION (none of the scoped test teams grant
    // these) so the fix's findings/violations snapshot actually runs instead of silently
    // falling back - see the separate "missing permissions" test below for that fallback path.
    apiKey = getTestApiKey();
    caFilePath = path.join(__dirname, '../../../test-environment/certs/apiserver.crt');
    vulnerableBomFilePath = path.join(__dirname, 'fixtures/vulnerable-bom.json');

    const caFile = fs.existsSync(caFilePath) ? fs.readFileSync(caFilePath) : undefined;
    const fixture = new DTrackTestFixture(BASE_URL, apiKey, caFile);
    isV4 = (await fixture.getMajorVersion()) < 5;
  });

  beforeEach(() => {
    mockTaskLib.reset();
  });

  it('succeeds on a second, unchanged upload instead of timing out', async () => {
    const projectName = generateUniqueName('dedup-skip-test');
    const projectVersion = '1.0.0';

    const runUpload = () => {
      mockTaskLib.reset();
      mockTaskLib.setInput('dtrackURI', BASE_URL);
      mockTaskLib.setInput('dtrackAPIKey', apiKey);
      mockTaskLib.setInput('dtrackProjName', projectName);
      mockTaskLib.setInput('dtrackProjVersion', projectVersion);
      mockTaskLib.setBoolInput('dtrackProjAutoCreate', true);
      mockTaskLib.setBoolInput('dtrackIsLatest', true);
      mockTaskLib.setPathInput('bomFilePath', vulnerableBomFilePath, true, true);
      mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
      mockTaskLib.setStats(vulnerableBomFilePath, { isFile: () => true });
      mockTaskLib.setStats(caFilePath, { isFile: () => true });
      mockTaskLib.setInput('thresholdAction', 'warn');
      // High enough that a real breach never interferes with this test - we only care
      // about whether waitMetricsRefresh resolves, not threshold evaluation itself.
      mockTaskLib.setInput('thresholdCritical', '999');
      mockTaskLib.setInput('thresholdHigh', '999');
      // Short timeout so a regression fails this test in seconds, not minutes.
      mockTaskLib.setInput('dtrackPollingTimeoutSeconds', '15');
      return run();
    };

    // First upload: brand-new project, no prior same-day PROJECTMETRICS row, so this
    // always works today - establishes the project and its initial metrics.
    await expect(runUpload()).resolves.toBeDefined();

    // Second upload: identical BOM, same project. DT's own analysis will compute the
    // exact same metrics values as the first run and dedup-skip the insert - this is
    // the real scenario that was hanging/timing out in production.
    await expect(runUpload()).resolves.toBeDefined();
  }, 60000);

  it('falls back to the original timeout error when the API key lacks VIEW_VULNERABILITY/VIEW_POLICY_VIOLATION', async () => {
    if (isV4) {
      // DT v4 has no metrics dedup-skip optimization at all (that's 5.1.x-specific), so a
      // repeat upload always gets a fresh metrics row regardless of permissions - there's no
      // timeout to fall back to here. This test is only meaningful on 5.1.x+.
      return;
    }

    const projectName = generateUniqueName('dedup-skip-no-permission-test');
    const projectVersion = '1.0.0';
    const scopedApiKey = getTestApiKey('Project-Creator');

    const runUpload = () => {
      mockTaskLib.reset();
      mockTaskLib.setInput('dtrackURI', BASE_URL);
      mockTaskLib.setInput('dtrackAPIKey', scopedApiKey);
      mockTaskLib.setInput('dtrackProjName', projectName);
      mockTaskLib.setInput('dtrackProjVersion', projectVersion);
      mockTaskLib.setBoolInput('dtrackProjAutoCreate', true);
      mockTaskLib.setBoolInput('dtrackIsLatest', true);
      mockTaskLib.setPathInput('bomFilePath', vulnerableBomFilePath, true, true);
      mockTaskLib.setPathInput('caFilePath', caFilePath, true, true);
      mockTaskLib.setStats(vulnerableBomFilePath, { isFile: () => true });
      mockTaskLib.setStats(caFilePath, { isFile: () => true });
      mockTaskLib.setInput('thresholdAction', 'warn');
      mockTaskLib.setInput('thresholdCritical', '999');
      mockTaskLib.setInput('thresholdHigh', '999');
      mockTaskLib.setInput('dtrackPollingTimeoutSeconds', '15');
      return run();
    };

    await expect(runUpload()).resolves.toBeDefined();

    // The snapshot/comparison can't run without permission, so this must fall back to
    // exactly today's existing, understood failure mode - not a new, confusing error.
    await expect(runUpload()).rejects.toThrow('Polling Dependency Track for update timed out after 15 seconds.');
  }, 60000);
});
