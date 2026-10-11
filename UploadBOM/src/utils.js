class Utils {
    static sleepAsync(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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

    static isVersionAtLeast(version, minVersion) {
        const parse = (v) => (v || '').split('-')[0].split('.').map(Number);
        const [vMajor, vMinor, vPatch] = parse(version);
        const [mMajor, mMinor, mPatch] = parse(minVersion);

        if ([vMajor, vMinor, vPatch].some(Number.isNaN)) {
            return false;
        }
        if (vMajor !== mMajor) return vMajor > mMajor;
        if (vMinor !== mMinor) return vMinor > mMinor;
        return vPatch >= mPatch;
    }
}
export default Utils;
