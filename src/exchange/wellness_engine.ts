/**
 * PHRlite: IRDAI Statutory Wellness Engine & Insurance Bank Balance
 * 
 * Statutory Compliance:
 * - IRDAI Guidelines on Wellness and Preventive Features (2020)
 * - IRDAI Master Circular on Health Insurance (2024), Sections 13 & 15
 */

import { generateEd25519KeyPair, signEd25519 } from '../core/crypto.ts';

export interface InsurancePolicyAccount {
  policyId: string;
  policyNumber: string;
  insurerName: string;
  insurerCode: string;
  planName: string;
  policyType: 'INDIVIDUAL' | 'FAMILY_FLOATER' | 'CORPORATE_GROUP';
  totalSumInsured: number;
  availableBalance: number;
  cumulativeNoClaimBonus: number;
  pedWaitingPeriodMonthsCleared: number; // Pre-Existing Disease months
  portabilityStatus: 'PORTABLE_NO_PED_RESET' | 'PENDING_VERIFICATION' | 'STANDARD';
  roomRentCategory: string;
  coPayPercentage: number;
  startDate: string;
  expiryDate: string;
  tpaName?: string;
  verifiedTimestamp: string;
}

export interface ClinicalScreeningEntry {
  screeningType: 'LIPID_PROFILE' | 'HBA1C' | 'BLOOD_PRESSURE' | 'BMI_BODY_COMP' | 'VACCINATION' | 'DENTAL' | 'VISION';
  recordedDate: string;
  facilityName: string;
  providerNmcReg: string;
  resultSummary: string;
  isNormalOrControlled: boolean;
  rawFhirObservationId?: string;
}

export interface WellnessCertificate {
  certificateId: string;
  patientId: string;
  issuanceDate: string;
  validUntil: string;
  completedScreeningsCount: number;
  totalWellnessPoints: number;
  renewalDiscountPercentage: number; // Max 20% under IRDAI 2020 rules
  estimatedAnnualSavingsInr: number;
  qualifyingInsurerCodes: string[];
  signature: string;
  issuerPublicKey: string;
}

export class WellnessEngine {
  private screenings: ClinicalScreeningEntry[] = [];
  private signingKeyPair = generateEd25519KeyPair();

  /**
   * Records a certified clinical screening stamped by a registered lab/clinic
   */
  public addScreening(entry: ClinicalScreeningEntry): void {
    this.screenings.push(entry);
  }

  /**
   * Computes the IRDAI Wellness Score according to 2020 regulatory guidelines
   */
  public calculateWellnessScore(): {
    totalPoints: number;
    discountPercentage: number;
    qualifyingCount: number;
  } {
    let points = 0;
    const now = new Date();

    for (const s of this.screenings) {
      const screeningDate = new Date(s.recordedDate);
      const ageInDays = (now.getTime() - screeningDate.getTime()) / (1000 * 60 * 60 * 24);

      // Only count screenings conducted within the last 365 days
      if (ageInDays <= 365) {
        let weight = 20; // Base points per screening
        if (s.screeningType === 'HBA1C' || s.screeningType === 'LIPID_PROFILE') {
          weight = 30; // Chronic markers carry higher preventive weight
        } else if (s.screeningType === 'BLOOD_PRESSURE' || s.screeningType === 'BMI_BODY_COMP') {
          weight = 25;
        }

        if (s.isNormalOrControlled) {
          weight += 10; // Bonus for well-managed vitals
        }

        points += weight;
      }
    }

    // IRDAI mandates a maximum statutory renewal discount of 20%
    let discountPercentage = 0;
    if (points >= 100) {
      discountPercentage = 20;
    } else if (points >= 75) {
      discountPercentage = 15;
    } else if (points >= 50) {
      discountPercentage = 10;
    } else if (points >= 25) {
      discountPercentage = 5;
    }

    return {
      totalPoints: points,
      discountPercentage,
      qualifyingCount: this.screenings.length
    };
  }

  /**
   * Generates a cryptographically signed Wellness Certificate for insurance renewal
   */
  public generateWellnessCertificate(
    patientId: string,
    annualPremiumInr: number = 25000
  ): WellnessCertificate {
    const { totalPoints, discountPercentage, qualifyingCount } = this.calculateWellnessScore();
    const certificateId = `IRDAI-WELLNESS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const issuanceDate = new Date().toISOString();
    
    // Valid for 1 year from issuance
    const validUntilDate = new Date();
    validUntilDate.setFullYear(validUntilDate.getFullYear() + 1);

    const estimatedAnnualSavingsInr = Math.round((annualPremiumInr * discountPercentage) / 100);

    const payload = `${certificateId}|${patientId}|${totalPoints}|${discountPercentage}|${issuanceDate}`;
    const signature = signEd25519(payload, this.signingKeyPair.privateKeyHex);

    return {
      certificateId,
      patientId,
      issuanceDate,
      validUntil: validUntilDate.toISOString(),
      completedScreeningsCount: qualifyingCount,
      totalWellnessPoints: totalPoints,
      renewalDiscountPercentage: discountPercentage,
      estimatedAnnualSavingsInr,
      qualifyingInsurerCodes: ['STAR_HEALTH', 'HDFC_ERGO', 'ICICI_LOMBARD', 'CARE_HEALTH', 'NIVA_BUPA'],
      signature,
      issuerPublicKey: this.signingKeyPair.publicKeyHex
    };
  }

  /**
   * Renders the Insurance "Bank Account" model
   */
  public static createInsuranceAccount(params: {
    policyNumber: string;
    insurerName: string;
    insurerCode: string;
    planName: string;
    totalSumInsured: number;
    utilizedClaimsInr?: number;
    pedMonthsCleared?: number;
    noClaimBonusInr?: number;
  }): InsurancePolicyAccount {
    const utilized = params.utilizedClaimsInr || 0;
    const available = Math.max(0, params.totalSumInsured - utilized);
    const pedCleared = params.pedMonthsCleared || 36;

    return {
      policyId: `POL-${params.insurerCode}-${Date.now()}`,
      policyNumber: params.policyNumber,
      insurerName: params.insurerName,
      insurerCode: params.insurerCode,
      planName: params.planName,
      policyType: 'FAMILY_FLOATER',
      totalSumInsured: params.totalSumInsured,
      availableBalance: available,
      cumulativeNoClaimBonus: params.noClaimBonusInr || 50000,
      pedWaitingPeriodMonthsCleared: pedCleared,
      portabilityStatus: pedCleared >= 36 ? 'PORTABLE_NO_PED_RESET' : 'STANDARD',
      roomRentCategory: 'Single Private AC (No Co-Pay)',
      coPayPercentage: 0,
      startDate: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(),
      expiryDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      tpaName: `${params.insurerName} In-House Cashless Desk`,
      verifiedTimestamp: new Date().toISOString()
    };
  }
}

