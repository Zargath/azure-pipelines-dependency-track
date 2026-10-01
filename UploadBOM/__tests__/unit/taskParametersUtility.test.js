import TaskParametersUtility from '../../src/taskParametersUtility';

jest.mock('../../src/localization', () => ({
  localize: jest.fn((key, ...params) => `${key}: ${params.join(' ')}`)
}));

describe('TaskParametersUtility', () => {
  describe('ValidateParameters - pollingTimeoutSeconds', () => {
    const baseParams = {
      projectId: '123e4567-e89b-12d3-a456-426614174000'
    };

    it('should accept the default value', () => {
      expect(() => TaskParametersUtility.ValidateParameters({ ...baseParams, pollingTimeoutSeconds: '300' }))
        .not.toThrow();
    });

    it.each(['0', '-5', 'abc', undefined])('should reject %s', (value) => {
      expect(() => TaskParametersUtility.ValidateParameters({ ...baseParams, pollingTimeoutSeconds: value }))
        .toThrow(/^InvalidPollingTimeout:/);
    });
  });
});
