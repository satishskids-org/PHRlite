import type { 
  FHIRBundle, 
  FHIRPatient, 
  FHIREncounter, 
  FHIRCondition, 
  FHIRMedicationRequest, 
  FHIRAllergyIntolerance, 
  FHIRObservation, 
  FHIRCoverage 
} from '../core/types.ts';

/**
 * Universal Interoperability Bridge
 * Implements National Resource Centre for EHR Standards (NRCeS) FHIR R4 Profiles for India ABDM
 * Breaking the vendor lock-in wall of legacy hospital EMR and HIS systems.
 */
export class EmrInteroperabilityBridge {
  /**
   * Export an OPConsultRecord Bundle (NRCeS / ABDM standard)
   */
  static exportOPConsultRecord(params: {
    bundleId: string;
    patient: FHIRPatient;
    encounter: FHIREncounter;
    conditions: FHIRCondition[];
    medications: FHIRMedicationRequest[];
    allergies: FHIRAllergyIntolerance[];
    observations: FHIRObservation[];
    coverage?: FHIRCoverage;
  }): FHIRBundle {
    const entries: FHIRBundle['entry'] = [
      { resource: params.patient },
      { resource: params.encounter },
      ...params.conditions.map(c => ({ resource: c })),
      ...params.medications.map(m => ({ resource: m })),
      ...params.allergies.map(a => ({ resource: a })),
      ...params.observations.map(o => ({ resource: o })),
    ];

    if (params.coverage) {
      entries.push({ resource: params.coverage });
    }

    return {
      resourceType: 'Bundle',
      id: params.bundleId,
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: entries,
    };
  }

  /**
   * Export an NRCeS PrescriptionRecord (for Pharmacy POS billing)
   */
  static exportPrescriptionRecord(params: {
    bundleId: string;
    patient: FHIRPatient;
    medications: FHIRMedicationRequest[];
    prescribedBy: string;
    doctorLicense: string;
  }): FHIRBundle {
    return {
      resourceType: 'Bundle',
      id: params.bundleId,
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: [
        { resource: params.patient },
        ...params.medications.map(m => ({ resource: m })),
      ],
    };
  }

  /**
   * Import legacy hospital EMR flat JSON / HL7 v2 parsed payload into standard FHIR
   */
  static importLegacyHospitalFeed(legacyData: {
    hospitalName: string;
    patientName: string;
    patientDob: string;
    gender: string;
    visitDate: string;
    diagnoses: string[];
    prescriptions: Array<{ drug: string; dosage: string }>;
    labResults?: Array<{ testName: string; value: number; unit: string }>;
    insurancePolicyNumber?: string;
    insurerName?: string;
  }): FHIRBundle {
    const patientId = `pat-${legacyData.patientName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    const patient: FHIRPatient = {
      resourceType: 'Patient',
      id: patientId,
      name: legacyData.patientName,
      gender: legacyData.gender,
      birthDate: legacyData.patientDob,
    };

    const encounter: FHIREncounter = {
      resourceType: 'Encounter',
      id: `enc-${Date.now()}`,
      status: 'finished',
      type: 'Hospital Outpatient Visit',
      serviceProvider: legacyData.hospitalName,
      period: {
        start: legacyData.visitDate,
        end: legacyData.visitDate,
      },
    };

    const conditions: FHIRCondition[] = legacyData.diagnoses.map((diag, idx) => ({
      resourceType: 'Condition',
      id: `cond-legacy-${idx}`,
      code: {
        coding: [{ system: 'http://snomed.info/sct', code: '404684003', display: diag }],
        text: diag,
      },
      clinicalStatus: 'active',
      onsetDate: legacyData.visitDate,
    }));

    const medications: FHIRMedicationRequest[] = legacyData.prescriptions.map((p, idx) => ({
      resourceType: 'MedicationRequest',
      id: `med-legacy-${idx}`,
      medication: p.drug,
      dosageInstruction: p.dosage,
      status: 'active',
      authoredOn: legacyData.visitDate,
    }));

    const observations: FHIRObservation[] = (legacyData.labResults ?? []).map((lab, idx) => ({
      resourceType: 'Observation',
      id: `obs-legacy-${idx}`,
      code: {
        coding: [{ system: 'http://loinc.org', code: 'LAB-LOINC', display: lab.testName }],
        text: lab.testName,
      },
      effectiveDateTime: legacyData.visitDate,
      category: 'laboratory',
      valueQuantity: {
        value: lab.value,
        unit: lab.unit,
      },
    }));

    const entries: FHIRBundle['entry'] = [
      { resource: patient },
      { resource: encounter },
      ...conditions.map(c => ({ resource: c })),
      ...medications.map(m => ({ resource: m })),
      ...observations.map(o => ({ resource: o })),
    ];

    if (legacyData.insurancePolicyNumber && legacyData.insurerName) {
      const coverage: FHIRCoverage = {
        resourceType: 'Coverage',
        id: `cov-${legacyData.insurancePolicyNumber}`,
        status: 'active',
        subscriberId: legacyData.insurancePolicyNumber,
        beneficiary: `Patient/${patientId}`,
        payor: {
          name: legacyData.insurerName,
          code: 'IRDAI-LEGACY',
        },
        period: {
          start: legacyData.visitDate,
          end: '2030-12-31',
        },
        policyType: 'Commercial Health Insurance',
      };
      entries.push({ resource: coverage });
    }

    return {
      resourceType: 'Bundle',
      id: `bundle-legacy-import-${Date.now()}`,
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: entries,
    };
  }
}
