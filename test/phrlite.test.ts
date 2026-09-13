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

// 9. Test Visa / Mastercard / UPI Grade Encounter Cryptogram & Anti-Replay
console.log('9. Testing Visa/Mastercard/UPI Grade Dynamic Encounter Cryptograms...');
import { 
  mintEncounterCryptogram, 
  verifyEncounterCryptogram, 
  createInsuranceCoverage,
  verifyInsuranceCoverage,
  ProviderTerminalEngine,
  checkPrescriptionSafety,
  EmrInteroperabilityBridge
} from '../src/index.ts';

const insurance = createInsuranceCoverage({
  policyNumber: 'STAR-HEALTH-2026-9921',
  patientId: 'PATIENT-JOHN-DOE',
  insurerName: 'Star Health & Allied Insurance',
  insurerCode: 'STAR-IND-01',
  policyType: 'Family Health Optima',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  preAuthToken: 'PREAUTH-CASHLESS-APPROVED-778',
});

const covCheck = verifyInsuranceCoverage(insurance);
assert.strictEqual(covCheck.valid, true);
assert.strictEqual(covCheck.cashlessEligible, true);
console.log(`   ✅ Instant insurance eligibility verified: ${covCheck.insurer} (${covCheck.policyNumber})`);

const cryptogram = mintEncounterCryptogram({
  passportId: 'passport-adult-001',
  patientId: 'PATIENT-JOHN-DOE',
  patientPrivateKeyHex: patientKeys.privateKeyHex,
  patientPublicKeyHex: patientKeys.publicKeyHex,
  purpose: 'OPD_CONSULT',
  coverage: insurance,
  scope: 'SUMMARY_ONLY',
});

// Normal verification
const validation = verifyEncounterCryptogram(cryptogram);
assert.strictEqual(validation.valid, true, 'Cryptogram should be valid');

// Anti-Replay Defense: Re-submitting the exact same cryptogram MUST be rejected (like EMV / UPI)
const replayValidation = verifyEncounterCryptogram(cryptogram);
assert.strictEqual(replayValidation.valid, false, 'Replayed cryptogram must be rejected');
assert.ok(replayValidation.reason?.includes('REPLAY_ATTACK_DETECTED'), 'Must flag replay attack');

// Forgery Defense: Modifying patientId without re-signing MUST fail signature verification
const forgedCryptogram = {
  ...mintEncounterCryptogram({
    passportId: 'passport-adult-001',
    patientId: 'PATIENT-JOHN-DOE',
    patientPrivateKeyHex: patientKeys.privateKeyHex,
    patientPublicKeyHex: patientKeys.publicKeyHex,
  }),
  patientId: 'PATIENT-ATTACKER-EVIL', // Maliciously tampered field
};
const forgedValidation = verifyEncounterCryptogram(forgedCryptogram);
assert.strictEqual(forgedValidation.valid, false, 'Tampered cryptogram must fail signature verification');
console.log('   ✅ Cryptogram verified: Anti-replay defense and tamper-resistance passed.\n');

// 10. Test Provider Terminal Check-In & 1-Page Summary Synthesis
console.log('10. Testing Provider Terminal Check-In (Zero Receptionist Paperwork)...');
const providerTerminal = new ProviderTerminalEngine();
const freshCryptogram = mintEncounterCryptogram({
  passportId: 'passport-adult-001',
  patientId: 'PATIENT-JOHN-DOE',
  patientPrivateKeyHex: patientKeys.privateKeyHex,
  patientPublicKeyHex: patientKeys.publicKeyHex,
  purpose: 'OPD_CONSULT',
  coverage: insurance,
});

const checkInResult = providerTerminal.checkInPatient(freshCryptogram, adultPassport);
assert.strictEqual(checkInResult.success, true);
assert.ok(checkInResult.session);
assert.strictEqual(checkInResult.session.patient.name, 'John Doe');
assert.ok(checkInResult.insuranceNotice?.includes('Star Health'));
console.log(`   ✅ 1-Tap check-in succeeded: ${checkInResult.insuranceNotice}`);

// 11. Test Open Drug Formulary Safety Checks & Reciprocal Stamping
console.log('11. Testing Indian Drug Library (NLEM & PMBJP) & Doctor Reciprocal Stamping...');
// Patient has Penicillin allergy (from test 2)
const allergyCheck = checkPrescriptionSafety('Amoxicillin + Clavulanic Acid', ['Penicillin']);
assert.strictEqual(allergyCheck.isSafe, false, 'Amoxicillin should be flagged for Penicillin allergy');
assert.ok(allergyCheck.warnings[0].includes('CRITICAL SAFETY ALERT'));
console.log(`   ✅ NFI Safety Alert triggered: ${allergyCheck.warnings[0]}`);

