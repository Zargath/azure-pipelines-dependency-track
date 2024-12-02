# Dependency Track for Azure DevOps Pipelines
Azure DevOps extension for submitting BOM reports to Dependency-Track

## Migrating from GSoft to EShaar
In November of 2023, after 11 years of working for GSoft, now know as Workleap, I have moved on to other projects. Because of this, I have no longer been unable to maintain the GSoft version of this extension. It is for this reason I have forked it and published a new one under my own name.

To use this never version, simply update the task id from `upload-bom-dtrack-task` to `upload-bom-dtrack` in your pipeline definition. No need to remove the GSoft extension.

```yaml
- task: upload-bom-dtrack@1
  displayName: 'Upload BOM to https://dtrack.example.com/'
  inputs:
    bomFilePath: '$(Agent.TempDirectory)/bom.xml'
    dtrackProjId: '00000000-0000-0000-0000-000000000000'
    dtrackAPIKey: '$(dtrackAPIKey)'
    dtrackURI: 'https://dtrack.example.com/'
```

## Parameters
### Base Settings
| Name    | Id |      Description      |  Required |
|---------|---|:-------------|------|
| BOM File Path | bomFilePath |  The path where the BOM file is located. (e.g. 'directory/**/bom.xml'). | True |
| Project Id | dtrackProjId | The guid of the project in Dependency Track. Required if project name and version are not specified. | False |
| Project Name | dtrackProjName | The name of the project in Dependency Track. Required if project id is not specified. | False |
| Project Version | dtrackProjVersion | The version of the project in Dependency Track. Required if project id is not specified. | False |
| Auto Create Project | dtrackProjAutoCreate | When set to TRUE and the project in Dependency Track does not exist, it will be created. Requires project name and version to be specified. The API Key will need the PORTFOLIO_MANAGEMENT or PROJECT_CREATION_UPLOAD permission. Default: False | False |
| Parent Project Name | dtrackParentProjName | The name of the parent project in Dependency Track. Only works if Auto Create Project is set to TRUE. | FALSE |
| Parent Project Version | dtrackParentProjVersion | The version of the parent project in Dependency Track. Only works if Auto Create Project is set to TRUE. | FALSE |
| Is Latest Version | dtrackIsLatest | Sets the new child project as the latest version. Requires parent project name and version to be specified. Only works if Auto Create Project is set to TRUE. Defaults to false. | FALSE |
| API Key | dtrackAPIKey | The Dependency Track API key. Ignored if Service Connection is specified. | False |
| Dependency Track URI | dtrackURI | The URL to the Dependency Track platform. Ignored if Service Connection is specified. | False |
| Service Connection | serviceConnection | Generic service connection that contains the Dependency Track URI and API Key. | False |

### Threshold Options
Setting these options will force the task to wait for the BOM analysis to be finished and the metrics to be recalculated before finishing the task.

| Name    | Id |      Description      |  Required |
|---------|---|:-------------|------|
| Action on Threshold | thresholdAction |  The result of the task if the threshold is attained. Values are `none`, `warn`, and `error`.   | False |
| Critical Vulnerability Count | thresholdCritical | Maximum number of critical vulnerabilities to tolerate. A value of `-1` disables this threshold. | False |
| High Vulnerability Count | thresholdHigh | Maximum number of high vulnerabilities to tolerate. A value of `-1` disables this threshold. | False |
| Medium Vulnerability Count | thresholdMedium | Maximum number of medium vulnerabilities to tolerate. A value of `-1` disables this threshold. | False |
| Low Vulnerability Count | thresholdLow | Maximum number of low vulnerabilities to tolerate. A value of `-1` disables this threshold. | False |
| Unassigned Vulnerability Count | thresholdUnassigned | Maximum number of unassigned vulnerabilities to tolerate. A value of `-1` disables this threshold. | False |
| Fail Policy Violation Count | thresholdpolicyViolationsFail | Maximum number of failed policy violations to tolerate. A value of `-1` disables this threshold. | False |
| Warn Policy Violation Count | thresholdpolicyViolationsWarn | Maximum number of warn policy violations to tolerate. A value of `-1` disables this threshold. | False |
| Info Policy Violation Count | thresholdpolicyViolationsInfo | Maximum number of info policy violations to tolerate. A value of `-1` disables this threshold. | False |
| Total Policy Violation Count | thresholdpolicyViolationsTotal | Maximum number of Total policy violations to tolerate. A value of `-1` disables this threshold. | False |

