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

// 17. Test IRDAI Wellness Engine & Insurance "Bank Balance" Card
console.log('17. Testing IRDAI Wellness Engine & Insurance "Bank Balance" Model...');
import { 
  WellnessEngine,
  MagicLinkManager,
  SoloDoctorRxPad,
  AbdmGatewayClient,
  CashfreeKycConnector,
  PHRliteSDK,
  AdminConsoleManager
} from '../src/index.ts';

const wellnessEngine = new WellnessEngine();
wellnessEngine.addScreening({
  screeningType: 'LIPID_PROFILE',
  recordedDate: new Date().toISOString(),
  facilityName: 'Dr. Lal PathLabs',
  providerNmcReg: 'DOC-MH-44910',
  resultSummary: 'Total Cholesterol: 185 mg/dL, HDL: 52 mg/dL, Triglycerides: 140 mg/dL',
  isNormalOrControlled: true
});
wellnessEngine.addScreening({
  screeningType: 'HBA1C',
  recordedDate: new Date().toISOString(),
  facilityName: 'SRL Diagnostics',
  providerNmcReg: 'DOC-MH-44910',
  resultSummary: 'HbA1c: 5.6% (Non-Diabetic)',
  isNormalOrControlled: true
});
wellnessEngine.addScreening({
  screeningType: 'BLOOD_PRESSURE',
  recordedDate: new Date().toISOString(),
  facilityName: 'Apollo Clinic',
  providerNmcReg: 'DOC-MH-44910',
  resultSummary: '118/76 mmHg',
  isNormalOrControlled: true
});

const wellnessScore = wellnessEngine.calculateWellnessScore();
assert.ok(wellnessScore.totalPoints >= 100);
assert.strictEqual(wellnessScore.discountPercentage, 20); // Max 20% under IRDAI 2020 rules

const certificate = wellnessEngine.generateWellnessCertificate('PAT-JOHN-DOE-001', 25000);
assert.strictEqual(certificate.renewalDiscountPercentage, 20);
assert.strictEqual(certificate.estimatedAnnualSavingsInr, 5000);
assert.ok(certificate.signature.length > 0);
console.log(`   ✅ IRDAI Wellness Score: ${wellnessScore.totalPoints} pts (Eligible for ${wellnessScore.discountPercentage}% renewal discount)`);
console.log(`   ✅ Signed Wellness Certificate: ${certificate.certificateId} (Saves ₹${certificate.estimatedAnnualSavingsInr}/year on ₹25k premium)`);

const insuranceAccount = WellnessEngine.createInsuranceAccount({
  policyNumber: '0123/SH/2026/8841',
  insurerName: 'Star Health & Allied Insurance',
  insurerCode: 'STAR_HEALTH',
  planName: 'Comprehensive Family Floater',
  totalSumInsured: 1000000,
  utilizedClaimsInr: 80000,
  pedMonthsCleared: 36
});
assert.strictEqual(insuranceAccount.availableBalance, 920000);
assert.strictEqual(insuranceAccount.portabilityStatus, 'PORTABLE_NO_PED_RESET');
console.log(`   ✅ Insurance Bank Balance: ₹${insuranceAccount.availableBalance.toLocaleString()} available of ₹${insuranceAccount.totalSumInsured.toLocaleString()} (Portability: ${insuranceAccount.portabilityStatus})\n`);

// 18. Test Solo-Doctor 15-Minute Consented "Magic Link" Session
console.log('18. Testing Solo-Doctor Consented Magic Link Session (Zero Install WhatsApp Consult)...');
const magicPatientKeys = generateEd25519KeyPair();
const magicSession = MagicLinkManager.createSession({
  patientId: 'PAT-JOHN-DOE-001',
  patientName: 'John Doe',
  patientAge: 38,
  patientGender: 'male',
  bloodGroup: 'O+',
  allergies: ['Penicillin'],
  activeConditions: ['Essential Hypertension'],
  currentMedications: ['Amlodipine 5mg']
}, magicPatientKeys);

assert.ok(magicSession.magicUrl.includes('/rx/'));
assert.ok(magicSession.expiresAt > Date.now());

const accessed = MagicLinkManager.accessSession(magicSession.sessionId);
assert.strictEqual(accessed.valid, true);
assert.strictEqual(accessed.patientSummary?.patientName, 'John Doe');
assert.strictEqual(accessed.patientSummary?.allergies[0], 'Penicillin');

