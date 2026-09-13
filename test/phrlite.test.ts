import assert from 'node:assert';
import { 
  generateEd25519KeyPair, 
  signEd25519, 
  verifyEd25519,
  encryptZeroKnowledge,
  decryptZeroKnowledge,
  GitHealthPassport,
  IntakeChatbot,
  BackOfficeIngestionPipeline,
  SKIDSSchoolScreeningProvider,
  HealthConnectAdapter,
  TimelineSynthesizer,
  ClinicalCopilot,
  CloudflareZeroKnowledgeRelay
} from '../src/index.ts';

console.log('🧪 Starting PHRlite Test Suite...\n');

// 1. Test Cryptography (Ed25519 & Zero-Knowledge AES-GCM)
console.log('1. Testing Ed25519 Cryptography & Zero-Knowledge Encryption...');
const patientKeys = generateEd25519KeyPair();
const doctorKeys = generateEd25519KeyPair();
const skidsKeys = generateEd25519KeyPair();

const testMsg = 'Encounter commit payload 2026-09-13';
const sig = signEd25519(testMsg, doctorKeys.privateKeyHex);
assert.strictEqual(verifyEd25519(testMsg, sig, doctorKeys.publicKeyHex), true, 'Valid signature must verify');
assert.strictEqual(verifyEd25519(testMsg, sig, patientKeys.publicKeyHex), false, 'Wrong public key must fail');

const secretData = 'Confidential clinical history: Patient has penicillin allergy';
const enc = encryptZeroKnowledge(secretData, patientKeys.privateKeyHex);
const dec = decryptZeroKnowledge(enc.ciphertextHex, enc.ivHex, enc.authTagHex, patientKeys.privateKeyHex);
assert.strictEqual(dec, secretData, 'Zero-knowledge encryption/decryption roundtrip must match');
console.log('   ✅ Crypto tests passed.\n');

// 2. Test Adult Onboarding (Intake Chatbot)
console.log('2. Testing Adult Intake Chatbot to FHIR Translation...');
const adultPassport = GitHealthPassport.init(
  'passport-adult-001',
  'PATIENT-JOHN-DOE',
  patientKeys.publicKeyHex
);

