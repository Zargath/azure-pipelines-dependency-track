import Utils from '../../src/utils';

describe('Utils.computeFindingsViolationsKey', () => {
  const finding = (matrix, isSuppressed = false) => ({ matrix, analysis: { isSuppressed } });
  const violation = (uuid) => ({ uuid });

  it('produces the same key for identical findings/violations regardless of order', () => {
    const a = Utils.computeFindingsViolationsKey(
      [finding('p:c1:v1'), finding('p:c2:v2')],
      [violation('vio-1'), violation('vio-2')]
    );
    const b = Utils.computeFindingsViolationsKey(
      [finding('p:c2:v2'), finding('p:c1:v1')],
      [violation('vio-2'), violation('vio-1')]
    );

    expect(a).toBe(b);
  });

  it('produces a different key when a finding is added', () => {
    const before = Utils.computeFindingsViolationsKey([finding('p:c1:v1')], []);
    const after = Utils.computeFindingsViolationsKey([finding('p:c1:v1'), finding('p:c2:v2')], []);

    expect(before).not.toBe(after);
  });

  it('produces a different key when a finding is removed', () => {
    const before = Utils.computeFindingsViolationsKey([finding('p:c1:v1'), finding('p:c2:v2')], []);
    const after = Utils.computeFindingsViolationsKey([finding('p:c1:v1')], []);

    expect(before).not.toBe(after);
  });

  it('produces a different key when suppression state changes', () => {
    const before = Utils.computeFindingsViolationsKey([finding('p:c1:v1', false)], []);
    const after = Utils.computeFindingsViolationsKey([finding('p:c1:v1', true)], []);

    expect(before).not.toBe(after);
  });

  it('produces a different key when violations change', () => {
    const before = Utils.computeFindingsViolationsKey([], [violation('vio-1')]);
    const after = Utils.computeFindingsViolationsKey([], [violation('vio-1'), violation('vio-2')]);

    expect(before).not.toBe(after);
  });

  it('treats missing/empty lists as equal', () => {
    const a = Utils.computeFindingsViolationsKey(undefined, undefined);
    const b = Utils.computeFindingsViolationsKey([], []);

    expect(a).toBe(b);
  });
});
