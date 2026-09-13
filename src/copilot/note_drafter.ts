import { 
  createFHIREncounter, 
  createFHIRCondition, 
  createFHIRMedication, 
  buildFHIRBundle 
} from '../core/fhir.ts';
import type { GitHealthPassport } from '../core/git_engine.ts';
import type { AuthorIdentity, Commit, FHIRBundle } from '../core/types.ts';

export interface SOAPNoteInput {
  subjective: string;    // Patient complaints, symptoms, history of present illness
  objective: string;     // Physical exam findings, lab/vitals review
  assessment: string;    // Clinical diagnosis / impression
  plan: string;          // Treatment plan, patient instructions, follow-up
  diagnosesToAdd?: Array<{ name: string; icd10: string }>;
  prescriptionsToAdd?: Array<{ drug: string; dosage: string }>;
}

export class ClinicalCopilot {
  /**
   * Safety Check: Inspect passport allergies against proposed medications
   */
  public static checkDrugAllergies(
    passport: GitHealthPassport, 
    prescriptions: Array<{ drug: string; dosage: string }>
  ): Array<{ drug: string; allergen: string; reaction: string }> {
    const allergies = passport.db.getAllergies();
    const warnings: Array<{ drug: string; allergen: string; reaction: string }> = [];

    for (const rx of prescriptions) {
      const rxLower = rx.drug.toLowerCase();
      for (const alg of allergies) {
        const algLower = alg.substance.toLowerCase();
        if (rxLower.includes(algLower) || algLower.includes(rxLower)) {
          warnings.push({
            drug: rx.drug,
            allergen: alg.substance,
            reaction: alg.reaction
          });
        }
      }
    }

    return warnings;
  }

  /**
   * Draft a formal clinical encounter note, verify drug safety, and commit
   * to the patient's passport with the doctor's cryptographic signature.
   */
  public static draftAndCommitEncounter(params: {
    passport: GitHealthPassport;
    doctor: AuthorIdentity;
    doctorPrivateKeyHex: string;
    note: SOAPNoteInput;
    encounterType?: string;
  }): { commit: Commit; allergyWarnings: any[] } {
    // 1. Run safety checks
    const allergyWarnings = this.checkDrugAllergies(
      params.passport, 
      params.note.prescriptionsToAdd || []
    );

    // 2. Synthesize SOAP note text
    const fullNoteText = [
      `[SUBJECTIVE]: ${params.note.subjective}`,
      `[OBJECTIVE]: ${params.note.objective}`,
      `[ASSESSMENT]: ${params.note.assessment}`,
      `[PLAN]: ${params.note.plan}`
    ].join('\n\n');

    // 3. Build FHIR Bundle
    const entries: any[] = [];

    entries.push(createFHIREncounter({
      id: `enc-dr-${Date.now()}`,
      type: params.encounterType || 'Outpatient Clinical Consultation',
      serviceProvider: params.doctor.institution || 'Specialty Care Clinic',
      reason: params.note.assessment,
      summaryNote: fullNoteText
    }));

    if (params.note.diagnosesToAdd) {
      params.note.diagnosesToAdd.forEach((diag, idx) => {
        entries.push(createFHIRCondition({
          id: `diag-new-${idx + 1}`,
          name: diag.name,
          code: diag.icd10
        }));
      });
    }

    if (params.note.prescriptionsToAdd) {
      params.note.prescriptionsToAdd.forEach((rx, idx) => {
        entries.push(createFHIRMedication({
          id: `rx-new-${idx + 1}`,
          medication: rx.drug,
          dosage: rx.dosage
        }));
      });
    }

    const bundle: FHIRBundle = buildFHIRBundle(entries);

    // 4. Commit and sign with doctor's Ed25519 key
    const commit = params.passport.appendCommit({
      author: params.doctor,
      authorPrivateKeyHex: params.doctorPrivateKeyHex,
      commitType: 'ENCOUNTER',
      summaryText: `Encounter Note by Dr. ${params.doctor.name}: ${params.note.assessment}`,
      bundle
    });

    return { commit, allergyWarnings };
  }
}
