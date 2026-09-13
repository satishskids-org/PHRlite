# PHRlite: Master System Specifications & Engineering Guardrails

**Version:** 1.0.0-PROD  
**Status:** Canonical Reference (Normative)  
**Target Ecosystem:** Republic of India (Digital Health & Insurance Infrastructure)  
**Standard Compliance:** HL7 FHIR R4 (NRCeS Profiles), ABDM V3, IRDAI Master Circular 2024, DPDP Act 2023, NMC Telemedicine Guidelines 2023, IT Act 2000 (§4 & §5), Drugs and Cosmetics Act 1940 (Rule 65).

---

## 1. System Mission & Boundary Definition

PHRlite is a **sovereign, neutral cryptographic clearinghouse and personal health passport**. It functions like the **"Visa / UPI / DigiYatra of Healthcare"**.

### Explicit Boundaries (What PHRlite IS and IS NOT):
* **PHRlite IS**:
  - A client-side sovereign health database (SQLite / OPFS) owned exclusively by the patient.
  - A dynamic cryptogram exchange rail (30-second rotating single-use session tokens).
  - An interoperability switch mapping encounters to standard NRCeS HL7 FHIR R4.
  - A neutral B2B verification layer for check-ins, insurance pre-authorizations, and e-prescriptions.
* **PHRlite IS NOT**:
  - **NOT a Monolithic Hospital EMR**: It does not manage hospital bed allocation, operating theater scheduling, or internal nursing shift rotas.
  - **NOT an Online Pharmacy / E-Commerce Retailer**: It does not stock, sell, or deliver medications. It verifies and locks e-prescriptions for third-party fulfillment (e.g. Tata 1mg, Apollo, Jan Aushadhi).
  - **NOT an Insurance Underwriter**: It does not bear underwriting risk or issue insurance policies. It renders policy entitlements, computes waiting-period credits, and automates claim verification via NHCX.

---

## 2. Three-Tier Modular Architecture

```
                                      PHRlite PLATFORM
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ▼                                    ▼                                    ▼
┌────────────────────────────────┐   ┌────────────────────────────────┐   ┌────────────────────────────────┐
│   MODULE 1: PATIENT PASSBOOK   │   │   MODULE 2: PROVIDER DESK      │   │    MODULE 3: ADMIN CONSOLE     │
│       (Consumer PWA / App)     │   │      (Doctor & Clinic)         │   │       (Enterprise Ops)         │
├────────────────────────────────┤   ├────────────────────────────────┤   ├────────────────────────────────┤
│ 1.1 Sovereign SQLite / OPFS    │   │ 2.1 Zero-Install "Magic Link"  │   │ 3.1 ABDM Gateway M1/M2/M3 Reg  │
│ 1.2 Rotating QR Cryptogram     │   │ 2.2 30s Web Rx Pad (NMC Valid) │   │ 3.2 Cashfree / KYC Connector   │
│ 1.3 Insurance "Bank Balance"   │   │ 2.3 PMBJP Generic Autocomplete │   │ 3.3 NHCX Claim Switch Hub      │
│ 1.4 IRDAI Wellness Tracker     │   │ 2.4 Receptionist 1-Tap Scanner │   │ 3.4 API Key & Webhook Dispatch │
│ 1.5 Conversational Intake Chat │   │ 2.5 Embeddable B2B JS SDK      │   │ 3.5 DPDP Cryptographic Audit   │
└────────────────────────────────┘   └────────────────────────────────┘   └────────────────────────────────┘
```

---

## 3. Module Specifications

### Module 1: Patient Passbook (Consumer PWA)
1. **Sovereign Local Persistence**:
   - The primary datastore is an encrypted SQLite database stored on-device using the browser's **Origin Private File System (OPFS)** or native app sandbox.
   - Master encryption key derived via **WebAuthn Passkey (TouchID / FaceID)** using PBKDF2 / HKDF with AES-256-GCM.
2. **Rotating Dynamic Cryptogram (Visa/UPI-Grade)**:
   - Produces a rotating QR code refreshing every **30 seconds**.
   - Payload contains: Ephemeral ECDH Public Key, ISO 8601 Timestamp, Random Nonce, and an Ed25519 signature of the session header.
   - **Anti-Replay Rule**: Scanned nonces are marked consumed; replays are rejected in < 50ms.
3. **Insurance "Bank Balance" Card**:
   - Renders active health insurance policies exactly like a bank account in Google Pay:
     - `Total Sum Insured` (e.g. ₹10,00,000).
     - `Available Cashless Balance` (e.g. ₹9,20,000).
     - `Accrued No-Claim Bonus (NCB)` (e.g. ₹50,000).
     - `Pre-Existing Disease (PED) Portability Status` (e.g. "36 Months Cleared").