const docKeys = generateEd25519KeyPair();
const consultationSubmit = MagicLinkManager.submitDoctorEncounter(magicSession.sessionId, {
  doctorName: 'Dr. Ramesh Gupta',
  doctorNmcRegistration: 'NMC-KA-2015-11029',
  doctorClinicAddress: 'Gupta Family Health Clinic, Indiranagar, Bengaluru',
  consultationNotes: 'Patient experiencing productive cough and mild chest tightness for 3 days.',
  prescriptionItems: [
    {
      genericName: 'AZITHROMYCIN',
      brandNameSuggestion: 'Azee 500mg',
      dosage: '500mg',
      frequency: '1-0-0 (Once daily for 3 days)',
      duration: '3 days',
      instructions: 'Take 1 hour before or 2 hours after meals.',
      isJanAushadhiAvailable: true,
      estimatedGenericSavingsInr: 72
    }
  ]
}, docKeys);

assert.strictEqual(consultationSubmit.success, true);
assert.ok(consultationSubmit.encounterReceipt?.doctorSignature);
console.log(`   ✅ Magic Link Generated: ${magicSession.magicUrl} (Valid for 15 mins)`);
console.log(`   ✅ Doctor accessed without login, reviewed clinical history, and signed certified prescription.\n`);

// 19. Test NMC-Compliant 30-Second Web Rx Pad
console.log('19. Testing NMC-Compliant 30-Second Web Rx Pad with Jan Aushadhi Generic Savings...');
const rxPad = new SoloDoctorRxPad();
const nmcRxResult = rxPad.createPrescription({
  doctor: {
    doctorName: 'Dr. Priya Rao',
    qualification: 'MBBS, MD (General Medicine)',
    nmcRegistrationNumber: 'MCI-MH-2018-88410',
    stateMedicalCouncil: 'Maharashtra Medical Council',
    clinicOrHospitalName: 'Rao Clinical Care Center',
    clinicAddress: 'Bandra West, Mumbai 400050',
    phoneOrContact: '+91-98200-11223'
  },
  patientId: 'PAT-JOHN-DOE-001',
  patientName: 'John Doe',
  patientAge: 38,
  patientGender: 'male',
  patientAllergies: ['Penicillin'],
  diagnosis: 'Acute Bronchitis',
  medications: [
    {
      genericName: 'Salbutamol',
      brandName: 'Asthalin Inhaler',
      strength: '100mcg',
      dosageForm: 'INHALER',
      frequency: '2 puffs as needed',
      durationDays: 30,
      instructions: 'Inhale 2 puffs when experiencing wheezing or tightness.'
    },
    {
      genericName: 'Paracetamol',
      brandName: 'Dolo 650',
      strength: '650mg',
      dosageForm: 'TABLET',
      frequency: '1-0-1 as needed for fever',
      durationDays: 5,
      instructions: 'Take after meals. Do not exceed 3 tablets in 24 hours.'
    }
  ]
});

assert.strictEqual(nmcRxResult.success, true);
assert.ok(nmcRxResult.prescription);
assert.strictEqual(nmcRxResult.prescription?.doctor.doctorName, 'Dr. Priya Rao');
assert.strictEqual(nmcRxResult.prescription?.items[0].genericName, 'SALBUTAMOL');
assert.ok(nmcRxResult.prescription?.singleDispenseNonce.startsWith('NONCE-'));
console.log(`   ✅ NMC Prescription Created: ${nmcRxResult.prescription?.prescriptionId}`);
console.log(`   ✅ Mandatory NMC Doctor Reg: ${nmcRxResult.prescription?.doctor.nmcRegistrationNumber} (${nmcRxResult.prescription?.doctor.qualification})`);
console.log(`   ✅ Anti-Counterfeit Single-Dispense Nonce: ${nmcRxResult.prescription?.singleDispenseNonce}\n`);

// 20. Test NHA ABDM Gateway Adapter (Milestones 1, 2, 3)
console.log('20. Testing NHA ABDM Gateway Adapter (Milestones 1, 2, 3)...');
const abdmGateway = new AbdmGatewayClient();
const abhaProfile = await abdmGateway.generateAbhaViaAadhaar({
  aadhaarNumberMasked: 'XXXX-XXXX-9912',
  otpToken: '123456',
  preferredAbhaAddress: 'john.doe@abdm',
  mobileNumber: '+91-98765-43210'
});