// Doctor switches to safe non-penicillin alternative (Salbutamol inhaler)
const safeCheck = checkPrescriptionSafety('Salbutamol Inhaler', ['Penicillin']);
assert.strictEqual(safeCheck.isSafe, true, 'Salbutamol should be safe for Penicillin allergy');
assert.ok(safeCheck.genericSavingsNotice?.includes('PMBJP Jan Aushadhi'));
console.log(`   ✅ Generic optimization: ${safeCheck.genericSavingsNotice}`);

// Doctor seals encounter (Free vs Premium tier)
const sealResult = providerTerminal.sealEncounter({
  sessionId: checkInResult.session.sessionId,
  doctorIdentity: {
    id: 'DOC-MH-44910',
    name: 'Dr. Priya Rao, MD',
    role: 'PROVIDER',
    institution: 'Apollo City Hospital',
    publicKeyHex: doctorKeys.publicKeyHex,
  },
  doctorPrivateKeyHex: doctorKeys.privateKeyHex,
  gitEngine: adultPassport,
  diagnoses: ['Acute Bronchospasm', 'Type 2 Diabetes Review'],
  medications: [
    { drug: 'Salbutamol Inhaler 100mcg', dosage: '2 puffs as needed' }
  ],
  clinicalAdvice: 'Avoid exposure to dust. Use inhaler before exercise. Review in 2 weeks.',
  tier: 'PREMIUM',
  premiumAttachments: [
    {
      type: 'image/dicom',
      title: 'Chest X-Ray Digital Tomography',
      sizeBytes: 1450020,
      urlOrPayload: 'data:application/dicom;base64,...'
    }
  ]
});

assert.strictEqual(sealResult.success, true);
assert.ok(sealResult.receipt);
assert.strictEqual(sealResult.receipt.tier, 'PREMIUM');
assert.strictEqual(sealResult.receipt.attachments?.length, 1);

// Verify passport blockchain ledger has new commit
const updatedChain = adultPassport.verifyChain();
assert.strictEqual(updatedChain.valid, true);
console.log(`   ✅ Doctor sealed encounter and stamped reciprocal receipt (Lifetime Commits: ${updatedChain.commitCount})\n`);

// 12. Test Universal EMR Interoperability Bridge (Breaking Hospital Silos)
console.log('12. Testing Universal EMR Interoperability Bridge (NRCeS FHIR R4)...');
const legacyHospitalPayload = {
  hospitalName: 'Fortis Memorial Research Institute',
  patientName: 'John Doe',
  patientDob: '1985-04-12',
  gender: 'male',
  visitDate: '2026-09-01',
  diagnoses: ['Essential Hypertension'],
  prescriptions: [{ drug: 'Telmisartan 40mg', dosage: '1 tablet once daily in morning' }],
  labResults: [{ testName: 'Serum Creatinine', value: 0.9, unit: 'mg/dL' }],
  insurancePolicyNumber: 'STAR-HEALTH-2026-9921',
  insurerName: 'Star Health & Allied Insurance',
};

const importedFhirBundle = EmrInteroperabilityBridge.importLegacyHospitalFeed(legacyHospitalPayload);
assert.strictEqual(importedFhirBundle.resourceType, 'Bundle');
assert.strictEqual(importedFhirBundle.entry.length, 6); // Patient, Encounter, Condition, Med, Observation, Coverage
console.log(`   ✅ Legacy hospital EMR feed imported into standard NRCeS FHIR R4 (${importedFhirBundle.entry.length} entries)`);

const exportedPrescription = EmrInteroperabilityBridge.exportPrescriptionRecord({
  bundleId: 'presc-9901',
  patient: checkInResult.session.patient,
  medications: sealResult.receipt.prescriptions,
  prescribedBy: 'Dr. Priya Rao',
  doctorLicense: 'DOC-MH-44910',
});
assert.strictEqual(exportedPrescription.resourceType, 'Bundle');
console.log('   ✅ PrescriptionRecord successfully generated for Pharmacy POS billing.\n');

// 13. Test Patient-Friendly Digital Drug Leaflet (Premium Feature)
console.log('13. Testing Patient-Friendly Digital Drug Leaflet (Microscopic Booklet Unfolded)...');
import { 
  generatePatientFriendlyLeaflet,
  EcommercePharmacyEngine,
  PayerClaimsEngine,
  HipaaHl7ComplianceEngine
} from '../src/index.ts';

