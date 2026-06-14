# 🔐 Azure Pipelines Dependency-Track Extension

[![CI](https://github.com/Zargath/azure-pipelines-dependency-track/actions/workflows/prod.yml/badge.svg)](https://github.com/Zargath/azure-pipelines-dependency-track/actions/workflows/prod.yml)
[![License](https://img.shields.io/github/license/Zargath/azure-pipelines-dependency-track)](https://github.com/Zargath/azure-pipelines-dependency-track/blob/main/LICENSE)

Integrate [Dependency-Track](https://dependencytrack.org/) into your Azure DevOps pipelines to automatically upload and assess SBOM (Software Bill of Materials) files for known vulnerabilities.

---

## 🚀 Features

- Upload SBOMs (CycloneDX format) to Dependency-Track
- Automatically create projects if they don’t exist
- Fail builds based on vulnerability thresholds and policies
- Supports both manual API key input and service connections

---

## 🛠 Installation

Install the extension from the [Azure DevOps Marketplace](https://marketplace.visualstudio.com/items?itemName=eshaar-me.vss-dependency-track-integration).

---

## 📋 Usage Example

```yaml
trigger:
- master

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: UseNode@1
  inputs:
    version: '24.x'

- script: |
    npm install
    npm install -g @cyclonedx/cyclonedx-npm
  displayName: 'npm install'

- script: |
    cyclonedx-npm --version
    cyclonedx-npm --output-file '$(Agent.TempDirectory)/bom.xml'
  displayName: 'Create BOM'

- task: upload-bom-dtrack@1
  displayName: 'Upload SBOM to Dependency-Track'
  inputs:
    bomFilePath: '$(Build.TempDirectory)/bom.xml'
    dtrackProjName: 'my-app'
    dtrackProjVersion: '1.0.0'
    dtrackAPIKey: '$(DTRACK_API_KEY)'
    dtrackURI: 'https://dependency-track.example.com/'
    dtrackProjAutoCreate: true
    thresholdAction: 'warn'
    thresholdCritical: 0
    thresholdHigh: 5
```

---

## ⚙️ Input Parameters

### Required

| Name | Description |
|------|-------------|
| `bomFilePath` | Path to the SBOM file (e.g. `**/bom.xml`) |
| `serviceConnection`, or `dtrackAPIKey` and `dtrackURI` | Service connection or API key and URL to Dependency-Track |

### Project Identification

Provide **one** of the following:

| Name | Description |
|------|-------------|
| `dtrackProjId` | Existing project UUID |
| `dtrackProjName` and `dtrackProjVersion` | Project name and version (with optional auto-create) |

### Optional Inputs

| Name | Description |
|------|-------------|
| `dtrackProjAutoCreate` | Auto-create project if project doesn’t exist |
| `dtrackProjDescription` | Set the project description |
| `dtrackProjTags` | Set the prohject tags. (Each tag on a new line) |
| `dtrackProjSwidTagId` | Set the project SWID Tag Id |
| `dtrackProjGroup` | Set the project Namespace / group / vendor identifier |
| `dtrackProjClassifier` | Classifier for the project (e.g., `APPLICATION`, `FRAMEWORK`, etc.). Must be uppercase when used in YAML pipelines without quotes. |
| `dtrackParentProjName` | Parent project name (with optional auto-create) |
| `dtrackParentProjVersion` | Parent project version (with optional auto-create) |
| `dtrackIsLatest` | Sets the project as the latest version. Defaults to false. |

---

## 🗝️ Required Permissions

The following table outlines the minimum permissions required in Dependency-Track for each operation:

| Use Case | Required Permissions |
|----------|---------------------|
| **Basic upload to existing project** | `BOM_UPLOAD` |
| **Upload and create project** | `BOM_UPLOAD` + `PROJECT_CREATION_UPLOAD` |
| **Use thresholds** | `VIEW_PORTFOLIO` |
| **Update project properties** | `PORTFOLIO_MANAGEMENT` |
| **Add a new project version** (via the `AddProjectVersion` task) | `BOM_UPLOAD` + `PROJECT_CREATION_UPLOAD` + `PORTFOLIO_MANAGEMENT` |

### Recommended Setup

For most CI/CD scenarios:
```
BOM_UPLOAD + PROJECT_CREATION_UPLOAD + VIEW_PORTFOLIO
```

Add `PORTFOLIO_MANAGEMENT` if you need to set project descriptions, tags, or other properties.

---

## 🔒 Threshold Controls

Use these inputs to warn or fail the build based on detected vulnerabilities:

| Name | Description |
|------|-------------|
| `thresholdAction` | `none` (default), `warn`, or `error` |
| `thresholdCritical` | Max allowed critical vulnerabilities |
| `thresholdHigh` | Max allowed high vulnerabilities |
| `thresholdMedium` | Max allowed medium vulnerabilities |
| `thresholdLow` | Max allowed low vulnerabilities |
| `thresholdUnassigned` | Max allowed unassigned vulnerabilities |
| `thresholdpolicyViolationsFail` | Max allowed failed policy violations |
| `thresholdpolicyViolationsWarn` | Max allowed warn policy violations |
| `thresholdpolicyViolationsInfo` | Max allowed info policy violations |
| `thresholdpolicyViolationsTotal` | Max allowed total policy violations |

---

## 🔑 SSL Options

These settings are used when Dependency Track is using a self-signed certificate or an internal CA provider for it's TLS configuration.

| Name | Description |
|------|-------------|
| `caFilePath` | File path to PEM encoded CA certificate |

---

## 🧪 Notes

- SBOM must be in [CycloneDX](https://cyclonedx.org/) format.
- Use `dtrackProjAutoCreate: true` if the project might not exist yet.

### Project property updates and BOM processing

When any of the following inputs are set, the task will wait for Dependency-Track to finish processing the uploaded BOM **before** applying the project update:

- `dtrackProjDescription`
- `dtrackProjClassifier`
- `dtrackProjSwidTagId`
- `dtrackProjGroup`
- `dtrackProjTags`
- `dtrackIsLatest`

This is required because Dependency-Track v5 synchronizes certain project fields from the BOM metadata during async processing, which would otherwise overwrite values set by the task. Waiting for processing to complete first ensures the values you configure are the ones that take effect.

As a result, pipelines that set any of these properties will take longer to complete, proportional to the BOM processing time in your Dependency-Track instance.

---

## ➕ Add Project Version

The `AddProjectVersion` task adds a new version of a Dependency-Track project, carrying over audit decisions (e.g. "not affected" / "false positive") and other settings from the previous "latest" version — mirroring the "Add Version" action in the Dependency-Track UI. Run it before `UploadBOM` (with `dtrackProjAutoCreate: true`) so that newly auto-created versions start from the previous version's settings instead of a blank project.

The task looks for an existing project with the given name and version:

1. If a project with that exact name **and** version already exists, the task is a no-op.
2. Otherwise, if a "latest" version of a project with that name exists (with a different version), it is cloned into the new version, carrying over tags, properties, components, findings, audit history, policy violations, services and ACL according to the inputs below (all enabled by default).
3. If neither exists, the task is a no-op — `UploadBOM` with `dtrackProjAutoCreate: true` will create the project from scratch.

### Inputs

| Name | Description |
|------|-------------|
| `serviceConnection`, or `dtrackAPIKey` and `dtrackURI` | Service connection or API key and URL to Dependency-Track |
| `dtrackProjName` | Project name |
| `dtrackProjVersion` | Project version to add |
| `dtrackIsLatest` | Sets the new project version as the latest version. Defaults to false. |
| `dtrackAddVersionTags` | Carry over project tags. Default `true` |
| `dtrackAddVersionProperties` | Carry over project properties. Default `true` |
| `dtrackAddVersionServices` | Carry over services. Default `true` |
| `dtrackAddVersionACL` | Carry over the portfolio access control list. Default `true` |
| `dtrackAddVersionComponents` | Carry over components. Default `true` |
| `dtrackAddVersionFindings` | Carry over findings. Has no effect unless `dtrackAddVersionComponents` is also enabled. Default `true` |
| `dtrackAddVersionAuditHistory` | Carry over findings audit history. Has no effect unless `dtrackAddVersionFindings` is also enabled. Default `true` |
| `dtrackAddVersionPolicyViolations` | Carry over policy violations. Has no effect unless `dtrackAddVersionComponents` is also enabled. Default `true` |
| `dtrackAddVersionPolicyViolationsAuditHistory` | Carry over policy violation audit history. Has no effect unless `dtrackAddVersionPolicyViolations` is also enabled. Default `true` |
| `caFilePath` | File path to PEM encoded CA certificate |

### Dependency-Track v4 vs v5

The task automatically detects which major version of Dependency-Track it is talking to (via `GET /api/version`) and uses the appropriate clone API:

- **Dependency-Track v4**: uses the legacy `PUT /api/v1/project/clone` endpoint and waits for the clone operation to finish processing before continuing.
- **Dependency-Track v5+**: uses the `POST /api/v2/projects/{uuid}/clone` endpoint, which completes synchronously.

No extra configuration is required — the same task inputs work against either version.

### Usage Example

```yaml
- task: add-dtrack-project-version@1
  displayName: 'Add Dependency-Track project version'
  inputs:
    dtrackProjName: 'my-app'
    dtrackProjVersion: '1.1.0'
    dtrackAPIKey: '$(DTRACK_API_KEY)'
    dtrackURI: 'https://dependency-track.example.com/'
    dtrackIsLatest: true

- task: upload-bom-dtrack@1
  displayName: 'Upload SBOM to Dependency-Track'
  inputs:
    bomFilePath: '$(Build.TempDirectory)/bom.xml'
    dtrackProjName: 'my-app'
    dtrackProjVersion: '1.1.0'
    dtrackAPIKey: '$(DTRACK_API_KEY)'
    dtrackURI: 'https://dependency-track.example.com/'
    dtrackProjAutoCreate: true
```

---

## 📎 Links

- 🌐 [Dependency-Track](https://dependencytrack.org/)
- 🛒 [Azure DevOps Marketplace](https://marketplace.visualstudio.com/items?itemName=eshaar-me.vss-dependency-track-integration)
- 📁 [GitHub Repository](https://github.com/Zargath/azure-pipelines-dependency-track)
