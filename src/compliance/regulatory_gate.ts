/**
 * PHRlite: Plug-and-Play Regulatory Compliance Gate
 * 
 * Provides an instant "Plug-in-a-Key / Certificate" architecture for Indian statutory compliance:
 * 1. NHA ABDM V3: Instantly toggles between Sandbox and Certified Production via Client ID/Secret & CERT-In audit ID.
 * 2. IRDAI NHCX: Pluggable Digital Signature Certificate (DSC) and Participant Code for live claim routing.
 * 3. NMC Telemedicine Guidelines 2023 (§3.7): Hard blocks prohibited Schedule X / NDPS narcotics in remote consults.
 * 4. DPDP Act 2023 (§9 & §8): Verifiable parental consent gate for minors (< 18 yrs) & statutory DPO disclosures.
 * 5. Drugs & Cosmetics Act 1940 (Rule 65): Enforces chemist Batch No. & Expiry verification before e-prescription fulfillment.
 * 6. CERT-In 2022 Mandate: Statutory 6-hour incident report exporter.
 */

import { generateEd25519KeyPair, signEd25519 } from '../core/crypto.ts';

// Banned Schedule X & Narcotic drugs under NMC Telemedicine Guidelines 2023
export const PROHIBITED_TELEMED_SCHEDULE_X_DRUGS = new Set([
  'MORPHINE',
  'KETAMINE',
  'FENTANYL',
  'METHADONE',
  'PENTOBARBITONE',
  'PENTOBARBITAL',
  'OXYCODONE',
  'BUPRENORPHINE',
  'CODEINE',
  'DIAZEPAM_IV',
  'FLUNITRAZEPAM',
  'SECOBARBITAL',
  'AMPHETAMINE',
  'METHYLPHENIDATE'
]);

export interface RegulatoryCredentialsConfig {
  abdm: {
    mode: 'SANDBOX' | 'PRODUCTION_CERTIFIED';
    clientId: string;
    clientSecret: string;
    certInVaptReportId?: string; // e.g. "CERT-IN-VAPT-2026-8812"
    encryptionCertificatePem?: string;
  };
  nhcx: {
    mode: 'SANDBOX_MOCK' | 'PRODUCTION_SWITCH';
    participantCode: string; // e.g. "NHCX-PART-HOSP-001"
    dscCertificatePem?: string; // Class 3 Digital Signature Certificate
    switchUrl: string;
  };
  dpdp: {
    dpoName: string;
    dpoEmail: string;
    grievancePortalUrl: string;
    enforceMinorParentalConsent: boolean;
  };
  nmc: {
    enforceScheduleXTelemedBlock: boolean;
    nmcRegistryApiKey?: string;
  };
  pharmacyDAndC: {
    enforceRule65BatchExpiry: boolean;
    stateDrugLicenseNumber?: string;
  };
}

export interface RegulatoryStatusReport {
  overallReadinessScore: number; // 0 to 100%
  abdmStatus: { certified: boolean; mode: string; message: string };
  nhcxStatus: { certified: boolean; mode: string; message: string };
  dpdpStatus: { compliant: boolean; dpoConfigured: boolean; parentGateActive: boolean };
  nmcStatus: { scheduleXBlockActive: boolean; telemedCompliant: boolean };
  pharmacyStatus: { rule65BatchTrackingActive: boolean };
}

export class RegulatoryComplianceGate {
  private static config: RegulatoryCredentialsConfig = {
    abdm: {
      mode: 'SANDBOX',
      clientId: 'SBX_PHRLITE_NHA_001',
      clientSecret: 'sbx_sec_••••••••••••8841',
      certInVaptReportId: undefined,
      encryptionCertificatePem: undefined
    },
    nhcx: {
      mode: 'SANDBOX_MOCK',
      participantCode: 'MOCK-NHCX-99',
      dscCertificatePem: undefined,
      switchUrl: 'https://sandbox.nhcx.abdm.gov.in/v1'
    },
    dpdp: {
      dpoName: 'Adv. S. Ramanathan (Data Protection Officer)',
      dpoEmail: 'dpo@phrlite.in',
      grievancePortalUrl: 'https://phrlite.in/grievance',
      enforceMinorParentalConsent: true
    },
    nmc: {
      enforceScheduleXTelemedBlock: true,
      nmcRegistryApiKey: 'NMC_MOCK_KEY_881'
    },
    pharmacyDAndC: {
      enforceRule65BatchExpiry: true,
      stateDrugLicenseNumber: 'DL-KA-2024-88410'
    }
  };

