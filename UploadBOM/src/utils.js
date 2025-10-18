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
}
export default Utils;