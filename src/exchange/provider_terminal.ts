import crypto from 'node:crypto';
import type { 
  EncounterCryptogram, 
  EncounterSession, 
  EncounterReceipt,
  AuthorIdentity, 
  FHIRPatient, 
  FHIRCondition, 
  FHIRMedicationRequest, 
  FHIRObservation, 
  FHIRBundle 
} from '../core/types.ts';
import { verifyEncounterCryptogram } from './cryptogram.ts';
import { verifyInsuranceCoverage } from './insurance.ts';
import { checkPrescriptionSafety, type SafetyCheckResult } from './drug_safety.ts';
import { EmrInteroperabilityBridge } from './interop_bridge.ts';
import { GitEngine } from '../core/git_engine.ts';
import { TimelineSynthesizer } from '../copilot/timeline_synthesizer.ts';
import { signEd25519, sha256 } from '../core/crypto.ts';

export class ProviderTerminalEngine {
  private activeSessions = new Map<string, EncounterSession>();

  /**
   * 1-Tap Check-In: Scans the patient's dynamic Encounter Cryptogram
   * Replaces 20-minute receptionist paper form-filling with a 1-second cryptographically verified handshake.
   */
  checkInPatient(
    cryptogram: EncounterCryptogram,
    gitEngine: GitEngine
  ): {
    success: boolean;
    session?: EncounterSession;
    error?: string;
    insuranceNotice?: string;
  } {
    // 1. Verify Cryptogram (EMV / UPI level anti-replay, validity window, and patient signature)
    const cryptValidation = verifyEncounterCryptogram(cryptogram);
    if (!cryptValidation.valid) {
      return {
        success: false,
        error: `CHECK_IN_FAILED: ${cryptValidation.reason}`,
      };
    }

    // 2. Synthesize 1-page clinical summary from the patient's SQLite passport
    const model = TimelineSynthesizer.generateMentalModel(gitEngine);
    const patient: FHIRPatient = {
      resourceType: 'Patient',
      id: cryptogram.patientId,
      name: model.patientHeader.patientName,
      gender: model.patientHeader.gender,
      birthDate: model.patientHeader.birthDate,
      bloodType: model.patientHeader.bloodType,
    };

    // 3. Instant Insurance Check (if coverage token attached)
    let insuranceNotice = 'No commercial insurance provided (Self-Pay / Generic OPD)';
    if (cryptogram.coverage) {
      const covResult = verifyInsuranceCoverage(cryptogram.coverage);
      if (covResult.valid && covResult.isActive) {
        insuranceNotice = `✅ Insured: ${covResult.insurer} (Policy: ${covResult.policyNumber}) - Cashless Pre-Auth Verified`;
      } else {
        insuranceNotice = `⚠️ Insurance Attention: ${covResult.reason}`;
      }
    }

    const allergies: FHIRAllergyIntolerance[] = gitEngine.db.getAllergies().map((a: any) => ({
      resourceType: 'AllergyIntolerance',
      id: a.id,
      substance: a.substance,
      reaction: a.reaction,
      criticality: a.criticality,
    }));

    const conditions: FHIRCondition[] = gitEngine.db.getActiveConditions().map((c: any) => ({
      resourceType: 'Condition',
      id: c.id,
      code: {
        coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: c.icd10_code, display: c.condition_name }],
        text: c.condition_name,
      },
      clinicalStatus: 'active',
      onsetDate: c.onset_date,
    }));

    const medications: FHIRMedicationRequest[] = gitEngine.db.getActiveMedications().map((m: any) => ({
      resourceType: 'MedicationRequest',
      id: m.id,
      medication: m.medication_name,
      dosageInstruction: m.dosage_instruction,
      status: 'active',
      authoredOn: m.authored_on,
    }));

    const recentVitals: FHIRObservation[] = Object.entries(model.recentVitals).map(([name, v], i) => ({
      resourceType: 'Observation',
      id: `vit-${i}`,
      code: { coding: [], text: name },
      effectiveDateTime: v.date,
      valueQuantity: { value: v.value, unit: v.unit },
    }));

    // 4. Create Active Encounter Session
    const sessionId = `sess-${crypto.randomUUID()}`;
    const session: EncounterSession = {
      sessionId,
      cryptogram,
      patient,
      coverage: cryptogram.coverage ?? null,
      clinicalSummary: {
        criticalAllergies: allergies,
        activeConditions: conditions,
        activeMedications: medications,
        recentVitals,
      },
      status: 'CHECKED_IN',
      startedAt: new Date().toISOString(),
    };

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      session,
      insuranceNotice,
    };
  }

  /**
   * Doctor prescribes and checks against the Indian National Formulary (NFI) and PMBJP Jan Aushadhi
   */
  evaluatePrescription(
    sessionId: string,
    drugName: string
  ): SafetyCheckResult {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const patientAllergies = session.clinicalSummary.criticalAllergies.map(a => a.substance);
    return checkPrescriptionSafety(drugName, patientAllergies);
  }

  /**
   * Finalize consultation, sign with Doctor's Ed25519 medical license, and stamp patient's passport
   */
  sealEncounter(params: {
    sessionId: string;
    doctorIdentity: AuthorIdentity;
    doctorPrivateKeyHex: string;
    gitEngine: GitEngine;
    diagnoses: string[];
    medications: Array<{ drug: string; dosage: string }>;
    clinicalAdvice: string;
    labOrders?: Array<{ testName: string; reason?: string }>;
    tier?: 'FREE' | 'PREMIUM';
    premiumAttachments?: Array<{
      type: string;
      title: string;
      sizeBytes: number;
      urlOrPayload: string;
    }>;
  }): {
    success: boolean;
    receipt?: EncounterReceipt;
    commitHash?: string;
    error?: string;
  } {
    const session = this.activeSessions.get(params.sessionId);
    if (!session) {
      return { success: false, error: `Session ${params.sessionId} not active` };
    }

    const now = new Date().toISOString();
    const encounterId = `enc-${Date.now()}`;

    // 1. Build FHIR Conditions
    const conditions: FHIRCondition[] = params.diagnoses.map((diag, i) => ({
      resourceType: 'Condition',
      id: `cond-enc-${i}-${Date.now()}`,
      code: {
        coding: [{ system: 'http://snomed.info/sct', code: '404684003', display: diag }],
        text: diag,
      },
      clinicalStatus: 'active',
      onsetDate: now.split('T')[0],
    }));

    // 2. Build FHIR MedicationRequests
    const medications: FHIRMedicationRequest[] = params.medications.map((m, i) => ({
      resourceType: 'MedicationRequest',
      id: `med-enc-${i}-${Date.now()}`,
      medication: m.drug,
      dosageInstruction: m.dosage,
      status: 'active',
      authoredOn: now,
    }));

    // 3. Build FHIR Observations for Labs
    const observations: FHIRObservation[] = (params.labOrders ?? []).map((lab, i) => ({
      resourceType: 'Observation',
      id: `lab-enc-${i}-${Date.now()}`,
      code: {
        coding: [{ system: 'http://loinc.org', code: 'PENDING', display: lab.testName }],
        text: lab.testName,
      },
      effectiveDateTime: now,
      category: 'laboratory',
      valueString: lab.reason ?? 'Order placed during consultation',
    }));

    // 4. Build standard NRCeS FHIR Bundle
    const bundle = EmrInteroperabilityBridge.exportOPConsultRecord({
      bundleId: `bundle-opd-${encounterId}`,
      patient: session.patient,
      encounter: {
        resourceType: 'Encounter',
        id: encounterId,
        status: 'finished',
        type: 'Outpatient Clinical Consultation',
        serviceProvider: params.doctorIdentity.institution ?? 'PHRlite Verified Clinic',
        period: {
          start: session.startedAt,
          end: now,
        },
        summaryNote: params.clinicalAdvice,
      },
      conditions,
      medications,
      allergies: session.clinicalSummary.criticalAllergies,
      observations,
      coverage: session.coverage ?? undefined,
    });

    // 5. Append immutable commit into the patient's local SQLite passport
    const commit = params.gitEngine.appendCommit({
      author: params.doctorIdentity,
      authorPrivateKeyHex: params.doctorPrivateKeyHex,
      commitType: 'ENCOUNTER',
      summaryText: `Consultation with ${params.doctorIdentity.name}: ${params.diagnoses.join(', ')}`,
      bundle,
    });

    // 6. Sign Doctor Receipt
    const tier = params.tier ?? 'FREE';
    const receiptCanonical = [
      encounterId,
      params.sessionId,
      commit.commitHash,
      params.doctorIdentity.id,
      now,
      tier
    ].join('|');

    const doctorSignature = signEd25519(receiptCanonical, params.doctorPrivateKeyHex);

    const receipt: EncounterReceipt = {
      receiptId: `rcpt-${crypto.randomUUID()}`,
      encounterId,
      sessionId: params.sessionId,
      doctor: params.doctorIdentity,
      doctorSignature,
      summaryNote: params.clinicalAdvice,
      prescriptions: medications,
      observations,
      bundle,
      commitHash: commit.commitHash,
      tier,
      attachments: tier === 'PREMIUM' ? params.premiumAttachments : undefined,
      timestamp: now,
    };

    // Update session
    session.status = 'SEALED_AND_DISCHARGED';
    session.sealedAt = now;
    session.receipt = receipt;

    return {
      success: true,
      receipt,
      commitHash: commit.commitHash,
    };
  }

  getSession(sessionId: string): EncounterSession | undefined {
    return this.activeSessions.get(sessionId);
  }
}