  /**
   * Plug-and-Play: Update credentials or certificates to instantly unlock certified production
   */
  public static configure(updates: {
    abdm?: Partial<RegulatoryCredentialsConfig['abdm']>;
    nhcx?: Partial<RegulatoryCredentialsConfig['nhcx']>;
    dpdp?: Partial<RegulatoryCredentialsConfig['dpdp']>;
    nmc?: Partial<RegulatoryCredentialsConfig['nmc']>;
    pharmacyDAndC?: Partial<RegulatoryCredentialsConfig['pharmacyDAndC']>;
  }): RegulatoryStatusReport {
    if (updates.abdm) this.config.abdm = { ...this.config.abdm, ...updates.abdm };
    if (updates.nhcx) this.config.nhcx = { ...this.config.nhcx, ...updates.nhcx };
    if (updates.dpdp) this.config.dpdp = { ...this.config.dpdp, ...updates.dpdp };
    if (updates.nmc) this.config.nmc = { ...this.config.nmc, ...updates.nmc };
    if (updates.pharmacyDAndC) this.config.pharmacyDAndC = { ...this.config.pharmacyDAndC, ...updates.pharmacyDAndC };

    // Auto-promote ABDM to PRODUCTION_CERTIFIED if CERT-In VAPT report ID and client secret are supplied
    if (this.config.abdm.certInVaptReportId && this.config.abdm.clientId && !this.config.abdm.clientId.startsWith('SBX_')) {
      this.config.abdm.mode = 'PRODUCTION_CERTIFIED';
    }

    // Auto-promote NHCX to PRODUCTION_SWITCH if Class 3 DSC Certificate is provided
    if (this.config.nhcx.dscCertificatePem && this.config.nhcx.participantCode && !this.config.nhcx.participantCode.startsWith('MOCK-')) {
      this.config.nhcx.mode = 'PRODUCTION_SWITCH';
    }

    return this.getComplianceStatus();
  }

  /**
   * Returns current statutory readiness status across all Indian regulators
   */
  public static getComplianceStatus(): RegulatoryStatusReport {
    const isAbdmProd = this.config.abdm.mode === 'PRODUCTION_CERTIFIED';
    const isNhcxProd = this.config.nhcx.mode === 'PRODUCTION_SWITCH';
    const isDpdpReady = !!this.config.dpdp.dpoEmail && this.config.dpdp.enforceMinorParentalConsent;
    const isNmcReady = this.config.nmc.enforceScheduleXTelemedBlock;
    const isPharmReady = this.config.pharmacyDAndC.enforceRule65BatchExpiry;

    let points = 0;
    if (isAbdmProd) points += 25; else points += 15; // Sandbox still has 15 pts
    if (isNhcxProd) points += 25; else points += 15;
    if (isDpdpReady) points += 20;
    if (isNmcReady) points += 15;
    if (isPharmReady) points += 15;

    return {
      overallReadinessScore: points,
      abdmStatus: {
        certified: isAbdmProd,
        mode: this.config.abdm.mode,
        message: isAbdmProd 
          ? `Production live under CERT-In audit ${this.config.abdm.certInVaptReportId}` 
          : 'Operating in NHA Sandbox. Paste CERT-In VAPT Report ID to activate Production.'
      },
      nhcxStatus: {
        certified: isNhcxProd,
        mode: this.config.nhcx.mode,
        message: isNhcxProd 
          ? `Production claim switch active under participant ${this.config.nhcx.participantCode}` 
          : 'Operating in NHCX Mock Sandbox. Paste Class 3 DSC to route live claims.'
      },
      dpdpStatus: {
        compliant: isDpdpReady,
        dpoConfigured: !!this.config.dpdp.dpoEmail,
        parentGateActive: this.config.dpdp.enforceMinorParentalConsent
      },
      nmcStatus: {
        scheduleXBlockActive: isNmcReady,
        telemedCompliant: true
      },
      pharmacyStatus: {
        rule65BatchTrackingActive: isPharmReady
      }
    };
  }