const leaflet = generatePatientFriendlyLeaflet('Salbutamol Inhaler', '2 puffs as needed for breathlessness');
assert.ok(leaflet.purposeInPlainLanguage.includes('Relaxes the muscles'));
assert.ok(leaflet.howAndWhenToTake.includes('Inhale deeply'));
assert.ok(leaflet.sideEffects.commonAndManageable.length > 0);
assert.ok(leaflet.sideEffects.callDoctorImmediately.length > 0);
assert.ok(leaflet.genericCostSavings);
console.log(`   ✅ Leaflet Generated: ${leaflet.genericName}`);
console.log(`   ✅ Purpose in plain English: "${leaflet.purposeInPlainLanguage}"`);
console.log(`   ✅ Generic Monthly Savings: ₹${leaflet.genericCostSavings?.monthlySavingsINR} via PMBJP Jan Aushadhi\n`);

// 14. Test E-Commerce 1-Tap Pharmacy Order (Tata 1mg / Apollo 24/7 Flow)
console.log('14. Testing E-Commerce Pharmacy 1-Tap Checkout (Tata 1mg Integration)...');
const rxJson = JSON.stringify(exportedPrescription);
const doctorRxSig = signEd25519(rxJson, doctorKeys.privateKeyHex);

const orderResult = EcommercePharmacyEngine.processOneTapOrder({
  prescriptionBundle: exportedPrescription,
  doctorSignatureHex: doctorRxSig,
  doctorPublicKeyHex: doctorKeys.publicKeyHex,
  preferGenerics: true,
});

assert.strictEqual(orderResult.status, 'VERIFIED_AND_PLACED');
assert.ok(orderResult.items.length > 0);
assert.ok(orderResult.deliveryEstimateHours <= 4);
console.log(`   ✅ E-Commerce Order Placed: ${orderResult.orderId} for ${orderResult.patientName}`);
console.log(`   ✅ Verified Doctor: ${orderResult.doctorName} (License: ${orderResult.doctorLicense})`);
console.log(`   ✅ Smart Generic Substitution: Saved ₹${orderResult.totalSavingsINR} (Delivery in ${orderResult.deliveryEstimateHours} hrs)\n`);

// 15. Test Payer Claims Adjudication (Zero Fraud, Instant Cashless Settlement)
console.log('15. Testing Payer Claims Adjudication (Fraud-Proof Settlement in Seconds)...');
const claimResult = PayerClaimsEngine.adjudicateClaim({
  receipt: sealResult.receipt,
  coverage: insurance,
  claimedAmountINR: 25000,
  doctorPublicKeyHex: doctorKeys.publicKeyHex,
});

assert.strictEqual(claimResult.status, 'SETTLED_CASHLESS');
assert.strictEqual(claimResult.fraudRiskScore, 0); // 0 Fraud Risk
assert.strictEqual(claimResult.auditProof.doctorSignatureValid, true);
assert.strictEqual(claimResult.auditProof.merkleCommitValid, true);
assert.ok(claimResult.settledAmountINR > 0);
console.log(`   ✅ Claim Settled: ${claimResult.claimId} (Settled: ₹${claimResult.settledAmountINR}) in ${claimResult.adjudicationDurationMs}ms`);
console.log(`   ✅ Fraud Risk Score: ${claimResult.fraudRiskScore} (Zero Fraud: Cryptographically Proven)\n`);

// 16. Test HIPAA Technical Safeguards & HL7 FHIR Conformance
console.log('16. Testing HIPAA Technical Safeguards & HL7 FHIR Conformance Audit...');
const hipaaReport = HipaaHl7ComplianceEngine.auditHipaaSafeguards(adultPassport);
assert.strictEqual(hipaaReport.overallStatus, 'FULLY_COMPLIANT');
assert.strictEqual(hipaaReport.safeguardChecks.length, 6);
for (const check of hipaaReport.safeguardChecks) {
  assert.strictEqual(check.status, 'COMPLIANT');
}
console.log(`   ✅ HIPAA Audit: ${hipaaReport.overallStatus} across 6 mandatory 45 CFR § 164.312 safeguards.`);

const fhirAudit = HipaaHl7ComplianceEngine.validateFhirBundle(sealResult.receipt.bundle);
assert.strictEqual(fhirAudit.valid, true);
assert.ok(fhirAudit.resourceCount >= 4);
console.log(`   ✅ HL7 FHIR R4 Audit: Validated ${fhirAudit.resourceCount} resources (${fhirAudit.validatedResourceTypes.join(', ')})\n`);

console.log('🎉 ALL 16 TEST SUITES PASSED! PHRlite is fully operational, secure, interoperable, and compliant.\n');


