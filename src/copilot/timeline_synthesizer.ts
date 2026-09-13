import type { GitHealthPassport } from '../core/git_engine.ts';
import type { Commit } from '../core/types.ts';

export interface DoctorMentalModel {
  patientHeader: {
    passportId: string;
    patientName: string;
    birthDate: string;
    gender: string;
    bloodType?: string;
    totalLifetimeCommits: number;
  };
  criticalAlerts: {
    allergies: Array<{ substance: string; reaction: string; criticality: string }>;
  };
  activeProblems: Array<{ code: string; name: string; onsetDate?: string }>;
  currentMedications: Array<{ drug: string; dosage: string }>;
  recentVitals: Record<string, { value: number; unit: string; date: string }>;
  timelineDiffSinceLastEncounter: {
    lastEncounterSummary: string;
    lastEncounterDate: string;
    lastEncounterDoctor: string;
    newDiagnosesSince: string[];
    newMedicationsSince: string[];
    wearableObservationsRecorded: number;
  };
  recentHistoryTimeline: Array<{
    date: string;
    type: string;
    author: string;
    summary: string;
  }>;
}

export class TimelineSynthesizer {
  /**
   * Synthesize decades of commits into the instant 1-page "Doctor's Mental Model"
   */
  public static generateMentalModel(passport: GitHealthPassport): DoctorMentalModel {
    const commits = passport.db.getAllCommits();
    const metadata = passport.db.getMetadata();
    const activeConditions = passport.db.getActiveConditions();
    const activeMedications = passport.db.getActiveMedications();
    const allergies = passport.db.getAllergies();

    // Extract patient profile from genesis/intake
    let patientName = 'Unknown Patient';
    let birthDate = 'Unknown';
    let gender = 'Unknown';
    let bloodType = undefined;

    for (const c of commits) {
      for (const entry of c.bundle.entry) {
        if (entry.resource.resourceType === 'Patient') {
          const p = entry.resource;
          patientName = p.name;
          birthDate = p.birthDate;
          gender = p.gender;
          bloodType = p.bloodType;
          break;
        }
      }
    }

    // Find the last clinical encounter commit
    const encounterCommits = commits.filter(c => 
      c.commitType === 'ENCOUNTER' || c.commitType === 'DISCHARGE'
    );

    let lastEncounterCommit: Commit | null = null;
    let priorEncounterCommit: Commit | null = null;

    if (encounterCommits.length >= 1) {
      lastEncounterCommit = encounterCommits[encounterCommits.length - 1];
    }
    if (encounterCommits.length >= 2) {
      priorEncounterCommit = encounterCommits[encounterCommits.length - 2];
    }

    // Calculate diff between prior encounter and current state
    const diffBase = priorEncounterCommit ? priorEncounterCommit.commitHash : null;
    const diffHead = commits.length > 0 ? commits[commits.length - 1].commitHash : '';
    const diff = passport.diff(diffBase, diffHead);

    // Extract latest vitals/observations
    const recentVitals: Record<string, { value: number; unit: string; date: string }> = {};
    for (let i = commits.length - 1; i >= 0; i--) {
      for (const entry of commits[i].bundle.entry) {
        if (entry.resource.resourceType === 'Observation') {
          const obs = entry.resource;
          const key = obs.code.text || obs.code.coding[0]?.display || 'Vital';
          if (!recentVitals[key] && obs.valueQuantity) {
            recentVitals[key] = {
              value: obs.valueQuantity.value,
              unit: obs.valueQuantity.unit,
              date: obs.effectiveDateTime.split('T')[0]
            };
          }
        }
      }
    }

    return {
      patientHeader: {
        passportId: metadata?.passportId || 'N/A',
        patientName,
        birthDate,
        gender,
        bloodType,
        totalLifetimeCommits: commits.length
      },
      criticalAlerts: {
        allergies: allergies.map(a => ({
          substance: a.substance,
          reaction: a.reaction,
          criticality: a.criticality
        }))
      },
      activeProblems: activeConditions.map(c => ({
        code: c.code,
        name: c.display_name,
        onsetDate: c.onset_date
      })),
      currentMedications: activeMedications.map(m => ({
        drug: m.drug_name,
        dosage: m.dosage
      })),
      recentVitals,
      timelineDiffSinceLastEncounter: {
        lastEncounterSummary: lastEncounterCommit ? lastEncounterCommit.summaryText : 'No previous clinic encounter recorded',
        lastEncounterDate: lastEncounterCommit ? lastEncounterCommit.timestamp.split('T')[0] : 'N/A',
        lastEncounterDoctor: lastEncounterCommit ? `${lastEncounterCommit.author.name} (${lastEncounterCommit.author.institution || 'Clinic'})` : 'N/A',
        newDiagnosesSince: diff.addedConditions,
        newMedicationsSince: diff.addedMedications,
        wearableObservationsRecorded: diff.observationsRecorded
      },
      recentHistoryTimeline: commits.slice(-5).reverse().map(c => ({
        date: c.timestamp.split('T')[0],
        type: c.commitType,
        author: `${c.author.name} [${c.author.role}]`,
        summary: c.summaryText
      }))
    };
  }
}
