import type {
  FHIRPatient,
  FHIREncounter,
  FHIRCondition,
  FHIRMedicationRequest,
  FHIRAllergyIntolerance,
  FHIRObservation,
  FHIRBundle
} from './types.ts';

export function createFHIRPatient(params: {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  bloodType?: string;
}): FHIRPatient {
  return {
    resourceType: 'Patient',
    id: params.id,
    name: params.name,
    gender: params.gender,
    birthDate: params.birthDate,
    bloodType: params.bloodType
  };
}

export function createFHIREncounter(params: {
  id: string;
  type: string;
  serviceProvider: string;
  reason: string;
  summaryNote: string;
  start?: string;
}): FHIREncounter {
  return {
    resourceType: 'Encounter',
    id: params.id,
    status: 'finished',
    type: params.type,
    period: {
      start: params.start || new Date().toISOString(),
      end: new Date().toISOString()
    },
    serviceProvider: params.serviceProvider,
    reasonCode: [{
      coding: [{ system: 'http://snomed.info/sct', code: 'encounter', display: params.reason }],
      text: params.reason
    }],
    summaryNote: params.summaryNote
  };
}

export function createFHIRCondition(params: {
  id: string;
  name: string;
  code: string;
  clinicalStatus?: 'active' | 'resolved' | 'remission';
  onsetDate?: string;
}): FHIRCondition {
  return {
    resourceType: 'Condition',
    id: params.id,
    code: {
      coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: params.code, display: params.name }],
      text: params.name
    },
    clinicalStatus: params.clinicalStatus || 'active',
    onsetDate: params.onsetDate || new Date().toISOString()
  };
}

export function createFHIRMedication(params: {
  id: string;
  medication: string;
  dosage: string;
  status?: 'active' | 'stopped';
}): FHIRMedicationRequest {
  return {
    resourceType: 'MedicationRequest',
    id: params.id,
    medication: params.medication,
    dosageInstruction: params.dosage,
    status: params.status || 'active',
    authoredOn: new Date().toISOString()
  };
}

export function createFHIRAllergy(params: {
  id: string;
  substance: string;
  reaction: string;
  criticality?: 'low' | 'high';
}): FHIRAllergyIntolerance {
  return {
    resourceType: 'AllergyIntolerance',
    id: params.id,
    substance: params.substance,
    reaction: params.reaction,
    criticality: params.criticality || 'high'
  };
}

export function createFHIRObservation(params: {
  id: string;
  name: string;
  code: string;
  value: number;
  unit: string;
  category?: 'vital-signs' | 'laboratory' | 'pediatric-screening' | 'wearable-telemetry';
}): FHIRObservation {
  return {
    resourceType: 'Observation',
    id: params.id,
    code: {
      coding: [{ system: 'http://loinc.org', code: params.code, display: params.name }],
      text: params.name
    },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: params.value,
      unit: params.unit
    },
    category: params.category || 'vital-signs'
  };
}

export function buildFHIRBundle(entries: Array<
  | FHIRPatient 
  | FHIREncounter 
  | FHIRCondition 
  | FHIRMedicationRequest 
  | FHIRAllergyIntolerance 
  | FHIRObservation
>): FHIRBundle {
  return {
    resourceType: 'Bundle',
    id: 'bundle-' + Date.now(),
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: entries.map(resource => ({ resource }))
  };
}