const intakeBundle = IntakeChatbot.processIntake({
  patientName: 'John Doe',
  birthDate: '1985-04-12',
  gender: 'male',
  bloodType: 'O+',
  chronicConditions: [
    { name: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', onsetYear: '2018' },
    { name: 'Primary Hypertension', icd10: 'I10', onsetYear: '2020' }
  ],
  currentMedications: [
    { drug: 'Metformin', dose: '500mg twice daily' },
    { drug: 'Amlodipine', dose: '5mg once daily' }
  ],
  allergies: [
    { substance: 'Penicillin', reaction: 'Anaphylaxis and urticaria', criticality: 'high' }
  ]
});

adultPassport.appendCommit({
  author: {
    id: 'john-doe-self',
    name: 'John Doe',
    role: 'PATIENT',
    publicKeyHex: patientKeys.publicKeyHex
  },
  authorPrivateKeyHex: patientKeys.privateKeyHex,
  commitType: 'GENESIS',
  summaryText: 'Genesis Profile from Conversational Intake Chatbot',
  bundle: intakeBundle
});

const chainStatus1 = adultPassport.verifyChain();
assert.strictEqual(chainStatus1.valid, true);
assert.strictEqual(chainStatus1.commitCount, 1);
console.log('   ✅ Adult intake chatbot passed.\n');

// 3. Test Back-Office Ingestion Pipeline
console.log('3. Testing Back-Office Legacy Document Ingestion...');
const reviewerKeys = generateEd25519KeyPair();
BackOfficeIngestionPipeline.commitLegacyRecord({
  passport: adultPassport,
  reviewer: {
    id: 'REV-9921',
    name: 'Sarah Jenkins, RN',
    role: 'INGESTION_SPECIALIST',
    institution: 'HealthVault Back-Office Services',
    publicKeyHex: reviewerKeys.publicKeyHex
  },
  reviewerPrivateKeyHex: reviewerKeys.privateKeyHex,
  extraction: {
    documentTitle: 'Discharge Summary 2022',
    sourceFacility: 'St. Jude Community Hospital',
    encounterDate: '2022-08-15',
    diagnoses: [{ name: 'Acute Bronchitis', icd10: 'J20.9' }],
    medications: [{ drug: 'Azithromycin', dosage: '250mg 5-day pack' }],
    labValues: [
      { test: 'HbA1c', loinc: '4548-4', value: 6.9, unit: '%' }
    ]
  }
});

const chainStatus2 = adultPassport.verifyChain();
assert.strictEqual(chainStatus2.valid, true);
assert.strictEqual(chainStatus2.commitCount, 2);
console.log('   ✅ Back-office legacy ingestion passed.\n');

// 4. Test Google Health Connect Wearable Adapter
console.log('4. Testing Google Health Connect Wearable Integration...');
HealthConnectAdapter.squashTelemetryToCommit({
  passport: adultPassport,
  patientAuthor: {
    id: 'john-doe-self',
    name: 'John Doe',
    role: 'PATIENT',
    publicKeyHex: patientKeys.publicKeyHex
  },
  patientPrivateKeyHex: patientKeys.privateKeyHex,
  telemetry: {
    samplePeriodStart: '2026-09-01T00:00:00Z',
    samplePeriodEnd: '2026-09-07T23:59:59Z',
    restingHeartRateAvgBpm: 68,
    minHeartRateBpm: 52,
    maxHeartRateBpm: 142,
    averageOxygenSaturationSpO2: 98,
    dailyStepAverage: 8450,
    sleepHoursAverage: 7.2,
    bloodPressureSystolic: 124,
    bloodPressureDiastolic: 82
  }
});

const chainStatus3 = adultPassport.verifyChain();
assert.strictEqual(chainStatus3.valid, true);
assert.strictEqual(chainStatus3.commitCount, 3);
console.log('   ✅ Wearable Health Connect telemetry squashed & committed.\n');

// 5. Test Doctor Copilot Timeline Synthesis & 1-Page Mental Model
console.log('5. Testing Doctor Copilot 1-Page Mental Model Synthesis...');
const mentalModel = TimelineSynthesizer.generateMentalModel(adultPassport);
assert.strictEqual(mentalModel.patientHeader.patientName, 'John Doe');
assert.strictEqual(mentalModel.criticalAlerts.allergies.length, 1);
assert.strictEqual(mentalModel.criticalAlerts.allergies[0].substance, 'Penicillin');
assert.strictEqual(mentalModel.activeProblems.length, 3); // Diabetes, Hypertension, Bronchitis
assert.strictEqual(mentalModel.currentMedications.length, 3); // Metformin, Amlodipine, Azithromycin
assert.strictEqual(mentalModel.recentVitals['Resting Heart Rate (7-day average)'].value, 68);
console.log('   ✅ 1-Page mental model synthesized successfully.\n');

// 6. Test Clinical Copilot Drug-Allergy Safety Guardrail & Note Committing
console.log('6. Testing Clinical Copilot Drug-Allergy Safety & SOAP Note Committing...');
// Intentionally propose a penicillin derivative to trigger the allergy check
const proposedRx = [
  { drug: 'Amoxicillin (Penicillin class)', dosage: '500mg TID' },
  { drug: 'Glipizide', dosage: '5mg daily' }
];

const allergyWarnings = ClinicalCopilot.checkDrugAllergies(adultPassport, proposedRx);
assert.strictEqual(allergyWarnings.length, 1, 'Should catch penicillin allergy');
assert.strictEqual(allergyWarnings[0].allergen, 'Penicillin');

// Now doctor prescribes safe alternative
const safeConsultResult = ClinicalCopilot.draftAndCommitEncounter({
  passport: adultPassport,
  doctor: {
    id: 'DR-NPI-481920',
    name: 'Emily Watson, MD',
    role: 'PROVIDER',
    institution: 'City Cardiology & Internal Medicine',
    publicKeyHex: doctorKeys.publicKeyHex
  },
  doctorPrivateKeyHex: doctorKeys.privateKeyHex,
  note: {
    subjective: 'Patient reports well-managed blood sugars, mild fatigue.',
    objective: 'BP 122/80, RHR 68 bpm (verified via Health Connect log), lungs clear.',
    assessment: 'Type 2 Diabetes Mellitus - well controlled on current regimen.',
    plan: 'Continue Metformin. Recheck HbA1c in 3 months. Advised daily walking.',
    prescriptionsToAdd: [
      { drug: 'Glipizide', dosage: '5mg once daily' }
    ]
  }
});

assert.strictEqual(safeConsultResult.allergyWarnings.length, 0);
const chainStatus4 = adultPassport.verifyChain();
assert.strictEqual(chainStatus4.valid, true);
assert.strictEqual(chainStatus4.commitCount, 4);
console.log('   ✅ Clinical Copilot encounter committed and signed.\n');

// 7. Test School Health Screening by SKIDS Provider
console.log('7. Testing Pediatric School Screening Provider (SKIDS)...');
const skidsProvider = new SKIDSSchoolScreeningProvider(
  {
    id: 'SKIDS-CLINIC-01',
    name: 'Dr. Anita Roy (Lead Pediatrician)',
    role: 'SCREENING_AUTHORITY_SKIDS',
    institution: 'SKIDS Child Health & School Wellness',
    publicKeyHex: skidsKeys.publicKeyHex
  },
  skidsKeys.privateKeyHex
);

const { passport: childPassport, parentClaimPayload } = skidsProvider.conductScreening({
  studentName: 'Aarav Sharma',
  studentId: 'SKIDS-STU-4401',
  birthDate: '2016-06-20',
  gender: 'male',
  schoolName: 'Greenwood High School',
  gradeSection: 'Grade 4-B',
  heightCm: 138,
  weightKg: 32.5,
  visionLeft: '6/6',
  visionRight: '6/6',
  dentalCariesCount: 0,
  hearingStatus: 'Normal',
  generalHealthSummary: 'Excellent developmental milestones. Normal vision and dental.'
});

const childChain = childPassport.verifyChain();
assert.strictEqual(childChain.valid, true);
assert.strictEqual(childChain.commitCount, 1);
assert.ok(parentClaimPayload.claimUrl.includes('https://passport.skids.health/claim'));
console.log(`   ✅ SKIDS screening created child passport: ${parentClaimPayload.studentName} @ ${parentClaimPayload.schoolName}\n`);

// 8. Test Zero-Knowledge Cloudflare R2 Relay with Turnstile
console.log('8. Testing Zero-Knowledge Cloudflare R2 Sync Relay...');
const relay = new CloudflareZeroKnowledgeRelay();
const rawExport = JSON.stringify(adultPassport.db.getAllCommits());

const cloudVault = relay.uploadEncryptedVault(
  'passport-adult-001',
  rawExport,
  patientKeys.privateKeyHex,
  'turnstile-valid-token-xyz'
);

assert.ok(cloudVault.blobSizeBytes > 0);
const decryptedPayload = relay.downloadAndDecryptVault(
  'passport-adult-001',
  patientKeys.privateKeyHex
);
assert.strictEqual(decryptedPayload, rawExport, 'Decrypted payload from cloud must equal raw export');
console.log(`   ✅ Zero-knowledge vault synced to Cloudflare R2 (${cloudVault.blobSizeBytes} bytes)\n`);

console.log('🎉 ALL TESTS PASSED! PHRlite is fully operational and verified.\n');
