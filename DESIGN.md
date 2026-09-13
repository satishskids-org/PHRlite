# PHRlite: System Design & Technical Specification

## 1. System Architecture Overview

```
+---------------------------------------------------------------------------------------+
|                               PATIENT SOVEREIGN DEVICE                                |
|                                                                                       |
|  +---------------------------+  +---------------------------+  +-------------------+  |
|  | WebAuthn / Passkey Enclave|  | Optional Biomarker Plugin |  | Conversational    |  |
|  | (Touch ID / Face ID)      |  | (Health Connect/HealthKit)|  | Intake Chatbot    |  |
|  +-------------+-------------+  +-------------+-------------+  +---------+---------+  |
|                |                              |                          |            |
|                v                              v                          v            |
|  +---------------------------------------------------------------------------------+  |
|  |                       PHRlite CORE ENGINE (TypeScript / Rust)                   |  |
|  |  • Git Commit Engine (Append-only, Parent Hashing)                              |  |
|  |  • HL7 FHIR R4 Serializer & Validator                                           |  |
|  |  • SQLite Storage Engine (4KB Pages, WAL Mode, Index B-Trees)                   |  |
|  |  • Ed25519 Signature Verifier & Attestation Engine                              |  |
|  |  • Zero-Knowledge AES-256-GCM Encryptor                                         |  |
|  +------------------------------------+--------------------------------------------+  |
+---------------------------------------|-----------------------------------------------+
                                        | Encrypted Blobs
                                        v
+---------------------------------------------------------------------------------------+
|                     ZERO-KNOWLEDGE CLOUD RELAY (Cloudflare Edge)                      |
|                                                                                       |
|  +------------------------------------+  +-----------------------------------------+  |
|  | Cloudflare Turnstile (Bot Defense) |  | Cloudflare Workers (Sync & Auth Relay)  |  |
|  +------------------------------------+  +--------------------+--------------------+  |
|                                                               |                       |
|                                                               v                       |
|                                          +-----------------------------------------+  |
|                                          | Cloudflare R2 (Encrypted Object Vault)  |  |
|                                          +-----------------------------------------+  |
+---------------------------------------------------------------------------------------+
                                        | Ephemeral Read Token
                                        v
+---------------------------------------------------------------------------------------+
|                         PROVIDER WORKSTATION (Doctor / SKIDS)                         |
|                                                                                       |
|  +------------------------------------+  +-----------------------------------------+  |
|  | Doctor Web App / Desktop Viewer   |  | Clinical AI Copilot Engine              |  |
|  | • 1-Page Timeline Diff             |  | • Ambient Voice/Text Note Drafter       |  |
|  | • Active Problem List & Meds       |  | • Drug-Allergy Interaction Checker      |  |
|  | • SKIDS Pediatric Screening Batch  |  | • ICD-10 & SNOMED Auto-Coder            |  |
|  +------------------------------------+  +--------------------+--------------------+  |
|                                                               |                       |
|                                                               v                       |
|                                          +-----------------------------------------+  |
|                                          | Provider Digital Stamp Signer (Ed25519) |  |
|                                          +-----------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

## 2. The `.phr` SQLite Database Schema

```sql
-- Core Passport Metadata
CREATE TABLE passport_info (
    passport_id TEXT PRIMARY KEY,
    genesis_timestamp TEXT NOT NULL,
    patient_identifier TEXT NOT NULL, -- Pseudonymous Hash or National ID
    master_public_key TEXT NOT NULL,
    schema_version TEXT NOT NULL
);

-- Git-Like Commits (The Ledger)
CREATE TABLE commits (
    commit_hash TEXT PRIMARY KEY,          -- SHA-256 (parent_hash + timestamp + fhir_bundle + author)
    parent_hash TEXT,                      -- NULL only for Genesis commit
    author_id TEXT NOT NULL,               -- Provider NPI, Hospital ID, or Patient
    author_role TEXT NOT NULL,             -- 'PROVIDER', 'PATIENT', 'SCREENING_AUTHORITY_SKIDS'
    author_name TEXT NOT NULL,
    author_public_key TEXT NOT NULL,
    signature TEXT NOT NULL,               -- Ed25519 signature over commit_hash
    timestamp TEXT NOT NULL,
    commit_type TEXT NOT NULL,             -- 'GENESIS', 'ENCOUNTER', 'VITALS_SUMMARY', 'DISCHARGE'
    summary_text TEXT NOT NULL,            -- Human-readable 1-line message
    fhir_bundle_json TEXT NOT NULL         -- Complete FHIR R4 Bundle
);

-- Fast B-Tree Indexes for Clinical 1-Page Summarizer
CREATE TABLE active_conditions (
    id TEXT PRIMARY KEY,
    commit_hash TEXT NOT NULL,
    code TEXT NOT NULL,                    -- ICD-10 or SNOMED
    display_name TEXT NOT NULL,
    onset_date TEXT,
    clinical_status TEXT NOT NULL,         -- 'active', 'resolved', 'remission'
    FOREIGN KEY(commit_hash) REFERENCES commits(commit_hash)
);

