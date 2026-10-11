import Utils from '../../src/utils';

describe('Utils', () => {
  describe('isVersionAtLeast', () => {
    it('should return true when version equals minVersion', () => {
      expect(Utils.isVersionAtLeast('5.2.1', '5.2.1')).toBe(true);
    });

    it('should return true when major version is greater', () => {
      expect(Utils.isVersionAtLeast('6.0.0', '5.2.1')).toBe(true);
    });

    it('should return false when major version is lower', () => {
      expect(Utils.isVersionAtLeast('4.9.9', '5.2.1')).toBe(false);
    });

    it('should return true when minor version is greater', () => {
      expect(Utils.isVersionAtLeast('5.3.0', '5.2.1')).toBe(true);
    });

    it('should return false when minor version is lower', () => {
      expect(Utils.isVersionAtLeast('5.1.9', '5.2.1')).toBe(false);
    });

    it('should return true when patch version is greater', () => {
      expect(Utils.isVersionAtLeast('5.2.2', '5.2.1')).toBe(true);
    });

    it('should return false when patch version is lower', () => {
      expect(Utils.isVersionAtLeast('5.2.0', '5.2.1')).toBe(false);
    });

    it('should compare numerically, not lexicographically', () => {
      expect(Utils.isVersionAtLeast('5.10.0', '5.2.1')).toBe(true);
      expect(Utils.isVersionAtLeast('5.9.0', '5.10.0')).toBe(false);
    });

    it('should ignore a -SNAPSHOT or other pre-release suffix', () => {
      expect(Utils.isVersionAtLeast('5.3.0-SNAPSHOT', '5.2.1')).toBe(true);
      expect(Utils.isVersionAtLeast('5.2.0-SNAPSHOT', '5.2.1')).toBe(false);
    });

    it('should return false for malformed input', () => {
      expect(Utils.isVersionAtLeast('not-a-version', '5.2.1')).toBe(false);
    });

    it('should return false for undefined input', () => {
      expect(Utils.isVersionAtLeast(undefined, '5.2.1')).toBe(false);
    });
  });
});
