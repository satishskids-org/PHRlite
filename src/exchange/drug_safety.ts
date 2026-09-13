/**
 * Indian National Formulary & Open-Source Drug Intelligence
 * Integrates:
 * 1. NLEM (National List of Essential Medicines - MoHFW India)
 * 2. PMBJP (Pradhan Mantri Bhartiya Janaushadhi Pariyojana Generic Drug Master)
 * 3. NFI (National Formulary of India) allergy and contraindication matrix
 */

export interface DrugRecord {
  code: string;           // Standard generic drug code (NRCeS / SNOMED CT)
  genericName: string;    // International Nonproprietary Name (INN) / Indian Pharmacopoeia
  brandName?: string;     // Common commercial brand in India
  category: string;
  isNLEM: boolean;        // In National List of Essential Medicines
  janAushadhiGeneric?: {
    code: string;
    genericPriceINR: number;
    brandedAvgPriceINR: number;
    savingsPercent: number;
  };
  contraindications: string[]; // e.g. ["Sulfa Allergy", "Renal Impairment", "Pregnancy"]
  standardDose: string;
}

// Open-source curated sample of Indian National Formulary & Jan Aushadhi
export const INDIAN_OPEN_DRUG_LIBRARY: Record<string, DrugRecord> = {
  'SALBUTAMOL_100MCG': {
    code: 'IN-NLEM-041',
    genericName: 'Salbutamol Inhaler 100mcg',
    brandName: 'Asthalin Inhaler',
    category: 'Respiratory / Bronchodilator',
    isNLEM: true,
    janAushadhiGeneric: {
      code: 'PMBJP-00214',
      genericPriceINR: 55.00,
      brandedAvgPriceINR: 175.00,
      savingsPercent: 68,
    },
    contraindications: ['Severe Cardiac Arrhythmia'],
    standardDose: '1-2 puffs as needed for acute wheeze',
  },
  'AMOXICILLIN_CLAV_625': {
    code: 'IN-NLEM-012',
    genericName: 'Amoxicillin + Clavulanic Acid 625mg',
    brandName: 'Augmentin 625 Duo',
    category: 'Anti-infective / Penicillin',
    isNLEM: true,
    janAushadhiGeneric: {
      code: 'PMBJP-00108',
      genericPriceINR: 70.00,
      brandedAvgPriceINR: 230.00,
      savingsPercent: 70,
    },
    contraindications: ['Penicillin Allergy', 'Hepatic Dysfunction'],
    standardDose: '1 tablet twice daily for 5-7 days after meals',
  },
  'METFORMIN_500': {
    code: 'IN-NLEM-089',
    genericName: 'Metformin Hydrochloride 500mg',
    brandName: 'Glycomet 500',
    category: 'Endocrine / Oral Antidiabetic',
    isNLEM: true,
    janAushadhiGeneric: {
      code: 'PMBJP-00431',
      genericPriceINR: 12.00,
      brandedAvgPriceINR: 48.00,
      savingsPercent: 75,
    },
    contraindications: ['Severe Renal Impairment (eGFR < 30)', 'Metabolic Acidosis'],
    standardDose: '1 tablet daily with dinner',
  },
  'COTRIMOXAZOLE_SS': {
    code: 'IN-NLEM-018',
    genericName: 'Trimethoprim + Sulfamethoxazole (Cotrimoxazole) 480mg',
    brandName: 'Bactrim / Septran',
    category: 'Anti-infective / Sulfonamide',
    isNLEM: true,
    janAushadhiGeneric: {
      code: 'PMBJP-00045',
      genericPriceINR: 8.00,
      brandedAvgPriceINR: 28.00,
      savingsPercent: 71,
    },
    contraindications: ['Sulfa Drugs', 'G6PD Deficiency', 'Severe Hepatic Damage'],
    standardDose: '1 tablet twice daily with food',
  },
  'PARACETAMOL_500': {
    code: 'IN-NLEM-002',
    genericName: 'Paracetamol 500mg',
    brandName: 'Crocin / Dolo 500',
    category: 'Analgesic / Antipyretic',
    isNLEM: true,
    janAushadhiGeneric: {
      code: 'PMBJP-00001',
      genericPriceINR: 7.50,
      brandedAvgPriceINR: 32.00,
      savingsPercent: 77,
    },
    contraindications: ['Severe Active Liver Disease'],
    standardDose: '1 tablet every 6 hours as needed for fever/pain (Max 4g/day)',
  },
  'ATORVASTATIN_10': {
    code: 'IN-NLEM-114',
    genericName: 'Atorvastatin 10mg',
    brandName: 'Atorva 10 / Lipitor',
    category: 'Cardiovascular / Statin',
    isNLEM: true,
    janAushadhiGeneric: {
      code: 'PMBJP-00512',
      genericPriceINR: 18.00,
      brandedAvgPriceINR: 110.00,
      savingsPercent: 83,
    },
    contraindications: ['Active Liver Disease', 'Pregnancy'],
    standardDose: '1 tablet at bedtime',
  }
};

