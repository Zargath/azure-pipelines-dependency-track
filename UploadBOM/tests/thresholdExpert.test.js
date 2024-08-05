import ThresholdExpert from '../src/ThresholdExpert.js'

test('Should not evaluate threshold if all thresholds are less than zero.', () => {
    let expert = new ThresholdExpert(-1, -1, -1, -1, -1, -1, -1, -1, -1);

    let expected = false;
    let actual = expert.areThresholdsValidated();
    
    expect(actual).toBe(expected);
});

test('Should evaluate threshold if any threshold not less than zero.', () => {
    let expert = new ThresholdExpert(-1, 0, -1, -1, -1, -1, -1, -1, -1);

    let expected = true;
    let actual = expert.areThresholdsValidated();
    
    expect(actual).toBe(expected);
});

test('Should not throw error when critical count is 1 and critical threshold is less than zero.', () => {
    let criticalThreshold = -1;
    let expert = new ThresholdExpert(criticalThreshold, -1, -1, -1, -1, -1, -1, -1, -1);
    let metrics = { critical: 1 }
    
    expect(() => { expert.validateThresholds(metrics) }).not.toThrow();
});

test('Should throw error when critical count is higher than threshold.', () => {
    let criticalThreshold = 1;
    let expert = new ThresholdExpert(criticalThreshold, -1, -1, -1, -1, -1, -1, -1, -1);
    let metrics = { critical: 2 }
    
    expect(() => { expert.validateThresholds(metrics) }).toThrow();
});

test('Should not throw error when critical count is equal to threshold.', () => {
    let criticalThreshold = 1;
    let expert = new ThresholdExpert(criticalThreshold, -1, -1, -1, -1, -1, -1, -1, -1);
    let metrics = { critical: 1 }
    
    expect(() => { expert.validateThresholds(metrics) }).not.toThrow();
});