4. **IRDAI Statutory Wellness Engine**:
   - Evaluates stamped clinical screenings (lipids, HbA1c, BP, BMI, vaccination).
   - Generates signed **IRDAI Wellness Certificates** yielding up to **20% discount on renewal premiums**.
5. **Conversational Intake Assistant (Shadcn Chatbot Pattern)**:
   - Left pane conversational intake with natural language symptom input.
   - Right pane expandable **Artifact Canvas** displaying the live Passbook, timeline diffs, and digital drug leaflets.

---

### Module 2: Provider Desk & Solo-Doctor Magic Link
1. **Zero-Install Solo-Doctor "Magic Link"**:
   - For independent doctors receiving patient consult requests via WhatsApp.
   - Patient generates a 15-minute time-bound consented link: `https://phrlite.in/rx/:sessionToken`.
   - Doctor opens link on any mobile browser or desktop with **zero software installation**.
2. **30-Second NMC-Compliant Web Rx Pad**:
   - Conforms strictly to **NMC Telemedicine Guidelines (2020/2023)**:
     - Automatically stamps Doctor Name, Qualification, State Medical Council Registration Number, Clinic Address, and Date.
     - Enforces generic drug name selection in uppercase characters.
3. **Indian Drug Library & PMBJP Generic Autocomplete**:
   - Real-time lookup against **NLEM 2022** and **PMBJP Jan Aushadhi** catalog (1,800+ medicines).
   - Displays real-time cost arbitrage (e.g., *Augmentin 625mg: ₹175 vs Jan Aushadhi Amox-Clav: ₹55*).
   - Real-time contraindication alert based on patient's documented allergies.
4. **Receptionist 1-Tap QR Scanner**:
   - WebCam-based scanner running at 60 FPS using HTML5 canvas / WebAssembly.
   - Decrypts patient demographics, emergency contact, and insurance pre-auth in < 500ms without form-filling.
5. **Embeddable B2B SDK (`phrlite.js`)**:
   - Drop-in web components for third-party hospital portals, diagnostic labs, and pharmacies:
     - `<phrlite-qr-scanner />` (Instant check-in widget).
     - `<phrlite-rx-checkout />` (Tata 1mg 1-tap cart handoff).
     - `<phrlite-claim-gate />` (NHCX cashless pre-auth button).

---

### Module 3: Admin Console (Enterprise Operations)
1. **ABDM Gateway Registry**:
   - Manages NHA ABDM V3 Client ID, Client Secret, and encryption certificates.
   - Manages Milestone endpoints:
     - **M1**: ABHA creation via Aadhaar OTP, ABHA address assignment (`@abdm`).
     - **M2**: HIP/HIU registration and Consent Manager notification hooks (`/v0.5/consents/on-init`).
     - **M3**: Health data transfer session router (`/v0.5/health-information/transfer`).
2. **KYC & Commercial Identity Connector**:
   - Integrates regulated KYC suites (Cashfree / Setu / Digio) for:
     - Doctor NMC license verification.
     - Hospital Rohini / NABH registry lookup.
     - Patient bank account penny-drop validation (for reimbursement claim credits).
3. **NHCX Claim Switch Hub**:
   - Direct integration with the National Health Claim Exchange.
   - Dispatches FHIR `CoverageEligibilityRequest` and `Claim` payloads to TPA / Insurer clearing switches.
4. **Developer Key & Webhook Dispatcher**:
   - Issues scoped API keys (`pk_live_...`, `sk_live_...`) for enterprise partners.
   - Dispatches authenticated webhooks for claim status transitions, prescription dispensations, and consent revocations.
5. **DPDP Cryptographic Audit Log**:
   - Immutable audit trail of every data access event with timestamp, actor public key, purpose code, and consent ID.

---

## 4. Statutory & Regulatory Matrix

