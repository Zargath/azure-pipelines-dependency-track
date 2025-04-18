import * as tl from "azure-pipelines-task-lib/task"
import { localize } from './localization.js'

class TaskParametersUtility {
    static GetParameters() {
        let dtrackAPIKey;
        let dtrackURI;

        let serviceConnectionId = tl.getInput('serviceConnection', false);
        if (serviceConnectionId) {
            dtrackURI = tl.getEndpointUrl(serviceConnectionId, false);
            dtrackAPIKey = tl.getEndpointAuthorizationParameter(serviceConnectionId, 'password', false);
        }
        else {
            dtrackURI = tl.getInput('dtrackURI', true);
            dtrackAPIKey = tl.getInput('dtrackAPIKey', true);
        }

        let params = {
            projectId: tl.getInput('dtrackProjId', false),
            projectName: tl.getInput('dtrackProjName', false),
            projectVersion: tl.getInput('dtrackProjVersion', false),

            projectDescription: tl.getInput('dtrackProjDescription', false),
            projectClassifier: tl.getInput('dtrackProjClassifier', false),
            projectSwidTagId: tl.getInput('dtrackProjSwidTagId', false),
            projectGroup: tl.getInput('dtrackProjGroup', false),
            projectTags: tl.getInput('dtrackProjTags', false)?.split('\n'),

            isProjectAutoCreated: tl.getBoolInput('dtrackProjAutoCreate', false),
            parentProjectName: tl.getInput('dtrackParentProjName', false),
            parentProjectVersion: tl.getInput('dtrackParentProjVersion', false),
            isLatest: tl.getBoolInput('dtrackIsLatest', false),
            bomFilePath: tl.getPathInput('bomFilePath', true, true),
            dtrackAPIKey: dtrackAPIKey,
            dtrackURI: dtrackURI,
            caFilePath: tl.getPathInput('caFilePath', false, true),

            thresholdAction: tl.getInput('thresholdAction', false) || 'none',
            thresholdCritical: tl.getInput('thresholdCritical', false) || -1,
            thresholdHigh: tl.getInput('thresholdHigh', false) || -1,
            thresholdMedium: tl.getInput('thresholdMedium', false) || -1,
            thresholdLow: tl.getInput('thresholdLow', false) || -1,
            thresholdUnassigned: tl.getInput('thresholdUnassigned', false) || -1,

            thresholdpolicyViolationsFail: tl.getInput('thresholdpolicyViolationsFail', false) || -1,
            thresholdpolicyViolationsWarn: tl.getInput('thresholdpolicyViolationsWarn', false) || -1,
            thresholdpolicyViolationsInfo: tl.getInput('thresholdpolicyViolationsInfo', false) || -1,
            thresholdpolicyViolationsTotal: tl.getInput('thresholdpolicyViolationsTotal', false) || -1,
        };

        return params;
    }

    static ValidateParameters(params) {
        if (!params.projectName || !params.projectVersion) {
            if (params.isProjectAutoCreated) {
                throw new Error(localize("MissingProjectInfoWhenAutoCreate"));
            }

            if (!params.projectId) {
                throw new Error(localize("MissingProjectInfoWhenNoProjectId"));
            }
        }
    }
}
export default TaskParametersUtility;