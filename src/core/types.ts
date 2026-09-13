/**
 * Core Data Models & Type Definitions for PHRlite
 */

export type AuthorRole = 
  | 'PATIENT' 
  | 'PROVIDER' 
  | 'SCREENING_AUTHORITY_SKIDS' 
  | 'INGESTION_SPECIALIST';

export type CommitType = 
  | 'GENESIS' 
  | 'ENCOUNTER' 
  | 'VITALS_SUMMARY' 
  | 'DISCHARGE' 
  | 'SCREENING_EXAM';

export interface AuthorIdentity {
  id: string;             // License #, National Provider ID, or Patient UUID
  name: string;
  role: AuthorRole;
  institution?: string;   // e.g. "SKIDS School Health", "City General Hospital"
  publicKeyHex: string;   // Ed25519 public key (hex)
}

// Lightweight HL7 FHIR R4 Typed Interfaces
export interface FHIRCoding {
  system: string;
  code: string;
  display: string;
}

export interface FHIRCodeableConcept {
  coding: FHIRCoding[];
  text: string;
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  bloodType?: string;
}

export interface FHIRCondition {
  resourceType: 'Condition';
  id: string;
  code: FHIRCodeableConcept;
  clinicalStatus: 'active' | 'recurrence' | 'relapse' | 'remission' | 'resolved';
  onsetDate?: string;
  notes?: string;
}

export interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  medication: string;
  dosageInstruction: string;
  status: 'active' | 'stopped' | 'completed';
  authoredOn: string;
}

export interface FHIRAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  substance: string;
  reaction: string;
  criticality: 'low' | 'high' | 'unable-to-assess';
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  code: FHIRCodeableConcept;
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
  };
  valueString?: string;
  category?: 'vital-signs' | 'laboratory' | 'pediatric-screening' | 'wearable-telemetry';
}

export interface FHIREncounter {
  resourceType: 'Encounter';
  id: string;
  status: 'finished' | 'in-progress';
  type: string; // e.g. "Annual Pediatric Checkup", "Outpatient Consultation", "Emergency Intake"
  period: {
    start: string;
    end?: string;
  };
  serviceProvider?: string;
  reasonCode?: FHIRCodeableConcept[];
  summaryNote?: string; // Clinical SOAP note / discharge summary
}

export interface FHIRCoverage {
  resourceType: 'Coverage';
  id: string;
  status: 'active' | 'cancelled' | 'draft';
  subscriberId: string;       // Policy / Member Card #
  beneficiary: string;        // Patient reference ID
  payor: {
    name: string;             // Insurer e.g. "Star Health", "HDFC ERGO", "Ayushman Bharat PM-JAY"
    code: string;             // IRDAI / ABDM Insurer Code
  };
  period: {
    start: string;
    end: string;
  };
  policyType: string;         // e.g. "Family Floater", "Comprehensive Health", "PM-JAY Scheme"
  networkStatus?: 'in-network' | 'out-of-network';
  preAuthToken?: string;      // Cashless pre-approval token
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection';
  timestamp: string;
  entry: Array<{
    resource: 
      | FHIRPatient 
      | FHIREncounter 
      | FHIRCondition 
      | FHIRMedicationRequest 
      | FHIRAllergyIntolerance 
      | FHIRObservation
      | FHIRCoverage;
  }>;
}

// Git-like Commit Structure
export interface Commit {
  commitHash: string;      // SHA-256 (parentHash + timestamp + fhirBundleHash + author)
  parentHash: string | null; // null only for GENESIS commit
  author: AuthorIdentity;
  signature: string;       // Ed25519 signature over commitHash (hex)
  timestamp: string;       // ISO 8601
  commitType: CommitType;
  summaryText: string;     // Concise 1-liner message (like git commit message)
  bundle: FHIRBundle;      // Full HL7 FHIR Bundle
}

export interface PassportMetadata {
  passportId: string;
  genesisTimestamp: string;
  patientIdentifier: string;
  masterPublicKeyHex: string;
  schemaVersion: string;
}

export interface EphemeralConsentToken {
  passportId: string;
  grantedToProviderId: string;
  issuedAt: string;
  expiresAt: string;
  scope: 'READ_ONLY' | 'READ_AND_APPEND';
  sessionKey: string; // Ephemeral decryption key
  signature: string;
}

// VISA / MASTERCARD / UPI GRADE ENCOUNTER CRYPTOGRAM (Anti-Replay, Mutual Authentication)
export interface EncounterCryptogram {
  protocolVersion: 'PHR-UPI-v1';
  passportId: string;
  patientId: string;
  sessionNonce: string;       // 32-byte cryptographic nonce preventing replay attacks
  timestamp: string;          // ISO 8601 check-in time
  expiresAt: string;          // Expiration window (e.g. +30 minutes)
  purpose: 'OPD_CONSULT' | 'EMERGENCY' | 'PHARMACY' | 'LAB' | 'INPATIENT';
  patientPublicKeyHex: string;
  coverage?: FHIRCoverage;    // Instant insurance handoff (zero receptionist paperwork)
  scope: 'SUMMARY_ONLY' | 'FULL_RECORDS';
  patientSignature: string;   // Ed25519 signature over canonical check-in cryptogram
}

// Active session on the Provider Terminal
export interface EncounterSession {
  sessionId: string;
  cryptogram: EncounterCryptogram;
  patient: FHIRPatient;
  coverage: FHIRCoverage | null;
  clinicalSummary: {
    criticalAllergies: FHIRAllergyIntolerance[];
    activeConditions: FHIRCondition[];
    activeMedications: FHIRMedicationRequest[];
    recentVitals: FHIRObservation[];
  };
  status: 'CHECKED_IN' | 'IN_CONSULTATION' | 'SEALED_AND_DISCHARGED';
  startedAt: string;
  sealedAt?: string;
  receipt?: EncounterReceipt;
}

// Reciprocal Cryptographic Receipt stamped back to Patient Passport
export interface EncounterReceipt {
  receiptId: string;
  encounterId: string;
  sessionId: string;
  doctor: AuthorIdentity;
  doctorSignature: string;     // Ed25519 signature from doctor's verified medical license
  summaryNote: string;         // Clinical SOAP note / advice
  prescriptions: FHIRMedicationRequest[];
  observations: FHIRObservation[];
  bundle: FHIRBundle;
  commitHash: string;          // Git Merkle commit hash stamped into SQLite ledger
  tier: 'FREE' | 'PREMIUM';
  attachments?: Array<{
    type: string;              // 'application/pdf' | 'image/dicom' | 'application/json'
    title: string;
    sizeBytes: number;
    urlOrPayload: string;
  }>;
  timestamp: string;
}