export interface SafetyCheckResult {
  isSafe: boolean;
  warnings: string[];
  genericSavingsNotice?: string;
  matchedDrug?: DrugRecord;
}

/**
 * Validates prescribed drug against known patient allergies and suggests open generic alternatives
 */
export function checkPrescriptionSafety(
  drugNameOrKey: string,
  patientAllergies: string[]
): SafetyCheckResult {
  const warnings: string[] = [];
  
  // Find matching drug record
  const searchKey = drugNameOrKey.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  let matched: DrugRecord | undefined = undefined;

  for (const [key, record] of Object.entries(INDIAN_OPEN_DRUG_LIBRARY)) {
    if (
      key.includes(searchKey) || 
      record.genericName.toUpperCase().includes(drugNameOrKey.toUpperCase()) ||
      (record.brandName && record.brandName.toUpperCase().includes(drugNameOrKey.toUpperCase()))
    ) {
      matched = record;
      break;
    }
  }

  if (matched) {
    // Check contraindications / allergies
    for (const allergy of patientAllergies) {
      const normAllergy = allergy.toLowerCase();
      for (const contra of matched.contraindications) {
        if (contra.toLowerCase().includes(normAllergy) || normAllergy.includes(contra.toLowerCase())) {
          warnings.push(`🚨 CRITICAL SAFETY ALERT: Patient has known allergy to '${allergy}'. Drug '${matched.genericName}' is contraindicated (${contra}).`);
        }
      }
    }

    let genericSavingsNotice: string | undefined = undefined;
    if (matched.janAushadhiGeneric) {
      genericSavingsNotice = `💡 PMBJP Jan Aushadhi Generic available: ₹${matched.janAushadhiGeneric.genericPriceINR.toFixed(2)} vs ₹${matched.janAushadhiGeneric.brandedAvgPriceINR.toFixed(2)} (Save ${matched.janAushadhiGeneric.savingsPercent}%)`;
    }

    return {
      isSafe: warnings.length === 0,
      warnings,
      genericSavingsNotice,
      matchedDrug: matched,
    };
  }

  // Fallback for unlisted medication: basic keyword matching
  for (const allergy of patientAllergies) {
    if (drugNameOrKey.toLowerCase().includes(allergy.toLowerCase())) {
      warnings.push(`⚠️ WARNING: Drug name '${drugNameOrKey}' closely matches patient allergy '${allergy}'.`);
    }
  }

  return {
    isSafe: warnings.length === 0,
    warnings,
  };
}

export class DrugSafetyChecker {
  public static checkContraindication(drugName: string, patientAllergies: string[]): { safe: boolean; alertMessage?: string } {
    const res = checkPrescriptionSafety(drugName, patientAllergies);
    return {
      safe: res.isSafe,
      alertMessage: res.warnings[0]
    };
  }

  public static findJanAushadhiEquivalent(drugName: string) {
    const res = checkPrescriptionSafety(drugName, []);
    if (res.matchedDrug && res.matchedDrug.janAushadhiGeneric) {
      const g = res.matchedDrug.janAushadhiGeneric;
      return {
        available: true,
        genericEquivalent: {
          genericName: res.matchedDrug.genericName,
          janAushadhiPriceInr: g.genericPriceINR,
          brandedPriceInr: g.brandedAvgPriceINR,
          potentialSavingsInr: g.brandedAvgPriceINR - g.genericPriceINR,
          savingsPercent: g.savingsPercent
        }
      };
    }
    return { available: false };
  }

  public static lookupNlemCeilingPrice(drugName: string) {
    const res = checkPrescriptionSafety(drugName, []);
    if (res.matchedDrug && res.matchedDrug.isNLEM) {
      return {
        isControlled: true,
        ceilingPriceInr: res.matchedDrug.janAushadhiGeneric?.brandedAvgPriceINR || 50
      };
    }
    return { isControlled: false };
  }
}