CREATE TABLE active_medications (
    id TEXT PRIMARY KEY,
    commit_hash TEXT NOT NULL,
    drug_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    status TEXT NOT NULL,                  -- 'active', 'stopped'
    FOREIGN KEY(commit_hash) REFERENCES commits(commit_hash)
);

CREATE TABLE allergies (
    id TEXT PRIMARY KEY,
    substance TEXT NOT NULL,
    reaction TEXT NOT NULL,
    criticality TEXT NOT NULL              -- 'low', 'high', 'unable-to-assess'
);

CREATE INDEX idx_commits_parent ON commits(parent_hash);
CREATE INDEX idx_commits_timestamp ON commits(timestamp);
CREATE INDEX idx_conditions_status ON active_conditions(clinical_status);
CREATE INDEX idx_meds_status ON active_medications(status);
```

---

## 3. Cryptographic Commit Model

Every entry in the record is a cryptographically signed block:

$$\text{CommitPayload} = \text{parent\_hash} \,||\, \text{timestamp} \,||\, \text{author\_id} \,||\, \text{commit\_type} \,||\, \text{SHA256}(\text{fhir\_bundle\_json})$$

$$\text{commit\_hash} = \text{SHA256}(\text{CommitPayload})$$

$$\text{signature} = \text{Ed25519Sign}(\text{ProviderPrivateKey}, \text{commit\_hash})$$

* To verify integrity: The engine walks backwards from `HEAD` to `GENESIS`. If any byte in any FHIR bundle was modified or parent pointer altered, the chain verification fails instantly.

---

## 4. Zero-Knowledge Encryption Flow (E2EE)

1. **Key Derivation:**
   * The user’s passkey (WebAuthn / Secure Enclave) generates a master secret.
   * `VaultKey = HKDF(MasterSecret, salt, "phr-vault-encryption", 32)`
2. **Encryption:**
   * SQLite `.phr` file is encrypted using **AES-256-GCM** with a cryptographically secure 96-bit nonce.
3. **Transmission & Storage:**
   * Only the encrypted payload is synced to Cloudflare R2.
   * The cloud host, relay worker, and any man-in-the-middle see only high-entropy random bytes.

---

## 5. Doctor Copilot & 1-Page Synthesizer

When a doctor opens a cloned passport, the Copilot runs an in-memory aggregation pipeline:
1. **State Aggregator:** Replays all commits to extract current active medications (ignoring stopped ones), active chronic diagnoses, and verified allergies.
2. **Timeline Diff Generator:**
   * Identifies `last_visit_commit` vs `HEAD`.
   * Formats a natural delta:
     > *"Since last visit (Nov 2025): HbA1c increased from 6.8 to 7.4. Started Metformin 500mg. 2 school screening vitals recorded by SKIDS (Normal vision, BP 110/70)."*
3. **Ambient Scribe & Note Drafter:** Generates structured SOAP note draft with auto-mapped ICD-10 and SNOMED codes.

---

## 6. The Three-Module Architecture

```
                                  PHRlite PLATFORM
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         ▼                                ▼                                ▼
┌────────────────────────────────┐ ┌────────────────────────────────┐ ┌────────────────────────────────┐
│   MODULE 1: PATIENT PASSBOOK   │ │   MODULE 2: PROVIDER DESK      │ │    MODULE 3: ADMIN CONSOLE     │
│        (Consumer PWA)          │ │      (Doctor & Clinic)         │ │       (Enterprise Ops)         │
├────────────────────────────────┤ ├────────────────────────────────┤ ├────────────────────────────────┤
│ • Sovereign SQLite in OPFS     │ │ • Zero-Install Magic Link      │ │ • ABDM M1/M2/M3 Gateway Hub    │
│ • Rotating Dynamic Cryptogram  │ │ • 30-Sec Web Rx Pad (NMC Valid)│ │ • Cashfree KYC & Bank Adapter  │
│ • Insurance "Bank Balance" Card│ │ • PMBJP Jan Aushadhi Matcher   │ │ • NHCX FHIR Claim Switch       │
│ • IRDAI Wellness Rebate Engine │ │ • 1-Tap Reception QR Scanner   │ │ • API Key & Webhook Dispatcher │
│ • Dual-Pane Intake Chatbot     │ │ • Embeddable B2B Client SDK    │ │ • DPDP Cryptographic Audit Log │
└────────────────────────────────┘ └────────────────────────────────┘ └────────────────────────────────┘
```

---

## 7. Solo-Doctor "Magic Link" Architecture

Independent doctors practicing on WhatsApp do not need heavy EMR software. PHRlite enables a zero-install 60-second consultation loop:

```
[Patient on WhatsApp] ─────────────► [Taps "Share Record" in PHRlite PWA]
                                                │
                                                ▼ (Generates 15-min ephemeral ECDH session)
                                     "https://phrlite.in/rx/tkn_9f82a"
                                                │
