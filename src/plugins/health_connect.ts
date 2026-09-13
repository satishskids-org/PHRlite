import { createFHIRObservation, buildFHIRBundle } from '../core/fhir.ts';
import type { GitHealthPassport } from '../core/git_engine.ts';
import type { AuthorIdentity, FHIRBundle } from '../core/types.ts';

export interface AndroidHealthConnectTelemetry {
  samplePeriodStart: string;
  samplePeriodEnd: string;
  restingHeartRateAvgBpm: number;
  minHeartRateBpm: number;
  maxHeartRateBpm: number;
  averageOxygenSaturationSpO2: number;
  dailyStepAverage: number;
  sleepHoursAverage: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
}

/**
 * Google Android Health Connect & Samsung Health Plugin
 * Aggregates noisy continuous wearable telemetry into high-value clinical FHIR summaries
 */
export class HealthConnectAdapter {
  public static squashTelemetryToCommit(params: {
    passport: GitHealthPassport;
    telemetry: AndroidHealthConnectTelemetry;
    patientAuthor: AuthorIdentity;
    patientPrivateKeyHex: string;
  }): void {
    const entries: any[] = [];

    // 1. Resting Heart Rate
    entries.push(createFHIRObservation({
      id: `obs-hc-rhr-${Date.now()}`,
      name: 'Resting Heart Rate (7-day average)',
      code: '8867-4',
      value: params.telemetry.restingHeartRateAvgBpm,
      unit: 'beats/min',
      category: 'wearable-telemetry'
    }));

    // 2. SpO2 Oxygen Saturation
    entries.push(createFHIRObservation({
      id: `obs-hc-spo2-${Date.now()}`,
      name: 'Oxygen Saturation in Blood',
      code: '2708-6',
      value: params.telemetry.averageOxygenSaturationSpO2,
      unit: '%',
      category: 'wearable-telemetry'
    }));

    // 3. Daily Step Average
    entries.push(createFHIRObservation({
      id: `obs-hc-steps-${Date.now()}`,
      name: 'Daily Step Count (Rolling Average)',
      code: '55423-8',
      value: params.telemetry.dailyStepAverage,
      unit: 'steps/day',
      category: 'wearable-telemetry'
    }));

    // 4. Optional Blood Pressure if logged
    if (params.telemetry.bloodPressureSystolic && params.telemetry.bloodPressureDiastolic) {
      entries.push(createFHIRObservation({
        id: `obs-hc-bpsys-${Date.now()}`,
        name: 'Systolic Blood Pressure',
        code: '8480-6',
        value: params.telemetry.bloodPressureSystolic,
        unit: 'mmHg',
        category: 'wearable-telemetry'
      }));
      entries.push(createFHIRObservation({
        id: `obs-hc-bpdia-${Date.now()}`,
        name: 'Diastolic Blood Pressure',
        code: '8462-4',
        value: params.telemetry.bloodPressureDiastolic,
        unit: 'mmHg',
        category: 'wearable-telemetry'
      }));
    }

    const bundle: FHIRBundle = buildFHIRBundle(entries);

    // Append as a periodic vitals summary commit
    params.passport.appendCommit({
      author: params.patientAuthor,
      authorPrivateKeyHex: params.patientPrivateKeyHex,
      commitType: 'VITALS_SUMMARY',
      summaryText: `Wearable Biometrics: ${params.telemetry.restingHeartRateAvgBpm} bpm RHR, ${params.telemetry.dailyStepAverage} steps/day`,
      bundle
    });
  }
}
