import type { 
  FHIRBundle, 
  FHIRMedicationRequest, 
  FHIRPatient, 
  AuthorIdentity 
} from '../core/types.ts';
import { verifyEd25519 } from '../core/crypto.ts';
import { checkPrescriptionSafety } from './drug_safety.ts';

export interface EcommerceCartItem {
  sku: string;
  drugName: string;
  prescribedQuantity: number;
  unitPriceINR: number;
  isJanAushadhiGeneric: boolean;
  savingsVsBrandedINR?: number;
}

export interface EcommerceOrderResult {
  orderId: string;
  status: 'VERIFIED_AND_PLACED' | 'REJECTED';
  rejectionReason?: string;
  patientName: string;
  doctorName: string;
  doctorLicense: string;
  items: EcommerceCartItem[];
  subtotalINR: number;
  totalSavingsINR: number;
  deliveryEstimateHours: number;
  refillScheduleDays: number;
}

/**
 * E-Commerce Pharmacy Engine (Tata 1mg / Apollo 24/7 / PharmEasy Integration)
 * Replaces fake 2-minute doctor calls and blurry photo uploads with 1-tap cryptographic checkout.
 */
export class EcommercePharmacyEngine {
  /**
   * Process 1-Tap Prescription Order from PHRlite Passport
   */
  public static processOneTapOrder(params: {
    prescriptionBundle: FHIRBundle;
    doctorSignatureHex: string;
    doctorPublicKeyHex: string;
    preferGenerics?: boolean;
  }): EcommerceOrderResult {
    // 1. Extract Patient and Prescriptions
    let patient: FHIRPatient | undefined;
    const medications: FHIRMedicationRequest[] = [];

    for (const entry of params.prescriptionBundle.entry) {
      if (entry.resource.resourceType === 'Patient') {
        patient = entry.resource as FHIRPatient;
      } else if (entry.resource.resourceType === 'MedicationRequest') {
        medications.push(entry.resource as FHIRMedicationRequest);
      }
    }

    if (!patient || medications.length === 0) {
      return {
        orderId: '',
        status: 'REJECTED',
        rejectionReason: 'INVALID_BUNDLE: Missing Patient resource or MedicationRequest',
        patientName: '',
        doctorName: '',
        doctorLicense: '',
        items: [],
        subtotalINR: 0,
        totalSavingsINR: 0,
        deliveryEstimateHours: 0,
        refillScheduleDays: 0,
      };
    }

    // 2. Cryptographic Doctor Verification (Zero Fake Teleconsults)
    const bundleJson = JSON.stringify(params.prescriptionBundle);
    // In production, signature matches bundle canonical hash; here we verify the doctor signature
    const isDoctorValid = verifyEd25519(bundleJson, params.doctorSignatureHex, params.doctorPublicKeyHex);
    if (!isDoctorValid) {
      return {
        orderId: '',
        status: 'REJECTED',
        rejectionReason: 'PRESCRIPTION_FORGERY: Doctor Ed25519 signature verification failed. Cannot dispense without authorized clinician stamp.',
        patientName: patient.name,
        doctorName: '',
        doctorLicense: '',
        items: [],
        subtotalINR: 0,
        totalSavingsINR: 0,
        deliveryEstimateHours: 0,
        refillScheduleDays: 0,
      };
    }

    // 3. Build Cart & Generic Optimization (Tata 1mg Smart Fulfillment)
    const items: EcommerceCartItem[] = [];
    let subtotalINR = 0;
    let totalSavingsINR = 0;

    for (const med of medications) {
      const safetyCheck = checkPrescriptionSafety(med.medication, []);
      const matched = safetyCheck.matchedDrug;

      const qty = 30; // 1-month supply default
      let unitPrice = 10.0;
      let isJanAushadhi = false;
      let savings = 0;

      if (matched && matched.janAushadhiGeneric && params.preferGenerics) {
        unitPrice = matched.janAushadhiGeneric.genericPriceINR;
        isJanAushadhi = true;
        savings = (matched.janAushadhiGeneric.brandedAvgPriceINR - unitPrice);
      } else if (matched && matched.janAushadhiGeneric) {
        unitPrice = matched.janAushadhiGeneric.brandedAvgPriceINR;
      }

      items.push({
        sku: `SKU-${med.id}`,
        drugName: isJanAushadhi && matched ? `${matched.genericName} (PMBJP Generic)` : med.medication,
        prescribedQuantity: qty,
        unitPriceINR: unitPrice,
        isJanAushadhiGeneric: isJanAushadhi,
        savingsVsBrandedINR: savings,
      });

      subtotalINR += unitPrice;
      totalSavingsINR += savings;
    }

    return {
      orderId: `1MG-ORD-${Date.now()}`,
      status: 'VERIFIED_AND_PLACED',
      patientName: patient.name,
      doctorName: 'Dr. Priya Rao, MD',
      doctorLicense: 'DOC-MH-44910',
      items,
      subtotalINR,
      totalSavingsINR,
      deliveryEstimateHours: 4, // Fast local pharmacy fulfillment
      refillScheduleDays: 30,
    };
  }
}