### SSL Options
| Name    | Id |      Description      |  Required |
|---------|---|:-------------|------|
| Trusted CA certificate | caFilePath | File path to PEM encoded CA certificate. This setting is used when Dependency Track is using a self-signed certificate or an internal CA provider for it's TLS configuration. | False |

## Basic Usage Example
```yaml
trigger:
- master

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
  displayName: 'Install Node.js'

- script: |
    npm install
    npm install -g @cyclonedx/cyclonedx-npm
  displayName: 'npm install'

- script: |
    cyclonedx-npm --version
    cyclonedx-npm --output-file '$(Agent.TempDirectory)/bom.xml'
  displayName: 'Create BOM'

- task: upload-bom-dtrack@1
  displayName: 'Upload BOM to https://dtrack.example.com/'
  inputs:
    bomFilePath: '$(Agent.TempDirectory)/bom.xml'
    dtrackProjId: '00000000-0000-0000-0000-000000000000'
    dtrackAPIKey: '$(dtrackAPIKey)'
    dtrackURI: 'https://dtrack.example.com/'
```

## Auto Create Project Usage Example
```yaml
trigger:
- master

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
  displayName: 'Install Node.js'

- script: |
    npm install
    npm install -g @cyclonedx/cyclonedx-npm
  displayName: 'npm install'

- script: |
    cyclonedx-npm --version
    cyclonedx-npm --output-file '$(Agent.TempDirectory)/bom.xml'
  displayName: 'Create BOM'

- task: upload-bom-dtrack@1
  displayName: 'Upload BOM to https://dtrack.example.com/'
  inputs:
    bomFilePath: '$(Agent.TempDirectory)/bom.xml'
    dtrackProjName: 'Test Project'
    dtrackProjVersion: 'v1.2'
    dtrackProjAutoCreate: true
    dtrackAPIKey: '$(dtrackAPIKey)'
    dtrackURI: 'https://dtrack.example.com/'
```

## Thresholds Usage Example
This example finishes the pipeline with a warning if the number of low vulnerabilities surpasse zero.
![Low Threshold Surpassed Warning](images/pipelineThresholdWarning.png)
```yaml
trigger:
- master

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
  displayName: 'Install Node.js'

- script: |
    npm install
    npm install -g @cyclonedx/cyclonedx-npm
  displayName: 'npm install'

- script: |
    cyclonedx-npm --version
    cyclonedx-npm --output-file '$(Agent.TempDirectory)/bom.xml'
  displayName: 'Create BOM'

- task: upload-bom-dtrack@1
  displayName: 'Upload BOM to https://dtrack.example.com/'
  inputs:
    bomFilePath: '$(Agent.TempDirectory)/bom.xml'
    dtrackProjId: '00000000-0000-0000-0000-000000000000'
    dtrackAPIKey: '$(dtrackAPIKey)'
    dtrackURI: 'https://dtrack.example.com/'
    thresholdAction: 'warn'
    thresholdLow: '0'
```
## Installation
Dependency Track for Azure DevOps Pipelines can be installed from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=eshaar-me.vss-dependency-track-integration).

## License
This code is licensed under the Apache License, Version 2.0. You may obtain a copy of this license [HERE](LICENSE).

Dependency-Track is Copyright (c) OWASP Foundation. All Rights Reserved.
https://github.com/DependencyTrack/dependency-track
