# PHRlite Philosophy: The Sovereign Health Passport

> *"A person's health history should belong to the person, carry the indelible authority of the clinicians who stamped it, and be as easy to present as a passport at an international border."*

---

## 1. The Core Convictions

### 1.1 The Passport Metaphor (Sovereign Ownership + Authorized Stamps)
A citizen owns their passport. They carry it, protect it, and present it when crossing a border. However, the citizen cannot issue their own travel visas or counterfeit an entry stamp. 
* In **PHRlite**, the patient is the sovereign owner of their record (`origin/main`).
* Healthcare providers, school screening teams (SKIDS), diagnostic labs, and hospitals act as authorized border authorities. They inspect history, determine clinical clearance, and append certified, digitally signed stamps (`commits`).

### 1.2 The Git Mental Model (Append-Only, Cryptographic Integrity)
Healthcare is inherently longitudinal and temporal. You cannot rewrite the fact that a patient had appendicitis in 2012, or that penicillin triggered hives in 2018.
* **No Destructive Overwrites:** Every new diagnosis, prescription, or vitals reading is an append-only commit.
* **Cryptographic Signatures:** Every commit is signed by the author’s private key (Ed25519) and references the preceding state hash. Tampering breaks the chain.
* **Branch, Read, Merge:** When entering a clinic, the doctor clones an ephemeral, consented read branch, drafts encounter notes with Copilot assistance, digitally signs the discharge commit, and merges it back to the patient’s master ledger.

### 1.3 The Doctor's First Glance (Cognitive Load Reduction)
Doctors do not have 30 minutes to review 200 pages of scanned PDFs, nor do they need gigabytes of raw MRI slices during their first 60 seconds with a patient.
* **The 1-Page Clinical Mental Model:** The primary responsibility of PHRlite is to synthesize decades of commits into a crystal-clear, 1-page situational summary:
  1. *Active Problem List & Chronic Conditions*
  2. *Current Medications & Allergies*
  3. *Timeline Diff: What has changed since the last encounter?*
* Heavy diagnostic imagery (DICOM CT/MRI) lives outside the core ledger via content-addressable hash pointers (like Git LFS).

### 1.4 Zero-Knowledge Sovereignty (Math Over Trust)
Privacy cannot depend on trusting a centralized cloud corporation, hospital consortium, or insurance company.
* The patient’s master record is encrypted on-device (AES-256-GCM) before it ever touches a network cable.
* To cloud relays and storage buckets (Cloudflare R2, Apple iCloud, Google Drive, or personal server), the vault is merely an opaque, unreadable blob of binary noise.
* Only the patient’s hardware-backed biometric passkey (Touch ID / Face ID via WebAuthn) can unlock the decryption keys.

### 1.5 Open Standards Only (Zero Proprietary Lock-In)
A lifetime health record cannot be trapped in a proprietary startup format.
* **Storage:** Standard SQLite — readable by any programming language on Earth for the next 100 years.
* **Semantics:** HL7 FHIR (Fast Healthcare Interoperability Resources) JSON objects.
* **Wearables:** Android Health Connect & Apple HealthKit open biomarker standards.
* **Signatures:** W3C Verifiable Credentials and Ed25519 cryptography.

---

## 2. The Non-Negotiable Tenets (Anti-Drift Guardrails)

1. **Never Require a Server to Read or Write Locally:** The core engine must run fully offline on a mobile phone or doctor's laptop.
2. **Never Overwrite Historical Data:** If a doctor makes a mistake, they issue an amendment commit (like a `git revert` or compensatory commit); history remains transparent and auditable.
3. **Never Charge the Patient for Their Own Data:** The consumer passport is free for life. Monetization is strictly on provider workflow efficiency, Copilot tooling, and verified institutional stamps.
4. **Never Burden the Patient with Cold Starts:** Adults must have conversational intake chatbots and back-office OCR digitization; children receive genesis vaults through school screening partnerships (SKIDS).
