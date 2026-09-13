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
      | FHIRObservation;
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
