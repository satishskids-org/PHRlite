import { createFHIRObservation, buildFHIRBundle } from '../core/fhir.ts';
import type { GitHealthPassport } from '../core/git_engine.ts';
import type { AuthorIdentity, FHIRBundle } from '../core/types.ts';

export interface AppleHealthKitExport {
  exportDate: string;
  heartRateVariabilitySdnnMs: number;
  restingHeartRateBpm: number;
  ecgClassification: 'Sinus Rhythm' | 'Atrial Fibrillation' | 'Inconclusive';
  vo2MaxMlKgMin?: number;
}

/**
 * Apple HealthKit Plugin
 * Extracts Apple Watch cardiovascular telemetry and commits standard FHIR metrics
 */
export class AppleHealthKitAdapter {
  public static commitCardioMetrics(params: {
    passport: GitHealthPassport;
    metrics: AppleHealthKitExport;
    patientAuthor: AuthorIdentity;
    patientPrivateKeyHex: string;
  }): void {
    const entries: any[] = [];

    // 1. Resting Heart Rate
    entries.push(createFHIRObservation({
      id: `obs-apple-rhr-${Date.now()}`,
      name: 'Resting Heart Rate (Apple Watch)',
      code: '8867-4',
      value: params.metrics.restingHeartRateBpm,
      unit: 'beats/min',
      category: 'wearable-telemetry'
    }));

    // 2. Heart Rate Variability (SDNN)
    entries.push(createFHIRObservation({
      id: `obs-apple-hrv-${Date.now()}`,
      name: 'Heart Rate Variability SDNN',
      code: '80404-7',
      value: params.metrics.heartRateVariabilitySdnnMs,
      unit: 'ms',
      category: 'wearable-telemetry'
    }));

    // 3. ECG Classification Note
    if (params.metrics.vo2MaxMlKgMin) {
      entries.push(createFHIRObservation({
        id: `obs-apple-vo2-${Date.now()}`,
        name: 'Cardio Fitness (VO2 Max)',
        code: '94122-9',
        value: params.metrics.vo2MaxMlKgMin,
        unit: 'mL/kg/min',
        category: 'wearable-telemetry'
      }));
    }

    const bundle: FHIRBundle = buildFHIRBundle(entries);

    params.passport.appendCommit({
      author: params.patientAuthor,
      authorPrivateKeyHex: params.patientPrivateKeyHex,
      commitType: 'VITALS_SUMMARY',
      summaryText: `Apple Health Cardio: ${params.metrics.restingHeartRateBpm} bpm RHR, ECG: ${params.metrics.ecgClassification}`,
      bundle
    });
  }
}