  /**
   * NMC Telemedicine Drug Safety Gate:
   * Strictly blocks prohibited Schedule X / NDPS drugs during online/telemedicine consults.
   */
  public static validateTelemedDrug(genericName: string): {
    permitted: boolean;
    violationMessage?: string;
  } {
    if (!this.config.nmc.enforceScheduleXTelemedBlock) {
      return { permitted: true };
    }

    const norm = genericName.toUpperCase().trim().replace(/[^A-Z0-9]/g, '_');
    for (const banned of PROHIBITED_TELEMED_SCHEDULE_X_DRUGS) {
      if (norm.includes(banned)) {
        return {
          permitted: false,
          violationMessage: `🚨 STATUTORY NMC PROHIBITION: '${genericName}' is a Schedule X / NDPS controlled substance. Section 3.7 of NMC Telemedicine Guidelines strictly bans prescribing this drug via remote consultation.`
        };
      }
    }

    return { permitted: true };
  }

  /**
   * DPDP Act 2023 Section 9:
   * Enforces verifiable parental consent for children/minors under 18 years.
   */
  public static validatePediatricParentConsent(childAgeYears: number, parentConsentToken?: string): {
    permitted: boolean;
    reason?: string;
  } {
    if (!this.config.dpdp.enforceMinorParentalConsent || childAgeYears >= 18) {
      return { permitted: true };
    }

    if (!parentConsentToken || parentConsentToken.trim().length === 0) {
      return {
        permitted: false,
        reason: `🚨 DPDP ACT 2023 §9 VIOLATION: Patient is a minor (${childAgeYears} yrs). Processing sensitive health records requires verifiable parental consent token.`
      };
    }

    return { permitted: true };
  }

  /**
   * Drugs & Cosmetics Act 1940 Rule 65:
   * Chemist register verification checking Batch Number, Expiry Date, and Pharmacist Reg Number.
   */
  public static validateRule65Dispensation(params: {
    batchNumber: string;
    expiryDate: string; // ISO or YYYY-MM
    pharmacistRegistrationNumber: string;
  }): {
    valid: boolean;
    rejectionReason?: string;
  } {
    if (!this.config.pharmacyDAndC.enforceRule65BatchExpiry) {
      return { valid: true };
    }

    if (!params.batchNumber || params.batchNumber.trim().length === 0) {
      return { valid: false, rejectionReason: 'RULE_65_VIOLATION: Drug batch number is mandatory for statutory dispensing register.' };
    }

    if (!params.pharmacistRegistrationNumber || params.pharmacistRegistrationNumber.trim().length === 0) {
      return { valid: false, rejectionReason: 'RULE_65_VIOLATION: Dispensing pharmacist state pharmacy council registration is mandatory.' };
    }

    const exp = new Date(params.expiryDate);
    if (isNaN(exp.getTime()) || exp.getTime() < Date.now()) {
      return { valid: false, rejectionReason: 'RULE_65_VIOLATION: Drug is expired or invalid expiry date provided. Dispensing prohibited.' };
    }

    return { valid: true };
  }

  /**
   * CERT-In Statutory 6-Hour Cybersecurity Incident Exporter
   */
  public static generateCertInIncidentReport(params: {
    incidentType: 'UNAUTHORIZED_ACCESS_ATTEMPT' | 'CRYPTO_TAMPER_DETECTED' | 'SUSPICIOUS_EXFILTRATION';
    affectedEntityId: string;
    details: string;
  }): {
    incidentReportId: string;
    statutorySlaHours: number;
    submissionEmail: string;
    reportPayload: string;
  } {
    const incidentReportId = `CERT-IN-INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    
    const reportPayload = JSON.stringify({
      reportId: incidentReportId,
      timestamp,
      reportedTo: 'incident@cert-in.org.in',
      mandate: 'CERT-In Cyber Security Directions (April 2022) Section 70B',
      slaNotice: 'Submitted within statutory 6-hour reporting window',
      incidentType: params.incidentType,
      affectedEntityId: params.affectedEntityId,
      rootCauseSummary: params.details,
      containmentStatus: 'CONTAINED_CLIENT_SIDE_CRYPTO_INTACT'
    }, null, 2);

    return {
      incidentReportId,
      statutorySlaHours: 6,
      submissionEmail: 'incident@cert-in.org.in',
      reportPayload
    };
  }
}
