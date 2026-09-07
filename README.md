# Deploy a Multilingual AI Voice Assistant

Deploy an AI voice assistant that speaks 31 languages — answer customers with an AI agent or bridge human support with live voice translation on OpenShift.

## Table of Contents

- [Overview](#overview)
- [Detailed description](#detailed-description)
  - [See it in action](#see-it-in-action)
  - [Architecture diagrams](#architecture-diagrams)
- [Requirements](#requirements)
  - [Minimum hardware requirements](#minimum-hardware-requirements)
  - [Minimum software requirements](#minimum-software-requirements)
  - [Required user permissions](#required-user-permissions)
- [Deploy](#deploy)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Validating the deployment](#validating-the-deployment)
  - [Delete](#delete)
- [Repository structure](#repository-structure)
- [References](#references)
- [Technical details](#technical-details)
  - [Modes](#modes)
  - [Configuration](#configuration)
  - [Quick start (local)](#quick-start-local)
  - [Roadmap](#roadmap)
- [Tags](#tags)

## Overview

Contact centres need to serve customers in their language, but hiring multilingual agents is expensive and doesn't scale. This quickstart deploys a voice assistant that handles 31 languages out of the box — either answering customers autonomously as an AI agent, or acting as a live voice translator between a human support agent and the customer. After deploying, you get a browser-based two-panel interface (Support + Customer) connected to an AI pipeline running entirely on your OpenShift cluster.

## Detailed description

Multilingual customer support is one of the highest-cost, hardest-to-staff functions in any contact centre. Customers expect to be served in their own language, yet finding agents who speak Arabic, Hindi, Indonesian, or Korean — let alone all 31 supported languages — is impractical. Traditional solutions rely on proprietary cloud translation APIs that route sensitive customer data through third-party services.

This quickstart solves the problem with two modes. In **AI Agent** mode, the customer speaks and the assistant transcribes their speech, generates an intelligent reply in the customer's language, and speaks it back — no human agent needed. In **Human** mode, a human support agent and the customer each speak their own language; the assistant transcribes, translates, and speaks the translation to the other side in real time — a live bidirectional voice translator with no LLM "answer" generated.

The pipeline chains three open-weight models: **Whisper large-v3** for speech-to-text, **Ministral 3B Instruct** for reply generation and translation, and **OmniVoice** for text-to-speech across 646 languages. All models run on your own OpenShift cluster — Whisper and Ministral are served by KServe/vLLM on GPU, while OmniVoice is served by KServe/vllm-omni on GPU. The browser-based UI talks only to a lightweight Python proxy server, which keeps API tokens server-side and avoids CORS. The entire stack deploys from a single CLI command.

### See it in action

![Application screenshot](docs/images/screenshot.png)

[Watch the video walkthrough](https://youtu.be/6KaspxeJ7MA?si=Hy6wii4N7MioH0sy)

### Architecture diagrams

![Architecture diagram](docs/images/architecture.png)

| Component | Role | Runtime | Endpoint |
|-----------|------|---------|----------|
| **Whisper large-v3** | Speech-to-Text | KServe / vLLM on GPU | `/v1/audio/transcriptions` |
| **Ministral 3B Instruct** | LLM (reply + translation) | KServe / vLLM on GPU | `/v1/chat/completions` |
| **OmniVoice** | Text-to-Speech (646 languages) | KServe / vllm-omni on GPU | `/v1/audio/speech` |
| **Web UI** | Static front-end + API proxy | Python 3.11 (stdlib only) | `/api/stt`, `/api/llm`, `/api/tts` |

The browser sends audio to the Web UI pod over HTTPS (edge-TLS Route). The Web UI proxies each API call to the corresponding model backend, keeping tokens server-side.

## Requirements

### Minimum hardware requirements

| Component | CPU (request / limit) | Memory (request / limit) | GPU |
|-----------|-----------------------|--------------------------|-----|
| Whisper large-v3 (STT) | 2 / 8 cores | 8 GiB / 24 GiB | 1x NVIDIA GPU (16 GB+ VRAM) |
| Ministral 3B (LLM) | 2 / 8 cores | 8 GiB / 24 GiB | 1x NVIDIA GPU (16 GB+ VRAM) |
| OmniVoice (TTS) | 2 / 4 cores | 4 GiB / 8 GiB | 1x NVIDIA GPU (4 GB+ VRAM) |
| Web UI | 50m / 500m | 128 MiB / 256 MiB | None |
| **Total** | **~6 cores request** | **~20 GiB request** | **3x NVIDIA GPU** |

> **Note:** If you bring your own STT/LLM endpoints (using `app-install.sh`), GPU is not required on this cluster.

### Minimum software requirements

- **OpenShift Container Platform** 4.14 or later (tested with 4.20)
- **Red Hat OpenShift AI (RHOAI)** 2.19 or later with KServe enabled (tested with 3.5) — (`KServe` management state is `Managed` in the `DataScienceCluster` CR, see [Installing OpenShift AI components](https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.5/html/installing_and_uninstalling_openshift_ai_self-managed/installing-and-deploying-openshift-ai_install#installing-and-managing-openshift-ai-components_component-install))
- **NVIDIA GPU Operator** (for GPU-served models)
- **`oc` CLI** 4.14 or later, authenticated to the cluster

### Required user permissions

This quickstart can be deployed by any user with namespace-admin permissions — specifically the ability to deploy applications (`oc apply`, `oc start-build`). No cluster-admin access is required.

## Deploy

### Prerequisites

Before deploying, ensure you have:

- Access to a Red Hat OpenShift cluster with RHOAI and KServe installed
- `oc` CLI installed and authenticated (`oc login ...`)
- At least 3 NVIDIA GPUs schedulable on the cluster (2x 16 GB+ VRAM for STT/LLM, 1x 4 GB+ VRAM for TTS)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd smart-voice-assistant
   ```

2. Run the full installer:

   ```bash
   cd deploy
   ./full-install.sh
   ```

   The script deploys to your active `oc project`. You can target a different namespace with `-n NAMESPACE` — the namespace must already exist. Creating a new namespace is not required; any existing namespace works.

   The script will:
   - **Deploy models** — Whisper, Ministral, and OmniVoice via KServe
   - **Build and deploy** the Web UI on-cluster
   - **Wire** all endpoints via ConfigMap
   - **Run component tests** (Web UI, TTS, LLM, STT)
   - **Print** the application URL and a software summary

   Components deploy in parallel by default (wall-clock = slowest component).

#### Alternative deployment options

**Bring your own STT/LLM** — deploy only the Web UI:

```bash
./app-install.sh
```

Then configure your STT/LLM endpoints in the Settings page or via `SVA_*` environment variables.

**Disconnected / registry-less clusters** — pre-build the web UI image and push to an external registry:

```bash
podman login quay.io
./build-push.sh -r quay.io/<your-org>
./full-install.sh --registry quay.io/<your-org>
```

See [`deploy/README.md`](deploy/README.md) for the full deployment guide, including flags, GPU details, monitoring, troubleshooting, and manual deployment.

### Validating the deployment

The installer runs a component test automatically. You can verify manually:

1. Check all pods are running:

   ```bash
   oc get pods
   ```

2. Get the application URL:

   ```bash
   echo "https://$(oc get route/smart-voice-assistant --template='{{.spec.host}}')"
   ```

3. Check install status anytime:

   ```bash
   cd deploy
   ./status.sh
   ```

### Delete

To completely remove the deployment:

```bash
cd deploy
./full-uninstall.sh    # removes everything (models + TTS + web UI)
./app-uninstall.sh     # removes app only, keeps models
```

## Repository structure

```
smart-voice-assistant/
├── index.html  settings.html        # UI pages
├── css/styles.css                   # Styles (green + purple themes)
├── js/
│   ├── app.js                       # Home logic — modes, record, VU meter, status
│   ├── pipeline.js                  # Audio routing: STT → LLM/translate → TTS
│   ├── stt.js llm.js tts.js        # Service clients (call the server proxies)
│   ├── langs.js                     # 31 supported languages
│   └── settings.js config.js yaml.js
├── server.py                        # Static files + /api/{config,tts,stt,llm} proxy
├── Dockerfile / Containerfile       # Web UI image (UBI9 Python 3.11)
├── config.example.yaml              # Example configuration
├── LICENSE                          # Apache 2.0
├── docs/
│   └── images/                      # Architecture diagrams and screenshots
├── deploy/                          # OpenShift deployment
│   ├── full-install.sh / app-install.sh   # Install scripts
│   ├── full-uninstall.sh / app-uninstall.sh
│   ├── status.sh / gpu-status.sh    # Monitoring
│   ├── build-push.sh               # Pre-build web UI image for disconnected clusters
│   ├── lib.sh                       # Shared library (preflight, deploy, tests)
│   ├── webui.yaml                   # Web UI manifest
│   └── models/                      # KServe InferenceService manifests
│       ├── serving-runtime.yaml     # Shared vLLM ServingRuntime
│       ├── vllm-omni-serving-runtime.yaml  # vllm-omni ServingRuntime (TTS)
│       ├── whisper-stt.yaml         # Whisper large-v3
│       ├── ministral-llm.yaml      # Ministral 3B Instruct
│       └── tts.yaml                # OmniVoice TTS
└── wiki/                            # Architecture, deployment, troubleshooting docs
```

## References

- [Whisper large-v3 model card](https://huggingface.co/openai/whisper-large-v3)
- [Ministral 3B Instruct model card](https://huggingface.co/mistralai/Ministral-3b-Instruct-2503)
- [OmniVoice model card](https://huggingface.co/k2-fsa/OmniVoice)
- [Red Hat AI ModelCar catalog](https://quay.io/organization/redhat-ai-services)
- [Red Hat OpenShift AI documentation](https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed)
- [Enabling the KServe component](https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.5/html/installing_and_uninstalling_openshift_ai_self-managed/installing-and-deploying-openshift-ai_install#installing-and-managing-openshift-ai-components_component-install)
- [KServe documentation](https://kserve.github.io/website/)
- [Detailed deployment guide](deploy/README.md) — flags, GPU notes, monitoring, troubleshooting
- [Troubleshooting guide](wiki/troubleshooting.md) — root-caused production issues and fixes

## Technical details

### Modes

| Mode | What happens |
|------|--------------|
| **AI Agent** | Customer speaks → transcribed → LLM replies **in the customer's language** → spoken back |
| **Human** | Each side's speech is transcribed, **translated into the other side's language**, and spoken there — no LLM "answer", pure translation |

### Configuration

Config precedence: **`config.yaml` (Settings page) > `SVA_*` env vars > built-in defaults**.

```yaml
branding:
  app_title: "Smart Voice Assistant"
  logo: ""                       # data URI; empty = built-in mark
services:
  stt: { name: "whisper-large-v3",        endpoint: "…/v1", token: "" }
  llm: { name: "ministral-3-3b-instruct", endpoint: "…/v1", token: "" }
  tts: { name: "omnivoice", endpoint: "…/v1", format: "wav" }
```

OmniVoice supports **646 languages** (the UI exposes 31, constrained by the LLM). Tokens live in `config.yaml` in plain text — the file is `.gitignore`d.

### Quick start (local)

```bash
python3 server.py            # → http://127.0.0.1:8000  (stdlib only, no pip install)
```

Open **http://localhost:8000**, then point the STT/LLM/TTS endpoints at your services in **Settings**.

## Tags

- **Industry:** Telecommunications
- **Product:** Red Hat OpenShift AI
- **Use case:** Call Center Voice Assistant
