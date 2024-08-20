import ThresholdExpert from '../src/ThresholdExpert.js'

test('Should not evaluate threshold if all thresholds are less than zero.', () => {
    let expert = new ThresholdExpert(-1, -1, -1, -1, -1, -1, -1, -1, -1);

    let expected = false;
    let actual = expert.areThresholdsValidated();
    
    expect(actual).toBe(expected);
});

test('Should evaluate threshold if any threshold not less than zero.', () => {
    const thresholds = [-1, -1, -1, -1, -1, -1, -1, -1, -1]
    for (let i = 0; i < thresholds.length; i++) {
        thresholds[i] = 0

        let expert = new ThresholdExpert(...thresholds);

        let expected = true;
        let actual = expert.areThresholdsValidated();
        
        expect(actual).toBe(expected);

        thresholds[i] = -1
    }
});

test('Should not throw error when any vulnerability count is 1 and the threshold is less than zero.', () => {
    const metrics = { 
        critical: 1, 
        high: 1, 
        medium: 1, 
        low: 1, 
        unassigned: 1, 
        policyViolationsFail: 1, 
        policyViolationsWarn: 1, 
        policyViolationsInfo: 1, 
        policyViolationsTotal: 1 
    }

    let expert = new ThresholdExpert(-1, -1, -1, -1, -1, -1, -1, -1, -1);
    
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