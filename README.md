# PHRlite: The Sovereign Health Passport

> **A local-first, zero-knowledge Personal Health Record (PHR) protocol built on SQLite, HL7 FHIR, and Git-like cryptographic commits.**

---

## 🌟 Vision & Key Concepts

PHRlite treats personal health data like a **Passport**:
* **Owned by the Patient:** The patient holds `origin/main` on their device.
* **Stamped by Authorities:** Doctors, hospitals, and school screening authorities (SKIDS) append certified, digitally signed commits.
* **1-Page Mental Model for Doctors:** In 30 seconds, clinicians get an instant synthesis of active problems, current meds, critical allergies, and recent biomarkers.
* **Zero-Knowledge Cloud Mirror:** The record is encrypted on-device with AES-256-GCM before syncing to Cloudflare R2; cloud hosts only see unreadable binary noise (~$0.003/user/year).
* **Open Standards:** Built on standard SQLite, HL7 FHIR R4, Google Health Connect, Apple HealthKit, and Ed25519 digital signatures.

---

## 🏗️ Architecture

```
[PATIENT DEVICE]                                                  [PROVIDER WORKSTATION]
  • Sovereign SQLite (.phr)                                         • 1-Page Timeline Diff
  • WebAuthn / Passkeys                                             • AI Copilot Note Drafter
  • Google Health Connect & Apple HealthKit                         • Ed25519 Digital Stamps
         |                                                                    ^
         |                                                                    |
         v                                                                    |
[ZERO-KNOWLEDGE CLOUDFLARE R2] <====== Ephemeral Consented Handshake =========+
  • Client-side encrypted blobs (AES-256-GCM)
  • Cloudflare Turnstile bot protection
```

---

## 🚀 Quickstart

### Prerequisites
- Node.js v22+ or v24+ (uses native `node:sqlite` and `node:crypto`).

### Run the Interactive Simulation
```bash
git clone https://github.com/satishskids-org/PHRlite.git
cd PHRlite
npm test
```

---

## 📁 Repository Structure

* [`PHILOSOPHY.md`](./PHILOSOPHY.md): The core convictions, passport metaphor, and non-negotiable anti-drift principles.
* [`PRD.md`](./PRD.md): Product Requirements Document covering personas, adult intake, SKIDS school screening, and business case.
* [`DESIGN.md`](./DESIGN.md): Technical specification, SQLite schema, cryptographic commit formulas, and FHIR mapping.
* [`src/core/`](./src/core):
  * `db.ts`: SQLite page-optimized storage engine.
  * `crypto.ts`: Ed25519 signature engine and AES-256-GCM zero-knowledge encryption.
  * `fhir.ts`: HL7 FHIR R4 resource generators and bundle parsers.
  * `git_engine.ts`: Git-like commit manager (`init`, `appendCommit`, `verifyChain`, `diff`).
* [`src/onboarding/`](./src/onboarding):
  * `intake_chatbot.ts`: Conversational intake chatbot converting patient chat to structured FHIR.
  * `ingestion_pipeline.ts`: Back-office digitization for legacy medical records.
* [`src/screening/`](./src/screening):
  * `skids_provider.ts`: School health screening batch engine & pediatric stamps.
* [`src/plugins/`](./src/plugins):
  * `health_connect.ts`: Google Android Health Connect & Samsung Health sensor squasher.
  * `apple_healthkit.ts`: Apple HealthKit cardio & ECG metrics adapter.
* [`src/copilot/`](./src/copilot):
  * `timeline_synthesizer.ts`: 1-page "Doctor's Mental Model" & Timeline Diff.
  * `note_drafter.ts`: Clinical SOAP note generator with drug-allergy safety checks.
* [`src/cloud/`](./src/cloud):
  * `cloudflare_relay.ts`: Zero-knowledge Cloudflare R2 storage relay & Turnstile gate.
* [`demo/cli_demo.ts`](./demo/cli_demo.ts): End-to-end runnable demonstration.
* [`test/phrlite.test.ts`](./test/phrlite.test.ts): Comprehensive verification test suite.

---

## 📄 License
Apache-2.0. Open-source, free for life.
