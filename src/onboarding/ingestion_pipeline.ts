import { 
  createFHIRCondition, 
  createFHIRMedication, 
  createFHIRObservation, 
  createFHIREncounter, 
  buildFHIRBundle 
} from '../core/fhir.ts';
import type { FHIRBundle, AuthorIdentity } from '../core/types.ts';
import type { GitHealthPassport } from '../core/git_engine.ts';

export interface LegacyDocumentExtraction {
  documentTitle: string;
  sourceFacility: string;
  encounterDate: string;
  diagnoses: Array<{ name: string; icd10: string }>;
  medications: Array<{ drug: string; dosage: string }>;
  labValues: Array<{ test: string; loinc: string; value: number; unit: string }>;
}

export class BackOfficeIngestionPipeline {
  /**
   * Process extracted entities from legacy documents, bundle them into FHIR,
   * and sign them into the patient's passport as an audited baseline commit.
   */
  public static commitLegacyRecord(params: {
    passport: GitHealthPassport;
    extraction: LegacyDocumentExtraction;
    reviewer: AuthorIdentity;
    reviewerPrivateKeyHex: string;
  }): void {
    const entries: any[] = [];

    // Encounter representing the historic medical record
    entries.push(createFHIREncounter({
      id: `historic-enc-${Date.now()}`,
      type: `Legacy Ingestion: ${params.extraction.documentTitle}`,
      serviceProvider: params.extraction.sourceFacility,
      reason: 'Back-Office Ingestion of Historical Records',
      summaryNote: `Digitized and verified from ${params.extraction.sourceFacility} records dated ${params.extraction.encounterDate}.`,
      start: params.extraction.encounterDate
    }));

    // Diagnoses
    params.extraction.diagnoses.forEach((d, idx) => {
      entries.push(createFHIRCondition({
        id: `legacy-diag-${idx + 1}`,
        name: d.name,
        code: d.icd10,
        onsetDate: params.extraction.encounterDate
      }));
    });

    // Medications
    params.extraction.medications.forEach((m, idx) => {
      entries.push(createFHIRMedication({
        id: `legacy-med-${idx + 1}`,
        medication: m.drug,
        dosage: m.dosage
      }));
    });

    // Historic Labs
    params.extraction.labValues.forEach((l, idx) => {
      entries.push(createFHIRObservation({
        id: `legacy-lab-${idx + 1}`,
        name: l.test,
        code: l.loinc,
        value: l.value,
        unit: l.unit,
        category: 'laboratory'
      }));
    });

    const bundle: FHIRBundle = buildFHIRBundle(entries);

    // Append to passport as an official ingestion commit
    params.passport.appendCommit({
      author: params.reviewer,
      authorPrivateKeyHex: params.reviewerPrivateKeyHex,
      commitType: 'ENCOUNTER',
      summaryText: `Back-Office Ingestion: ${params.extraction.documentTitle} (${params.extraction.sourceFacility})`,
      bundle,
      customTimestamp: params.extraction.encounterDate
    });
  }
}
