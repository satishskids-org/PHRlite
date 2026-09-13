import { GitHealthPassport } from '../core/git_engine.ts';
import { 
  createFHIRPatient, 
  createFHIREncounter, 
  createFHIRObservation, 
  buildFHIRBundle 
} from '../core/fhir.ts';
import type { AuthorIdentity, FHIRBundle } from '../core/types.ts';

export interface PediatricScreeningData {
  studentName: string;
  studentId: string;
  birthDate: string;
  gender: string;
  schoolName: string;
  gradeSection: string;
  heightCm: number;
  weightKg: number;
  visionLeft: string;  // e.g. "6/6", "20/20"
  visionRight: string;
  dentalCariesCount: number;
  hearingStatus: 'Normal' | 'Needs Referral';
  generalHealthSummary: string;
}

export class SKIDSSchoolScreeningProvider {
  public authority: AuthorIdentity;
  private privateKeyHex: string;

  constructor(authority: AuthorIdentity, privateKeyHex: string) {
    this.authority = authority;
    this.privateKeyHex = privateKeyHex;
  }

  /**
   * Conduct a certified school health screening exam, creating the student's
   * genesis passport and stamping the comprehensive pediatric report.
   */
  public conductScreening(data: PediatricScreeningData, dbPath: string = ':memory:'): {
    passport: GitHealthPassport;
    parentClaimPayload: {
      studentId: string;
      studentName: string;
      schoolName: string;
      screeningDate: string;
      passportId: string;
      headCommitHash: string;
      claimUrl: string;
    };
  } {
    const passportId = `passport-skids-${data.studentId}`;
    const passport = GitHealthPassport.init(
      passportId,
      `STUDENT-${data.studentId}`,
      this.authority.publicKeyHex,
      dbPath
    );

    // Calculate BMI
    const heightM = data.heightCm / 100;
    const bmi = +(data.weightKg / (heightM * heightM)).toFixed(1);

    // Build standard FHIR entries for the pediatric screening
    const entries: any[] = [];

    // 1. Patient Resource
    entries.push(createFHIRPatient({
      id: data.studentId,
      name: data.studentName,
      gender: data.gender,
      birthDate: data.birthDate
    }));

    // 2. Encounter Resource
    entries.push(createFHIREncounter({
      id: `enc-screening-${Date.now()}`,
      type: 'Annual Pediatric School Health Screening',
      serviceProvider: `${this.authority.institution || 'SKIDS School Health'} @ ${data.schoolName}`,
      reason: 'Pediatric Comprehensive Health & Development Check',
      summaryNote: `Annual screening for Grade ${data.gradeSection}. ${data.generalHealthSummary}`
    }));

    // 3. Observations: Height, Weight, BMI
    entries.push(createFHIRObservation({
      id: `obs-ht-${Date.now()}`,
      name: 'Body Height',
      code: '8302-2',
      value: data.heightCm,
      unit: 'cm',
      category: 'pediatric-screening'
    }));

    entries.push(createFHIRObservation({
      id: `obs-wt-${Date.now()}`,
      name: 'Body Weight',
      code: '29463-7',
      value: data.weightKg,
      unit: 'kg',
      category: 'pediatric-screening'
    }));

    entries.push(createFHIRObservation({
      id: `obs-bmi-${Date.now()}`,
      name: 'Body Mass Index',
      code: '39156-5',
      value: bmi,
      unit: 'kg/m2',
      category: 'pediatric-screening'
    }));

    // 4. Vision & Dental Observations
    entries.push(createFHIRObservation({
      id: `obs-dental-${Date.now()}`,
      name: 'Dental Caries Count',
      code: '54570-7',
      value: data.dentalCariesCount,
      unit: 'count',
      category: 'pediatric-screening'
    }));

    const bundle: FHIRBundle = buildFHIRBundle(entries);

    // Append the certified screening commit (Genesis block)
    const commit = passport.appendCommit({
      author: this.authority,
      authorPrivateKeyHex: this.privateKeyHex,
      commitType: 'SCREENING_EXAM',
      summaryText: `SKIDS Certified Annual Screening @ ${data.schoolName} (${data.studentName}, Grade ${data.gradeSection})`,
      bundle
    });

    const parentClaimPayload = {
      studentId: data.studentId,
      studentName: data.studentName,
      schoolName: data.schoolName,
      screeningDate: new Date().toISOString().split('T')[0],
      passportId,
      headCommitHash: commit.commitHash,
      claimUrl: `https://passport.skids.health/claim?id=${passportId}&sig=${commit.signature.slice(0, 16)}`
    };

    return { passport, parentClaimPayload };
  }
}