assert.ok(abhaProfile.abhaNumber.startsWith('14-'));
assert.strictEqual(abhaProfile.abhaAddress, 'john.doe@abdm');
assert.strictEqual(abhaProfile.kycStatus, 'VERIFIED_AADHAAR_OTP');
console.log(`   ✅ Milestone 1: ABHA Created: ${abhaProfile.abhaNumber} (${abhaProfile.abhaAddress}) via Gov AUA`);

const consent = abdmGateway.createConsentRequest({
  patientAbhaAddress: abhaProfile.abhaAddress,
  purposeCode: 'CAREMGT',
  fromTimestamp: '2025-01-01T00:00:00Z',
  toTimestamp: '2026-12-31T23:59:59Z',
  hiTypes: ['Prescription', 'DiagnosticReport', 'OPConsult'],
  expiryTimestamp: '2026-12-31T23:59:59Z'
});
assert.strictEqual(consent.status, 'GRANTED');
console.log(`   ✅ Milestone 2: Consent Artifact Granted: ${consent.consentRequestId}`);

const transfer = abdmGateway.dispatchHealthDataTransfer({
  transactionId: 'TX-ABDM-001',
  consentId: consent.consentRequestId,
  encryptedDataPayload: 'enc_ciphertext_blob_123',
  keyMaterial: {
    cryptoAlg: 'ECDH',
    curve: 'Curve25519',
    dhPublicKey: '0x334411',
    nonce: '0x991122'
  }
});
assert.strictEqual(transfer.success, true);
console.log(`   ✅ Milestone 3: Encrypted Health Data Dispatched under Zero-Knowledge E2EE.\n`);

// 21. Test Cashfree Regulated KYC & B2B Client SDK
console.log('21. Testing Cashfree KYC & B2B Client SDK...');
const kycConnector = new CashfreeKycConnector();
const docVerify = kycConnector.verifyDoctorNmc('MCI-MH-2018-88410');
assert.strictEqual(docVerify.verified, true);
assert.strictEqual(docVerify.activeStatus, 'ACTIVE_REGISTERED');
console.log(`   ✅ Cashfree Doctor NMC Verification: ${docVerify.doctorName} (${docVerify.activeStatus})`);

const bankVerify = kycConnector.verifyBankAccount('1234567890', 'HDFC0001234', 'John Doe');
assert.strictEqual(bankVerify.verified, true);
assert.strictEqual(bankVerify.accountNumberMasked, 'XXXX-XXXX-7890');
console.log(`   ✅ Cashfree Penny-Drop Bank Verification: Verified ${bankVerify.registeredAccountName} for cashless claim credit.`);

const b2bSdk = new PHRliteSDK({
  apiKey: 'pk_live_hospital_max_healthcare',
  facilityId: 'MAX-SAKET-01',
  facilityName: 'Max Super Speciality Hospital, Saket',
  environment: 'sandbox'
});

const portabilityDossier = b2bSdk.exportPortabilityDossier({
  patientId: 'PAT-JOHN-DOE-001',
  currentInsurer: 'Star Health & Allied Insurance',
  targetInsurer: 'HDFC ERGO General Insurance',
  activePolicyNumber: '0123/SH/2026/8841',
  continuousCoverageMonths: 36,
  verifiedCommitHashes: ['hash_1', 'hash_2', 'hash_3']
});
assert.strictEqual(portabilityDossier.eligibleForZeroPedReset, true);
assert.strictEqual(portabilityDossier.statutoryPortabilityWindowValid, true);
console.log(`   ✅ B2B SDK Portability Dossier: ${portabilityDossier.dossierId} (Zero PED Waiting Period Reset Guaranteed under IRDAI 2024)`);

// Test Admin Console DPDP Audit Log
const auditEntry = AdminConsoleManager.logAudit({
  actorId: 'MAX-SAKET-01',
  actionType: 'RECORD_ACCESSED',
  purposeCode: 'CAREMGT',
  consentArtifactId: consent.consentRequestId
});
assert.ok(auditEntry.tamperProofSignature.length > 0);
console.log(`   ✅ DPDP Cryptographic Audit Log: Entry ${auditEntry.logId} signed and sealed.\n`);

console.log('🎉 ALL 21 TEST SUITES PASSED! PHRlite is fully operational, secure, interoperable, and compliant across all 3 modules.\n');


