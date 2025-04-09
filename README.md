# 🔐 Azure Pipelines Dependency-Track Extension

[![CI](https://github.com/Zargath/azure-pipelines-dependency-track/actions/workflows/prod.yml/badge.svg)](https://github.com/Zargath/azure-pipelines-dependency-track/actions/workflows/prod.yml)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/eshaar-me.vss-dependency-track-integration)
](https://marketplace.visualstudio.com/items?itemName=eshaar-me.vss-dependency-track-integration)
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
| `dtrackProjClassifier` | Classifier (e.g., `APPLICATION`, `FRAMEWORK`, etc.) |
| `dtrackParentProjName` | Parent project name (with optional auto-create) |
| `dtrackParentProjVersion` | Parent project version (with optional auto-create) |
| `dtrackIsLatest` | Sets the new child project as the latest version. Requires parent project name and version to be specified. Only works if Auto Create Project is set to TRUE. Defaults to false. |

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
| `thresholdUnassigned` | Max allowed low vulnerabilities |
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

---

## 📎 Links

- 🌐 [Dependency-Track](https://dependencytrack.org/)
- 🛒 [Azure DevOps Marketplace](https://marketplace.visualstudio.com/items?itemName=eshaar-me.vss-dependency-track-integration)
- 📁 [GitHub Repository](https://github.com/Zargath/azure-pipelines-dependency-track)
