class Utils {
    static sleepAsync(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Produces a stable, order-independent identity key for a project's current findings
    // and policy violations. Two snapshots taken with the same key mean the underlying data
    // hasn't changed - used to tell a legitimately unchanged re-analysis apart from one that's
    // still stuck, without needing to replicate Dependency Track's own severity/dedup rules.
    static computeFindingsViolationsKey(findings, violations) {
        const findingKeys = (findings || [])
            .map(f => `${f.matrix}:${f.analysis?.isSuppressed}`)
            .sort();
        const violationKeys = (violations || [])
            .map(v => `${v.uuid}`)
            .sort();
        return JSON.stringify({ findings: findingKeys, violations: violationKeys });
    }

    static getErrorMessage(err){
        if (err.response) {
            return `${err.response.status} - ${err.response.statusText}`;
        }

        if (err.error) {
            let errorMsg;
            try {
                errorMsg = JSON.stringify(err.error);
            }
            catch {
                errorMsg = err.error;
            }

            return `${errorMsg}`;
        }

        return `${err}`;
    }
}
export default Utils;
