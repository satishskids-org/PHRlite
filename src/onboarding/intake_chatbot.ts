import { 
  createFHIRPatient, 
  createFHIRCondition, 
  createFHIRMedication, 
  createFHIRAllergy, 
  buildFHIRBundle 
} from '../core/fhir.ts';
import type { FHIRBundle } from '../core/types.ts';

export interface IntakeResponses {
  patientName: string;
  birthDate: string;
  gender: string;
  bloodType?: string;
  chronicConditions: Array<{ name: string; icd10?: string; onsetYear?: string }>;
  currentMedications: Array<{ drug: string; dose: string }>;
  allergies: Array<{ substance: string; reaction: string; criticality?: 'low' | 'high' }>;
}

/**
 * HealthVault Intake Chatbot Engine
 * Transforms conversational dialogue answers into a structured FHIR draft bundle
 */
export class IntakeChatbot {
  public static processIntake(data: IntakeResponses): FHIRBundle {
    const entries: any[] = [];

    // 1. Patient Profile
    const patient = createFHIRPatient({
      id: 'patient-primary',
      name: data.patientName,
      gender: data.gender,
      birthDate: data.birthDate,
      bloodType: data.bloodType
    });
    entries.push(patient);

    // 2. Chronic Conditions
    data.chronicConditions.forEach((cond, idx) => {
      const condition = createFHIRCondition({
        id: `cond-${idx + 1}`,
        name: cond.name,
        code: cond.icd10 || 'Z00.00',
        clinicalStatus: 'active',
        onsetDate: cond.onsetYear ? `${cond.onsetYear}-01-01` : undefined
      });
      entries.push(condition);
    });

    // 3. Current Daily Medications
    data.currentMedications.forEach((med, idx) => {
      const medication = createFHIRMedication({
        id: `med-${idx + 1}`,
        medication: med.drug,
        dosage: med.dose,
        status: 'active'
      });
      entries.push(medication);
    });

    // 4. Allergies
    data.allergies.forEach((alg, idx) => {
      const allergy = createFHIRAllergy({
        id: `alg-${idx + 1}`,
        substance: alg.substance,
        reaction: alg.reaction,
        criticality: alg.criticality || 'high'
      });
      entries.push(allergy);
    });

    return buildFHIRBundle(entries);
  }
}