[Doctor clicks link on Mobile/PC] ◄─────────────┘
   ├── In-Memory Decryption: Browser derives transient AES key from URL fragment.
   ├── 1-Page Clinical Model: Diagnoses, verified allergies, active meds.
   ├── 30-Second Web Rx Pad:
   │     • Smart search auto-suggesting generic NLEM / Jan Aushadhi drugs.
   │     • Real-time allergy contraindication banner.
   │     • Injects Doctor NMC Reg Number & Clinic Header.
   │     • Doctor taps "Sign & Seal" (Ed25519 digital signature).
   └── Encrypted commit dispatched back to Patient's Passbook.
```

---

## 8. Insurance "Bank Balance" & IRDAI Wellness Scoring

### 8.1 The "Google Pay for Health Insurance" Interface
Active insurance policies are rendered as liquid balances rather than opaque PDF documents:
- **Total Sum Insured**: Maximum statutory coverage limit.
- **Available Balance**: Real-time remaining balance after deducting approved cashless claims.
- **No-Claim Bonus (NCB)**: Accrued discount credit carried over across renewal years.
- **PED Waiting Period Status**: Continuous months accrued (e.g. "36 Months - Portability Protected").

### 8.2 IRDAI Statutory Wellness Engine
Under the **IRDAI Guidelines on Wellness and Preventive Features (2020)**:
1. When a patient completes an annual health checkup, the clinic stamps a signed FHIR `DiagnosticReport` bundle.
2. PHRlite computes the **IRDAI Wellness Score**:
   $$\text{WellnessScore} = \sum (\text{ScreeningWeight}_i \times \text{FreshnessFactor}_i)$$
3. The engine outputs a cryptographically verified **Wellness Certificate** submitted to the insurer.
4. The insurer grants a statutory renewal premium discount of up to **20%**.

---

## 9. Corporate Employee Group Health Onboarding

PHRlite replaces the cumbersome Google Form / Excel sheet onboarding process for corporate group health insurance:
1. **Employee Experience**: Employee navigates to the corporate benefits portal and clicks **"Sign in with PHRlite"**.
2. **Family Selection**: Employee selects self, spouse, and children with a single tap.
3. **Cryptographic Dispatch**: PHRlite bundles verified Aadhaar demographics and relationship attestations into an encrypted FHIR `Coverage` payload sent directly to the corporate insurer (e.g., ICICI Lombard, MediBuddy, Plum).
4. **Result**: Zero data entry errors, zero typos in dependent dates of birth, and zero claim rejections for non-disclosure.

---

## 10. Shadcn UI Component Hierarchy & Design Tokens

Interfaces adopt the clean, accessible architecture of **Shadcn UI** (`shadcn-ui/ui`) and the **AI Chatbot Template** (`shadcn-ui/chatbot-template`):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ <AppShell>                                                                             │
│   ├── <TopNavigation>                                                                  │
│   │     ├── <LogoWithStatusDot /> (Offline / Online Indicator)                         │
│   │     ├── <InsuranceBalanceBadge /> (₹9,20,000 Available)                            │
│   │     └── <ThemeToggle /> (Light / Dark / High-Contrast Clinical)                    │
│   │                                                                                    │
│   └── <DualPaneLayout>                                                                 │
│         ├── <ChatbotPane width="40%">                                                  │
│         │     ├── <MessageList /> (Natural language intake & symptom questions)        │
│         │     └── <ChatInput withVoiceDictation />                                     │
│         │                                                                              │
│         └── <ArtifactCanvas width="60%" collapsible>                                   │
│               ├── <Tabs defaultValue="passport">                                       │
│               │     ├── <TabsTrigger value="passport">Health Passport</TabsTrigger>    │
│               │     ├── <TabsTrigger value="rx">Active Prescriptions</TabsTrigger>     │
│               │     ├── <TabsTrigger value="insurance">Insurance & Claims</TabsTrigger>│
│               │     └── <TabsTrigger value="wellness">Wellness Rebate</TabsTrigger>    │
│               │                                                                        │
│               ├── <PassportTabContent>                                                 │
│               │     ├── <RotatingCryptogramQR (30s countdown ring) />                  │
│               │     └── <TimelineDiffCard />                                           │
│               └── <InsuranceTabContent>                                                │
│                     ├── <PolicyBankCard />                                             │
│                     └── <PortabilityDossierExportButton />                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Design System Tokens (`globals.css`):
- `background`: `hsl(222.2 84% 4.9%)` (Deep slate clinical background)
- `card`: `hsl(222.2 84% 7.5%)`
- `primary`: `hsl(142.1 76.2% 36.3%)` (Clinical emerald green: trust, verification)
- `accent`: `hsl(217.2 91.2% 59.8%)` (High-contrast royal blue: interactive links)
- `destructive`: `hsl(0 84.2% 60.2%)` (Critical allergy & contraindication alerts)