```
┌──────────────────────────────────────┬──────────────────────────────────────────┬─────────────────────────────────────────┐
│ STATUTORY MANDATE                    │ LEGAL CITATION                           │ PHRLITE SYSTEM IMPLEMENTATION           │
├──────────────────────────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────┤
│ Health Insurance Portability         │ IRDAI Master Circular 2024               │ "Portability Dossier" export: Proves    │
│ (PED Waiting Period Continuity)      │ (Health Insurance), Sec 13 & 15          │ continuous verified coverage & diagnosis│
│                                      │                                          │ onset to eliminate 36-mo resets.        │
├──────────────────────────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────┤
│ National Health Claim Exchange       │ NHA & IRDAI Joint Circular               │ Native HL7 FHIR R4 Claim & Coverage     │
│ (Cashless Pre-Auth & Settlement)     │ (NHCX Mandate 2023-2024)                 │ profiles with 0-fraud cryptographic     │
│                                      │                                          │ client-side verification.               │
├──────────────────────────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────┤
│ Personal Data Sovereignty            │ Digital Personal Data Protection (DPDP)  │ Zero-Knowledge Edge Relay: No           │
│ & Revocable Purpose Consent          │ Act 2023, Sections 6, 8, and 9           │ unencrypted medical data on servers.    │
│                                      │                                          │ Ed25519 signed consent artifacts.       │
├──────────────────────────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────┤
│ Online E-Prescription Validity       │ NMC Telemedicine Guidelines (2020/2023)  │ Structured digital prescriptions with   │
│ & Format Requirements                │ & IT Act 2000, Section 4 & 5             │ mandatory RMP license, clinic details,  │
│                                      │                                          │ and generic uppercase names.            │
├──────────────────────────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────┤
│ Anti-Counterfeit & Single Dispense   │ Drugs & Cosmetics Act 1940,              │ "Single-Dispense Lock": Cryptographic   │
│ (Schedule H/H1 Narcotics Control)    │ Rule 65 (Conditions of License)          │ nonce consumed upon pharmacy billing    │
│                                      │                                          │ to prevent illegal duplicate refills.   │
├──────────────────────────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────┤
│ Wellness & Preventive Rebates        │ IRDAI Guidelines on Wellness             │ Signed clinical screening certificates  │
│ (Up to 20% Renewal Premium Discount) │ and Preventive Features (2020)           │ submitted directly to insurers.         │
└──────────────────────────────────────┴──────────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 5. Non-Negotiable Engineering Guardrails (Anti-Drift Rules)

All contributing developers and autonomous agents **MUST** abide by these 5 rules without exception:

### Guardrail 1: Zero Centralized Plaintext PHI
* **Rule**: Under NO circumstances shall unencrypted patient health records, diagnosis summaries, lab values, or prescription images be stored on Cloudflare R2, central databases, or log files.
* **Enforcement**: Server-side endpoints only handle ciphertext blobs (`IV + Ciphertext + AuthTag`) or transient cryptogram handshake tokens.

### Guardrail 2: Absolute Anti-Kickback Enforcement
* **Rule**: Under NO circumstances shall PHRlite incorporate "loyalty cashbacks", "scratch cards", or gamified points on prescription drug purchases.
* **Enforcement**: Financial savings are strictly restricted to:
  1. Generic drug price arbitrage (PMBJP Jan Aushadhi bio-equivalents).
  2. IRDAI-approved insurance renewal premium discounts for verified preventive screenings.
  3. Hospital OPD administrative paperwork fee waivers.

### Guardrail 3: Regulated KYC Dual-Rail Architecture
* **Rule**: PHRlite shall NEVER build an unlicensed, direct Aadhaar OTP or biometric ingestion pipeline.
* **Enforcement**:
  - Healthcare KYC is performed via **ABDM Gateway M1 (where the National Health Authority acts as the licensed AUA)**.
  - Commercial/bank account verification for claims and doctor credential verification is delegated to licensed API partners (**Cashfree / Setu**).

### Guardrail 4: NRCeS FHIR R4 Strict Conformance
* **Rule**: No proprietary, ad-hoc JSON formats for medical data exchange.
* **Enforcement**: All health records must strictly serialize into standard **NRCeS Indian FHIR R4 Profiles**:
  - `PrescriptionRecord`
  - `DiagnosticReport`
  - `OPConsultRecord`
  - `DischargeSummary`
  - `CoverageEligibilityRequest` / `Claim`

### Guardrail 5: Performance & Offline Autonomy SLAs
* **Cryptogram QR generation**: < 15ms.
* **Cryptogram QR rotation period**: 30 seconds.
* **Terminal scan-to-decryption latency**: < 500ms.
* **Offline query speed (SQLite/OPFS)**: < 10ms for full patient history.
* **Pre-auth verification round-trip**: < 2 seconds.

---

## 6. Shadcn UI Design System Specification

All web interfaces (Patient App, Provider Desk, and Admin Console) must adhere to the design patterns established by **Shadcn UI** (`shadcn-ui/ui`) and the **AI Chatbot Template** (`shadcn-ui/chatbot-template`):

1. **Tokens & Theming**:
   - Semantic CSS variables in `globals.css`:
     - `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`.
   - Full support for Dark, Light, and High-Contrast Clinical themes.
2. **Component Primitives**:
   - Exclusively based on **Radix UI** primitives (`Dialog`, `Popover`, `Tabs`, `DropdownMenu`, `Tooltip`, `Accordion`, `ScrollArea`).
   - Clean, accessible SVG iconography via **Lucide Icons** (`lucide-react` / `lucide`).
3. **Dual-Pane Chatbot / Canvas Layout**:
   - **Left Pane (40%)**: Conversational assistant for voice/text symptom intake and copilot queries.
   - **Right Pane (60% Collapsible Canvas)**: Artifact renderer displaying:
     - Live rotating Health Passport QR card.
     - Insurance "Bank Balance" Card.
     - Interactive Prescription Pad with Generic Savings Toggle.
     - IRDAI Wellness Savings Certificate.
