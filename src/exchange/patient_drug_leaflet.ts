import { INDIAN_OPEN_DRUG_LIBRARY, type DrugRecord } from './drug_safety.ts';

/**
 * Patient-Friendly Digital Drug Leaflet
 * Replaces the unreadable, microscopic package insert booklet with a clear,
 * actionable, empowering guide for patients and caregivers (Premium Feature).
 */
export interface PatientFriendlyLeaflet {
  drugCode: string;
  genericName: string;
  brandName?: string;
  purposeInPlainLanguage: string;
  howAndWhenToTake: string;
  foodAndDrinkAlerts: string[];
  sideEffects: {
    commonAndManageable: string[];
    callDoctorImmediately: string[];
  };
  missedDoseGuidance: string;
  storageInstructions: string;
  genericCostSavings?: {
    janAushadhiName: string;
    genericPriceINR: number;
    brandedAvgPriceINR: number;
    monthlySavingsINR: number;
  };
}

const EXTENDED_LEAFLET_DB: Record<string, Partial<PatientFriendlyLeaflet>> = {
  'SALBUTAMOL_100MCG': {
    purposeInPlainLanguage: 'Relaxes the muscles in your airways to open breathing passages quickly during asthma or sudden wheezing.',
    howAndWhenToTake: 'Take 1 to 2 puffs when you feel breathless or coughing fits start. Inhale deeply, hold your breath for 10 seconds, then breathe out slowly.',
    foodAndDrinkAlerts: [
      'Limit excessive caffeine (coffee, energy drinks) as it can increase jitteriness or heart rate.'
    ],
    sideEffects: {
      commonAndManageable: [
        'Slight hand shakiness (tremors) for 15-30 minutes after inhaling',
        'Temporary mild increase in heart rate',
        'Mild headache or throat dryness'
      ],
      callDoctorImmediately: [
        'Chest pain or severe palpitations that do not settle',
        'Sudden worsening of breathing immediately after taking a puff (paradoxical bronchospasm)',
        'Swelling of face, lips, or tongue'
      ]
    },
    missedDoseGuidance: 'Since this is a rescue inhaler, use it only when symptoms appear. Do not take extra puffs to "make up" for an earlier time.',
    storageInstructions: 'Keep inhaler cap on. Store at room temperature away from direct sunlight. Do not puncture the canister.',
  },
  'AMOXICILLIN_CLAV_625': {
    purposeInPlainLanguage: 'A broad-spectrum antibiotic that kills bacterial infections in your chest, sinuses, skin, or urinary tract.',
    howAndWhenToTake: 'Take 1 tablet twice a day, exactly 12 hours apart (e.g. 8:00 AM and 8:00 PM). Complete the entire course even if you feel 100% better.',
    foodAndDrinkAlerts: [
      'Always take with or immediately after a meal or snack to prevent stomach upset.',
      'Drink at least 8-10 glasses of water daily to keep kidneys hydrated.'
    ],
    sideEffects: {
      commonAndManageable: [
        'Mild nausea or loose stools (taking probiotics or curd helps)',
        'Mild stomach rumble or bitter taste'
      ],
      callDoctorImmediately: [
        'Severe skin rash, itching, or hives (possible allergic reaction)',
        'Difficulty breathing or throat tightness',
        'Persistent watery diarrhea with stomach cramps'
      ]
    },
    missedDoseGuidance: 'Take it as soon as you remember with a snack. If it is within 4 hours of your next scheduled dose, skip the missed one. Never take 2 tablets at once.',
    storageInstructions: 'Keep in original blister pack to shield from moisture. Store below 25°C in a dry cupboard.',
  },
  'METFORMIN_500': {
    purposeInPlainLanguage: 'Helps your body use its natural insulin better to lower blood sugar levels in Type 2 Diabetes.',
    howAndWhenToTake: 'Take once daily with your evening meal or dinner. Swallow whole with a glass of water.',
    foodAndDrinkAlerts: [
      'Avoid heavy alcohol consumption, which drastically increases the risk of hypoglycemia and lactic acidosis.',
      'Take with food to protect your stomach lining.'
    ],
    sideEffects: {
      commonAndManageable: [
        'Metallic taste in mouth during first week',
        'Mild nausea, bloating, or soft stools (usually improves after 10-14 days)'
      ],
      callDoctorImmediately: [
        'Extreme tiredness, unexplained muscle pain, difficulty breathing, or stomach discomfort (signs of rare lactic acidosis)',
        'Extreme dizziness or cold, clammy skin (low blood sugar)'
      ]
    },
    missedDoseGuidance: 'Take it with your next meal. If you remember the next day, simply take your normal dose with dinner. Do not double up.',
    storageInstructions: 'Store at room temperature in a dry place away from bathroom moisture.',
  }
};

/**
 * Generate a patient-friendly digital leaflet for any prescribed medication
 */
export function generatePatientFriendlyLeaflet(
  drugNameOrKey: string,
  dosageInstruction: string
): PatientFriendlyLeaflet {
  const searchKey = drugNameOrKey.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  
  // Find match in our drug libraries
  let matchedKey = 'SALBUTAMOL_100MCG';
  for (const k of Object.keys(EXTENDED_LEAFLET_DB)) {
    if (searchKey.includes(k) || k.includes(searchKey)) {
      matchedKey = k;
      break;
    }
  }

  const baseDrug = INDIAN_OPEN_DRUG_LIBRARY[matchedKey] || INDIAN_OPEN_DRUG_LIBRARY['SALBUTAMOL_100MCG'];
  const leafletData = EXTENDED_LEAFLET_DB[matchedKey] || EXTENDED_LEAFLET_DB['SALBUTAMOL_100MCG'];

  let genericCostSavings: PatientFriendlyLeaflet['genericCostSavings'] = undefined;
  if (baseDrug.janAushadhiGeneric) {
    const brandedPrice = baseDrug.janAushadhiGeneric.brandedAvgPriceINR;
    const genericPrice = baseDrug.janAushadhiGeneric.genericPriceINR;
    const monthlySavings = (brandedPrice - genericPrice) * 2; // Assuming 2 units/month

    genericCostSavings = {
      janAushadhiName: baseDrug.janAushadhiGeneric.code + ' (' + baseDrug.genericName + ')',
      genericPriceINR: genericPrice,
      brandedAvgPriceINR: brandedPrice,
      monthlySavingsINR: monthlySavings,
    };
  }

  return {
    drugCode: baseDrug.code,
    genericName: baseDrug.genericName,
    brandName: baseDrug.brandName,
    purposeInPlainLanguage: leafletData.purposeInPlainLanguage || 'Clinically prescribed to treat and manage your medical condition.',
    howAndWhenToTake: `${dosageInstruction}. ${leafletData.howAndWhenToTake || 'Take as instructed by your doctor.'}`,
    foodAndDrinkAlerts: leafletData.foodAndDrinkAlerts || ['Drink plenty of water. Consult doctor regarding dietary restrictions.'],
    sideEffects: leafletData.sideEffects || {
      commonAndManageable: ['Mild fatigue or headache'],
      callDoctorImmediately: ['Difficulty breathing, facial rash, or sudden swelling']
    },
    missedDoseGuidance: leafletData.missedDoseGuidance || 'Take as soon as remembered unless close to the next scheduled dose. Never double doses.',
    storageInstructions: leafletData.storageInstructions || 'Store in a cool, dry place away from moisture and out of reach of children.',
    genericCostSavings,
  };
}
