import * as tl from "azure-pipelines-task-lib/task"
import { localize } from './localization.js'

class TaskParametersUtility {
    static GetParameters() {
        let dtrackAPIKey;
        let dtrackURI;
        let isLatest;

        let serviceConnectionId = tl.getInput('serviceConnection', false);
        if (serviceConnectionId) {
            dtrackURI = tl.getEndpointUrl(serviceConnectionId, false);
            dtrackAPIKey = tl.getEndpointAuthorizationParameter(serviceConnectionId, 'password', false);
        }
        else {
            dtrackURI = tl.getInput('dtrackURI', true);
            dtrackAPIKey = tl.getInput('dtrackAPIKey', true);
        }

        try {
            isLatest = tl.getBoolInput('dtrackIsLatest', true);
        } catch {
            // Leave isLatest undefined if input is not a valid boolean.
        }

        let params = {
            projectName: tl.getInput('dtrackProjName', true),
            projectVersion: tl.getInput('dtrackProjVersion', true),
            isLatest: isLatest,
            sourceVersion: tl.getInput('dtrackSourceVersion', false) || null,
            addVersionOptions: {
                tags: tl.getBoolInput('dtrackAddVersionTags', false),
                properties: tl.getBoolInput('dtrackAddVersionProperties', false),
                services: tl.getBoolInput('dtrackAddVersionServices', false),
                acl: tl.getBoolInput('dtrackAddVersionACL', false),
                components: tl.getBoolInput('dtrackAddVersionComponents', false),
                findings: tl.getBoolInput('dtrackAddVersionFindings', false),
                auditHistory: tl.getBoolInput('dtrackAddVersionAuditHistory', false),
                policyViolations: tl.getBoolInput('dtrackAddVersionPolicyViolations', false),
                policyViolationsAuditHistory: tl.getBoolInput('dtrackAddVersionPolicyViolationsAuditHistory', false),
            },
            dtrackAPIKey: dtrackAPIKey,
            dtrackURI: dtrackURI,
            caFilePath: tl.getPathInput('caFilePath', false, true),
        };

        return params;
    }

    static ValidateParameters(params) {
        if (!params.projectName || !params.projectVersion) {
            throw new Error(localize("MissingProjectInfo"));
        }
    }
}
export default TaskParametersUtility;
