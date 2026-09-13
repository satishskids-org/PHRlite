# PHRlite: Founder & Administrator Governance Manual
## Operational Guide, Roles & Responsibilities, and Legal Reference Matrix

**Organization:** Greybrain Technologies / PHRlite  
**Target Jurisdiction:** Republic of India  
**Target Audience:** Co-Founders, Chief Medical Officers, System Administrators, Compliance Officers, Legal Counsel

---

## 1. Executive Summary & Purpose

This manual is the master operational and legal governance document for **Greybrain PHRlite**. It establishes:
1. **The Operating Playbook**: How founders and admins manage credentials, plug-and-play certificates, audit logs, and external regulator switches without touching the codebase.
2. **The Roles & Responsibilities Matrix**: Rights, liabilities, and obligations of all 7 stakeholder groups (Patients, Solo Doctors, Hospitals, Pharmacies, Insurers, Corporate HR, and Platform Admins).
3. **Statutory Legal Compendium**: Exhaustive Indian statutory references protecting the platform against regulatory penalties under DPDP Act 2023, IRDAI Master Circular 2024, NMC Guidelines 2023, and IT Act 2000.

---

## 2. Platform Architecture & Admin Operations

### 2.1 The 3-Module Deployment Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 GREYBRAIN PHRlite INFRASTRUCTURE                       │
├───────────────────────────────┬───────────────────────────────┬────────────────────────┤
│ 1. PATIENT PASSBOOK (PWA)     │ 2. PROVIDER & SOLO-DOCTOR DESK│ 3. ENTERPRISE CONSOLE  │
│    `public/passport.html`     │    `public/doctor_rx.html`    │    `public/admin.html` │
├───────────────────────────────┼───────────────────────────────┼────────────────────────┤
│ • Sovereign SQLite in OPFS    │ • 15-min ephemeral link       │ • ABDM Sandbox/Prod    │
│ • 30-sec Rotating Cryptogram  │ • 30-sec NMC Web Rx Pad       │ • Cashfree KYC API     │
│ • Insurance "Bank Balance"    │ • NLEM & Jan Aushadhi generic │ • NHCX Claim Switch    │
│ • IRDAI 20% Wellness Rebate   │ • Anti-counterfeit single-lock│ • B2B Partner Keys     │
│ • Dual-Pane Intake Chatbot    │ • 1-Tap Reception QR Scanner  │ • DPDP Immutable Audit │
└───────────────────────────────┴───────────────────────────────┴────────────────────────┘
```

### 2.2 Plug-and-Play Production Activation Playbook

Greybrain PHRlite is engineered so that **no code rewrite is ever needed** when upgrading from sandbox testing to live regulatory deployment:

1. **Promoting NHA ABDM to Live Production**:
   - Navigate to `/admin.html`.
   - In the **Statutory Certification & Certificate Gate**, enter your **CERT-In VAPT Audit Report ID** (e.g. `CERT-IN-VAPT-2026-XXXX`).
   - Enter production `ABDM Client ID` and `Client Secret` issued by the National Health Authority.
   - Click **"Update ABDM Gateway"**. The system instantly shifts from Sandbox to `🟢 PRODUCTION CERTIFIED`.

2. **Activating Live NHCX Cashless Claim Switch**:
   - In the Admin Console, enter your **NHCX Participant Code** (allocated by NHA/IRDAI).
   - Paste the PEM string of the organization's **Class 3 Digital Signature Certificate (DSC)**.
   - The claims switch automatically transitions from `SANDBOX_MOCK` to `🟢 PRODUCTION SWITCH`.

3. **Managing DPDP Compliance & Grievance Redressal**:
   - Under Section 8 & Section 12 of the DPDP Act, publish the official Data Protection Officer's (DPO) name and grievance email in the Admin Console.
   - The statutory 24-hour acknowledgment and 7-day resolution clock begins automatically on grievance logging.

---

## 3. Comprehensive Roles & Responsibilities Matrix

```
┌────────────────────────────┬─────────────────────────────────────────────────┬───────────────────────────────────────────┐
│ Stakeholder Role           │ Core Responsibilities & Rights                  │ Statutory Liabilities & Prohibitions      │
├────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────┤
│ 1. Citizen / Patient       │ • Sovereign owner of local encrypted SQLite DB. │ • Accountable for accurate self-reported  │
│    (Vault Owner)           │ • Grants and revokes ephemeral time-bound       │   vitals and disclosure of history.       │
│                            │   consents (15-min doctor link, 4-hr check-in). │ • Cannot transfer credentials to third    │
│                            │ • Retains legal right to portability & erasure. │   parties for insurance fraud.            │
├────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────┤
│ 2. Registered Medical      │ • Reviews patient's 1-page clinical model.      │ • STRICTLY PROHIBITED from prescribing    │
│    Practitioner (RMP)      │ • Formulates structured digital prescriptions.  │   Schedule X / NDPS narcotics remotely.   │
│    (Solo Doctor)           │ • Auto-attaches NMC registration number and     │ • Must write generic chemical names in    │
│                            │   qualifications with Ed25519 digital signature.│   uppercase as per NMC 2023 guidelines.   │
│                            │ • Retains 3-year consult archive for audit.     │ • Civil/criminal liability under NMC Act. │
├────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────┤
│ 3. Hospital / Clinic       │ • 1-Tap QR scanner check-in at reception.       │ • Prohibited from collecting redundant    │
│    Reception & TPA Desk    │ • Dispatches FHIR CoverageEligibility and Claim │   paperwork from patients already holding │
│                            │   payloads directly to NHCX clearing switch.    │   verified ABHA and active insurance.     │
│                            │ • Issues reciprocal stamped discharge commits.  │ • Liable for billing fraud / upcoding.    │
├────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────┤
│ 4. Licensed Pharmacy /     │ • Verifies and locks prescription nonces.       │ • STRICTLY PROHIBITED from re-dispensing  │
│    E-Commerce (Tata 1mg)   │ • Logs drug Batch Number, Expiry Date, and      │   against an exhausted single-use nonce.  │
│                            │   Pharmacist State Registration Number.         │ • License suspension under D&C Rule 65    │
│                            │ • Offers PMBJP generic bio-equivalents.         │   for dispensing without original script. │
├────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────┤
│ 5. Health Insurer &        │ • Adjudicates cashless pre-authorizations in    │ • Mandated under IRDAI 2024 to honour     │
│    Third-Party Admin (TPA) │   < 2 minutes via NHCX FHIR switch.             │   accrued 36-mo PED waiting period credits│
│                            │ • Credits statutory 20% renewal discount for    │   without resetting clocks on portability.│
│                            │   verified IRDAI wellness screening certificates│ • Maximum 45-day window enforcement.      │
├────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────┤
│ 6. Corporate Employer /    │ • 1-Tap employee group health onboarding.       │ • Cannot mandate health data disclosure   │
│    HR Benefits Admin       │ • Zero forms; verified Aadhaar dependent link.  │   beyond statutory group policy needs.    │
│                            │ • Manages group coverage limits and renewals.   │ • Strict DPDP liability for data leaks.   │
├────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────┤
│ 7. PHRlite System Admin    │ • Operates neutral clearinghouse rail.          │ • Prohibited from decrypting, mining, or  │
│    (Greybrain Operations)  │ • Manages partner API tokens and audit feeds.   │   selling unencrypted health data.        │
│                            │ • Submits mandatory 6-hour CERT-In incident     │ • Statutory penalty up to ₹250 Crores for │
│                            │   notifications upon security triggers.         │   data fiduciary violations under DPDP.   │
└────────────────────────────┴─────────────────────────────────────────────────┴───────────────────────────────────────────┘
```

---

## 4. Master Statutory & Legal Reference Compendium

### 4.1 Digital Personal Data Protection (DPDP) Act, 2023
* **Section 4 & 6 (Lawful Purpose & Consent)**:
  - Processing of sensitive personal health data requires explicit, informed, unconditional, and revocable consent.
  - *PHRlite Implementation*: Hardware-backed passkey (WebAuthn / Secure Enclave) signs every consent artifact. Consents are purpose-bound (`CAREMGT`, `TELECONSULT`) and time-expiring (15 minutes to 4 hours).
* **Section 8 (General Obligations of Data Fiduciary)**:
  - Fiduciaries must implement reasonable technical and organizational safeguards to prevent personal data breaches.
  - *PHRlite Implementation*: Zero-knowledge client-side encryption (AES-256-GCM / ChaCha20). Servers hold zero plaintext health records.
* **Section 9 (Processing of Personal Data of Children)**:
  - Prohibits processing personal data of a child (< 18 years) without verifiable consent of parents or legal guardians.
  - *PHRlite Implementation*: Automatic minor gate (`validatePediatricParentConsent`) blocks pediatric and school screening record ingestion unless accompanied by a verified parent ABHA/Aadhaar consent token.
* **Section 12 (Right to Grievance Redressal)**:
  - Fiduciaries must provide a readily accessible redressal mechanism.
  - *PHRlite Implementation*: DPO credentials and automated grievance log stream embedded in `/admin.html`.

### 4.2 IRDAI Health Insurance Regulations & Master Circular 2024
* **Section 13 & 15 (Portability of Health Insurance Policies)**:
  - A policyholder has the legal right to port their policy from Insurer A to Insurer B without losing waiting-period credits for pre-existing diseases (capped at a statutory maximum of 36 months).
  - The application must be submitted at least 45 days prior to renewal.
  - *PHRlite Implementation*: B2B SDK generates the **Portability Dossier** containing verified Merkle-root proofs of continuous coverage and diagnosis onset dates, preventing insurers from resetting PED waiting periods.
* **IRDAI Guidelines on Wellness and Preventive Features (2020)**:
  - Insurers may offer reward points and renewal premium discounts of up to **20%** for verified wellness screenings.
  - *PHRlite Implementation*: The `WellnessEngine` calculates clinical screening scores and outputs cryptographically signed certificates submitted directly to Star Health, HDFC ERGO, or Care Health.

### 4.3 NMC Telemedicine Practice Guidelines (2020/2023)
* **Section 3.7 (Prohibited Medications in Telemedicine Consultations)**:
  - Explicitly prohibits Registered Medical Practitioners from prescribing **Schedule X drugs**, habit-forming narcotics, or psychotropic substances (NDPS Act) via remote consultation.
  - *PHRlite Implementation*: `RegulatoryComplianceGate.validateTelemedDrug` performs automated uppercase string matching against the Schedule X register (Morphine, Ketamine, Fentanyl, Diazepam IV, Methadone, etc.) and hard-blocks the prescription.
* **Section 4 & 5 (Mandatory Prescription Elements)**:
  - Prescriptions must state doctor's name, qualifications, State Medical Council / NMC registration number, clinic address, patient demographics, and generic drug names in uppercase letters.
  - *PHRlite Implementation*: `SoloDoctorRxPad` enforces these fields as non-optional before generating the Ed25519 digital signature.

### 4.4 Information Technology Act, 2000 & CERT-In Directives
* **Section 4 & Section 5 (Legal Recognition of Electronic Signatures)**:
  - Confers equal legal status to asymmetric digital signatures as physical wet-ink signatures.
* **CERT-In Cyber Security Directions (April 2022) Section 70B**:
  - Mandates mandatory reporting of cybersecurity incidents, unauthorized system access, or data breaches to CERT-In within **6 hours** of detection.
  - *PHRlite Implementation*: `RegulatoryComplianceGate.generateCertInIncidentReport` auto-formats statutory JSON reports addressed to `incident@cert-in.org.in`.

### 4.5 Drugs and Cosmetics Act 1940 & Rules 1945
* **Rule 65 (Conditions of Drug License & Dispensation)**:
  - Chemists must record batch number, manufacturer, date of expiry, and registration number of the prescriber and dispensing pharmacist for Schedule H, H1, and X medicines.
  - *PHRlite Implementation*: `validateRule65Dispensation` checks batch number, future expiry date, and chemist license before engaging the Single-Dispense cryptographic lock.

---

## 5. Security Incident Response & Key Rotation Playbook

1. **Trigger Condition**: Cryptographic signature mismatch, brute-force nonce replay, or unauthorized API token use.
2. **Immediate Automated Action (< 50ms)**:
   - Request rejected; client IP temporarily quarantined.
   - Entry logged to immutable DPDP audit trail (`AUDIT-XXXXX`).
3. **Escalation Protocol (< 6 Hours)**:
   - System Administrator generates CERT-In report from Admin Console.
   - Dispatches encrypted notification to `incident@cert-in.org.in` citing Section 70B.
4. **Key Rotation SLA**:
   - Master Ed25519 signing keys can be rotated from the Admin Console in < 60 seconds with zero downtime to patient offline storage.

---

*This document is a permanent asset of Greybrain Technologies and must be reviewed quarterly against newly published circulars by IRDAI, NHA, and the Data Protection Board of India.*
