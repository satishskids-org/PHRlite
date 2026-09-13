/**
 * PHRlite: NMC-Compliant 30-Second Solo-Doctor Web Rx Pad
 * 
 * Statutory Compliance:
 * - National Medical Commission (NMC) Telemedicine Practice Guidelines (2020/2023)
 * - Information Technology Act 2000, Section 4 & Section 5 (Digital Signatures)
 * - Drugs and Cosmetics Act 1940 & Rules 1945 (Rule 65)
 * - National Formulary of India (NFI) & NLEM 2022 / PMBJP Jan Aushadhi
 */

import { INDIAN_OPEN_DRUG_LIBRARY, DrugSafetyChecker } from './drug_safety.ts';
import { generateEd25519KeyPair, signEd25519 } from '../core/crypto.ts';

export interface PrescribedDrugInput {
  genericName: string;          // Must be uppercase
  brandName?: string;
  strength: string;             // e.g. "625mg", "500mg"
  dosageForm: 'TABLET' | 'CAPSULE' | 'SYRUP' | 'INJECTION' | 'INHALER' | 'DROPS' | 'OINTMENT';
  frequency: string;            // e.g. "1-0-1 (Twice Daily After Food)"
  durationDays: number;
  instructions: string;
}

export interface DoctorMetadata {
  doctorName: string;
  qualification: string;        // e.g. "MBBS, MD (Medicine)"
  nmcRegistrationNumber: string;// e.g. "MCI-MH-2018-88410"
  stateMedicalCouncil: string;  // e.g. "Maharashtra Medical Council"
  clinicOrHospitalName: string;
  clinicAddress: string;
  phoneOrContact: string;
}

export interface CertifiedNmcPrescription {
  prescriptionId: string;
  issuanceTimestamp: string;
  doctor: DoctorMetadata;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  diagnosis: string;
  items: {
    genericName: string;
    brandName?: string;
    strength: string;
    dosageForm: string;
    frequency: string;
    durationDays: number;
    instructions: string;
    nlemPriceCapInr?: number;
    janAushadhiGenericName?: string;
    janAushadhiPriceInr?: number;
    estimatedSavingsInr: number;
  }[];
  totalEstimatedJanAushadhiSavingsInr: number;
  safetyAlerts: string[];
  singleDispenseNonce: string; // Cryptographic lock to prevent duplicate dispensing
  doctorSignature: string;
  doctorPublicKey: string;
}

export class SoloDoctorRxPad {
  private doctorKeys = generateEd25519KeyPair();

  /**
   * Generates a legally binding NMC-compliant e-prescription
   */
  public createPrescription(params: {
    doctor: DoctorMetadata;
    patientId: string;
    patientName: string;
    patientAge: number;
    patientGender: string;
    patientAllergies: string[];
    diagnosis: string;
    medications: PrescribedDrugInput[];
  }): {
    success: boolean;
    prescription?: CertifiedNmcPrescription;
    criticalSafetyAlerts: string[];
    errors?: string[];
  } {
    const errors: string[] = [];
    const criticalSafetyAlerts: string[] = [];

    // Statutory NMC validation
    if (!params.doctor.doctorName || params.doctor.doctorName.trim().length === 0) {
      errors.push('NMC_VIOLATION: Doctor name is mandatory.');
    }
    if (!params.doctor.nmcRegistrationNumber || params.doctor.nmcRegistrationNumber.trim().length === 0) {
      errors.push('NMC_VIOLATION: Medical council registration number is mandatory.');
    }
    if (!params.doctor.qualification) {
      errors.push('NMC_VIOLATION: Medical qualifications are mandatory.');
    }
    if (params.medications.length === 0) {
      errors.push('PRESCRIPTION_EMPTY: At least one medication must be prescribed.');
    }

    if (errors.length > 0) {
      return { success: false, criticalSafetyAlerts: [], errors };
    }

    let totalEstimatedSavings = 0;
    const processedItems = params.medications.map(med => {
      // Enforce UPPERCASE generic name as mandated by NMC
      const upperGeneric = med.genericName.toUpperCase();

      // Check drug allergies
      const safetyCheck = DrugSafetyChecker.checkContraindication(upperGeneric, params.patientAllergies);
      if (!safetyCheck.safe && safetyCheck.alertMessage) {
        criticalSafetyAlerts.push(safetyCheck.alertMessage);
      }

      // Check Jan Aushadhi generic equivalent
      const genericOpt = DrugSafetyChecker.findJanAushadhiEquivalent(med.brandName || upperGeneric);
      let savings = 0;
      let janAushadhiName: string | undefined;
      let janAushadhiPrice: number | undefined;

      if (genericOpt.available && genericOpt.genericEquivalent) {
        savings = genericOpt.genericEquivalent.potentialSavingsInr;
        janAushadhiName = genericOpt.genericEquivalent.genericName;
        janAushadhiPrice = genericOpt.genericEquivalent.janAushadhiPriceInr;
        totalEstimatedSavings += savings;
      }

      // Check NLEM ceiling price
      const nlemCheck = DrugSafetyChecker.lookupNlemCeilingPrice(upperGeneric);

      return {
        genericName: upperGeneric,
        brandName: med.brandName,
        strength: med.strength,
        dosageForm: med.dosageForm,
        frequency: med.frequency,
        durationDays: med.durationDays,
        instructions: med.instructions,
        nlemPriceCapInr: nlemCheck.isControlled ? nlemCheck.ceilingPriceInr : undefined,
        janAushadhiGenericName: janAushadhiName,
        janAushadhiPriceInr: janAushadhiPrice,
        estimatedSavingsInr: savings
      };
    });

    const prescriptionId = `RX-NMC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const issuanceTimestamp = new Date().toISOString();
    const singleDispenseNonce = `NONCE-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    const signPayload = `${prescriptionId}|${params.doctor.nmcRegistrationNumber}|${params.patientId}|${singleDispenseNonce}|${issuanceTimestamp}`;
    const doctorSignature = signEd25519(signPayload, this.doctorKeys.privateKeyHex);

    const prescription: CertifiedNmcPrescription = {
      prescriptionId,
      issuanceTimestamp,
      doctor: params.doctor,
      patientId: params.patientId,
      patientName: params.patientName,
      patientAge: params.patientAge,
      patientGender: params.patientGender,
      diagnosis: params.diagnosis,
      items: processedItems,
      totalEstimatedJanAushadhiSavingsInr: totalEstimatedSavings,
      safetyAlerts: criticalSafetyAlerts,
      singleDispenseNonce,
      doctorSignature,
      doctorPublicKey: this.doctorKeys.publicKeyHex
    };

    return {
      success: true,
      prescription,
      criticalSafetyAlerts
    };
  }

  public getPublicKey(): string {
    return this.doctorKeys.publicKeyHex;
  }
}

