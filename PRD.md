# PHRlite: Product Requirements Document (PRD)

## 1. Executive Summary
**PHRlite** is a sovereign, local-first Personal Health Record protocol and application suite. It models health records as a **Health Passport** using a **Git-like append-only commit ledger** backed by SQLite, HL7 FHIR, and Ed25519 digital signatures.

The consumer passport is free for life with zero-knowledge encrypted cloud backups. Monetization is driven by the provider marketplace, including clinical Copilot tools, workflow sync APIs, and institutional verification stamps.

---

## 2. Personas & Stakeholders

| Persona | Role | Primary Goal |
| :--- | :--- | :--- |
| **The Patient (Citizen)** | Sovereign owner of `origin/main` | Carries complete medical history on phone; grants frictionless biometric consent; never loses records. |
| **The Doctor (Border Authority)** | Attesting clinician | Scans 1-page chronological summary in 30 seconds; uses AI Copilot to draft notes; signs and appends discharge commits. |
| **The School Screening Provider (SKIDS)** | Certified pediatric authority | Conducts batch school health checkups (vision, dental, growth); issues genesis passports to students; connects parents. |
| **Back-Office Ingestion Specialist** | Clinical data reviewer | Validates AI-extracted legacy paper/PDF records to build a certified baseline passport for adult users. |

---

## 3. Product Workflows

### 3.1 Adult Onboarding & Catch-Up Ingestion
1. **Passkey Genesis:** User taps "Create Passport" $\rightarrow$ WebAuthn TouchID/FaceID generates cryptographic keys in 3 seconds.
2. **Conversational Intake:** HealthVault Chatbot interviews user (medications, drug allergies, surgeries, chronic conditions) and generates initial draft FHIR resources.
3. **Shoebox Drop:** User uploads photos of paper prescriptions, lab reports, and discharge summaries.
4. **Digitization & Review:** Back-office pipeline uses OCR/LLM entity extraction, reviewed by human clinical staff.
5. **Certified Baseline Commit:** A baseline commit is signed by the clinical ingestion team and merged into the user’s vault.

### 3.2 School Health Screening (SKIDS Wedge)
1. **Batch Registration:** School roster is imported into SKIDS provider portal.
2. **On-Site Stations:** Screening team tests Vision, Dental, Audiometry, BMI/Growth, and Vitals.
3. **Genesis Vault Stamping:** SKIDS issues a signed `.phr` file containing the complete pediatric screening report.
4. **Parent Link:** Parent receives SMS/WhatsApp with one-click claim link to take custody of their child's passport.
5. **Viral Household Conversion:** Parent app prompts: *"Protect your own health history — create your free adult Health Passport."*

### 3.3 Clinical Encounter (Planned & Unplanned)
1. **Planned Visit:** Patient books appointment; an ephemeral, 4-hour read token is issued to the clinic. Doctor pre-reviews the 1-page summary.
2. **Unplanned / ER Visit:** Clinic scans patient's on-screen QR or taps NFC. Patient verifies via FaceID / Fingerprint.
3. **Doctor Copilot View:** Doctor workstation opens the cloned passport:
   * *Active Problem List*
   * *Current Medications & Critical Allergies*
   * *Timeline Diff:* Exact delta since last doctor visit.
4. **Encounter Commit:** Doctor uses Copilot voice/text note generator, reviews the note, attaches optional lab/imaging files, signs with doctor private key, and pushes commit.
5. **Notification:** Patient receives immediate notification on phone; local `.phr` auto-updates.

---

## 4. Functional Requirements

### FR-1: Core Storage & Ledger
- Store complete health data in a single SQLite database file (`.phr`).
- Every clinical entry must be stored as an immutable commit referencing its parent hash.
- Commits must be cryptographically signed using Ed25519 public-key cryptography.
- Support cryptographic verification of the entire commit chain from genesis to head.

### FR-2: FHIR Native Data Representation
- Store clinical semantics using open-source HL7 FHIR Release 4 (R4) JSON structures:
  - `Patient`, `Encounter`, `Condition`, `Observation`, `MedicationRequest`, `AllergyIntolerance`, `Immunization`.
- Provide bidirectional serialization between SQLite tables and standard FHIR Bundles.

### FR-3: Zero-Knowledge Cloud Mirror
- Client-side AES-256-GCM encryption with keys derived from user passkey / device secure enclave.
- Server relay stores only opaque encrypted blobs in Cloudflare R2 / S3-compatible storage.
- Support optional Bring-Your-Own-Storage (BYOS): iCloud, Google Drive, or self-hosted Nextcloud.

### FR-4: Biomarker Wearable Plugin
- Ingest sensor streams from Google Health Connect (Android/Samsung) and Apple HealthKit (iOS).
- Squash continuous high-frequency data into periodic (daily/weekly/monthly) FHIR `Observation` summaries.
- Flag clinically significant deviations (e.g., resting HR trends, hypertensive readings, arrhythmia alerts).

### FR-5: Doctor Copilot & Summarizer
- Parse multi-decade commit history into a single-screen clinical mental model.
- Provide natural language diff: "What happened since the cardiology visit in March 2024?"
- Assist in generating structured SOAP notes and discharge summaries.

---

## 5. Non-Functional Requirements
- **Storage Footprint:** Core structured passport must be $<25$ MB for an entire 80-year human lifetime.
- **Encounter Speed:** Ephemeral transfer & 1-page summary render time must be $<2.5$ seconds.
- **Offline Capability:** Core reading, drafting, and signing must function without internet access.
- **Security & Standards Compliance:** FIDO2 / WebAuthn for authentication; W3C Verifiable Credentials; HIPAA/GDPR zero-knowledge architecture.
