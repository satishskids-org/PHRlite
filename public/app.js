/**
 * PHRlite: Interactive Web App & Clinical Sandbox
 * Local-First, Zero-Knowledge, HL7 FHIR Health Passport
 */

// Simulated Client-Side Passport State
const passportState = {
  passportId: 'PASSPORT-IND-2026-9812',
  patientName: 'Rohan Verma',
  birthDate: '1990-08-14',
  gender: 'Male',
  bloodType: 'B+',
  masterPublicKey: 'ac7ed9a017815f837b3d0d97e8f1c50b8923a4...',
  allergies: [
    { substance: 'Sulfa Drugs', reaction: 'Severe rash, facial swelling', criticality: 'HIGH' }
  ],
  conditions: [
    { code: 'J45.20', name: 'Asthma (Mild Persistent)', onset: '2015-01-01' }
  ],
  medications: [
    { drug: 'Salbutamol Inhaler', dose: '100mcg as needed', status: 'active' }
  ],
  vitals: {
    rhr: 64,
    spo2: 99,
    steps: 9200,
    bp: '118/76'
  },
  commits: [
    {
      id: 'commit-gen-01',
      type: 'GENESIS',
      title: 'Genesis: Adult Conversational Intake',
      author: 'Rohan Verma (Self / Passkey)',
      role: 'PATIENT',
      date: '2026-09-01',
      hash: '9a4b8f...21c0',
      badgeClass: 'stamp-dr',
      desc: 'Baseline profile initialized via HealthVault conversational chatbot.'
    },
    {
      id: 'commit-wearable-02',
      type: 'VITALS_SUMMARY',
      title: 'Google Health Connect Telemetry',
      author: 'Pixel Watch 3 / Health Connect',
      role: 'DEVICE',
      date: '2026-09-07',
      hash: '3f8e12...89bb',
      badgeClass: 'stamp-wearable',
      desc: '7-day rolling biometric summary: 64 bpm RHR, 9,200 daily steps, SpO2 99%.'
    },
    {
      id: 'commit-skids-03',
      type: 'SCREENING_EXAM',
      title: 'Pediatric History Attestation',
      author: 'Dr. Anita Roy [SKIDS Child Health]',
      role: 'SCREENING_AUTHORITY_SKIDS',
      date: '2026-09-10',
      hash: 'c471b0...66e2',
      badgeClass: 'stamp-skids',
      desc: 'Verified historical school records & childhood immunizations.'
    }
  ]
};

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  renderPassportStamps();
  setupChatbot();
  setupSkidsPortal();
  setupDoctorCopilot();
  setupCloudRelay();
});

// Tab Switching
function setupTabs() {
  const tabs = document.querySelectorAll('.sandbox-tab');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.style.display = 'none');

      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.target);
      if (target) target.style.display = 'block';
    });
  });
}

// Render Passport Stamps
function renderPassportStamps() {
  const container = document.getElementById('stamps-container');
  if (!container) return;

  container.innerHTML = passportState.commits.map(c => `
    <div class="stamp-box">
      <div>
        <div class="stamp-tag ${c.badgeClass}">
          ${c.role === 'SCREENING_AUTHORITY_SKIDS' ? '🎒 SKIDS CERTIFIED' : (c.role === 'DEVICE' ? '⌚ WEARABLE' : '🩺 CLINICAL')}
        </div>
        <div class="stamp-title">${c.title}</div>
        <div class="stamp-desc">${c.desc}</div>
      </div>
      <div class="stamp-meta">
        <div>✍️ ${c.author}</div>
        <div>📅 ${c.date} • # ${c.hash}</div>
      </div>
    </div>
  `).join('');

  const commitCountEl = document.getElementById('passport-commit-count');
  if (commitCountEl) commitCountEl.textContent = passportState.commits.length;
}

// Conversational Intake Chatbot
function setupChatbot() {
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-user-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const fhirPreview = document.getElementById('fhir-preview-code');

  function updateFhirPreview() {
    if (!fhirPreview) return;
    const bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            name: passportState.patientName,
            birthDate: passportState.birthDate,
            bloodType: passportState.bloodType
          }
        },
        ...passportState.allergies.map((a, i) => ({
          resource: {
            resourceType: 'AllergyIntolerance',
            id: `alg-${i + 1}`,
            substance: a.substance,
            criticality: a.criticality,
            reaction: a.reaction
          }
        })),
        ...passportState.conditions.map((c, i) => ({
          resource: {
            resourceType: 'Condition',
            id: `cond-${i + 1}`,
            code: { text: c.name, coding: [{ code: c.code, system: 'ICD-10' }] }
          }
        })),
        ...passportState.medications.map((m, i) => ({
          resource: {
            resourceType: 'MedicationRequest',
            id: `med-${i + 1}`,
            medication: m.drug,
            dosageInstruction: m.dose
          }
        }))
      ]
    };
    fhirPreview.textContent = JSON.stringify(bundle, null, 2);
  }

  updateFhirPreview();

  window.sendQuickReply = function(text) {
    appendUserMessage(text);
    handleBotResponse(text);
  };

  function appendUserMessage(text) {
    if (!chatMessages) return;
    const msg = document.createElement('div');
    msg.className = 'msg msg-user';
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendBotMessage(text) {
    if (!chatMessages) return;
    const msg = document.createElement('div');
    msg.className = 'msg msg-bot';
    msg.innerHTML = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function handleBotResponse(text) {
    setTimeout(() => {
      const lower = text.toLowerCase();
      if (lower.includes('allergy') || lower.includes('penicillin') || lower.includes('sulfa')) {
        passportState.allergies.push({ substance: 'Penicillin', reaction: 'Hives, swelling', criticality: 'HIGH' });
        appendBotMessage('Got it. I have added <strong>Penicillin</strong> as a HIGH-criticality allergy to your FHIR bundle. Any other medications?');
      } else if (lower.includes('diabetes') || lower.includes('metformin')) {
        passportState.conditions.push({ code: 'E11.9', name: 'Type 2 Diabetes Mellitus', onset: '2023-05-10' });
        passportState.medications.push({ drug: 'Metformin', dose: '500mg BID', status: 'active' });
        appendBotMessage('Recorded <strong>Type 2 Diabetes</strong> (ICD-10 E11.9) and <strong>Metformin 500mg</strong>. Your 1-page clinical summary has been updated!');
      } else {
        appendBotMessage(`Understood: "${text}". I have structured this into your draft passport bundle.`);
      }
      updateFhirPreview();
      renderPassportStamps();
      updateDoctorCopilotView();
    }, 600);
  }

  if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener('click', () => {
      const val = chatInput.value.trim();
      if (!val) return;
      appendUserMessage(val);
      chatInput.value = '';
      handleBotResponse(val);
    });
  }
}

// SKIDS School Screening Portal
function setupSkidsPortal() {
  const form = document.getElementById('skids-form');
  const resultBox = document.getElementById('skids-result-box');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const studentName = document.getElementById('skids-student-name').value;
    const schoolName = document.getElementById('skids-school-name').value;
    const grade = document.getElementById('skids-grade').value;
    const height = parseFloat(document.getElementById('skids-height').value);
    const weight = parseFloat(document.getElementById('skids-weight').value);
    const vision = document.getElementById('skids-vision').value;
    const caries = document.getElementById('skids-caries').value;

    const bmi = (weight / ((height / 100) * (height / 100))).toFixed(1);

    // Append to passport stamps
    const newCommit = {
      id: 'commit-skids-' + Date.now(),
      type: 'SCREENING_EXAM',
      title: `SKIDS Annual Checkup: ${studentName}`,
      author: 'SKIDS School Health (Verified Provider)',
      role: 'SCREENING_AUTHORITY_SKIDS',
      date: new Date().toISOString().split('T')[0],
      hash: 'e82b41...77d3',
      badgeClass: 'stamp-skids',
      desc: `Grade ${grade} @ ${schoolName}. BMI: ${bmi}, Vision: ${vision}, Dental Caries: ${caries}.`
    };

    passportState.commits.unshift(newCommit);
    renderPassportStamps();

    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.innerHTML = `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem; border-radius: 12px; color: #166534;">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem;">🎉 Child Passport Created & Stamped!</h4>
          <p style="font-size: 0.8rem; margin-bottom: 0.6rem;">
            Student: <strong>${studentName}</strong> (Grade ${grade})<br>
            Calculated BMI: <strong>${bmi}</strong> | Vision: <strong>${vision}</strong><br>
            Ed25519 Authority Signature: <code>6f1a8c92...4b72</code>
          </p>
          <div style="background: white; border: 1px dashed #22c55e; padding: 0.6rem; border-radius: 8px; font-size: 0.75rem;">
            📱 <strong>Parent SMS Claim Link Generated:</strong><br>
            <a href="#" style="color: #059669; word-break: break-all;">https://phrlite.greybrain.in/claim?id=passport-skids-${studentName.toLowerCase().replace(/\s+/g, '-')}&sig=6f1a8c</a>
          </div>
        </div>
      `;
    }
  });
}

// Doctor Copilot View
function setupDoctorCopilot() {
  updateDoctorCopilotView();

  const rxInput = document.getElementById('copilot-rx-input');
  const rxWarningBox = document.getElementById('copilot-rx-warning');
  const signCommitBtn = document.getElementById('copilot-sign-btn');

  if (rxInput && rxWarningBox) {
    rxInput.addEventListener('input', () => {
      const val = rxInput.value.toLowerCase();
      // Check allergy conflict
      const hasSulfaAllergy = passportState.allergies.some(a => a.substance.toLowerCase().includes('sulfa'));
      const hasPenicillinAllergy = passportState.allergies.some(a => a.substance.toLowerCase().includes('penicillin'));

      if (hasSulfaAllergy && (val.includes('bactrim') || val.includes('sulfa') || val.includes('septra'))) {
        rxWarningBox.style.display = 'block';
        rxWarningBox.innerHTML = `⚠️ <strong>CRITICAL DRUG CONTRAINDICATION:</strong> Patient has documented <strong>Sulfa Drug allergy</strong> (Stamped in 2018). Do not prescribe!`;
      } else if (hasPenicillinAllergy && (val.includes('amoxicillin') || val.includes('penicillin') || val.includes('augmentin'))) {
        rxWarningBox.style.display = 'block';
        rxWarningBox.innerHTML = `⚠️ <strong>CRITICAL DRUG CONTRAINDICATION:</strong> Patient has documented <strong>Penicillin allergy</strong> (Hives, swelling). Choose alternative!`;
      } else {
        rxWarningBox.style.display = 'none';
      }
    });
  }

  if (signCommitBtn) {
    signCommitBtn.addEventListener('click', () => {
      const assessment = document.getElementById('copilot-assessment-input')?.value || 'Acute Upper Respiratory Infection';
      const plan = document.getElementById('copilot-plan-input')?.value || 'Prescribed symptomatic therapy.';

      const drCommit = {
        id: 'commit-dr-' + Date.now(),
        type: 'ENCOUNTER',
        title: `Clinical Encounter: ${assessment}`,
        author: 'Dr. Emily Watson, MD [Cardiology & Internal Med]',
        role: 'PROVIDER',
        date: new Date().toISOString().split('T')[0],
        hash: '77ea19...55b2',
        badgeClass: 'stamp-dr',
        desc: `Assessment: ${assessment}. Plan: ${plan}`
      };

      passportState.commits.unshift(drCommit);
      renderPassportStamps();
      updateDoctorCopilotView();

      alert(`✅ Encounter successfully signed with Dr. Watson's Ed25519 key and appended to Rohan Verma's Master Health Passport!`);
    });
  }
}

function updateDoctorCopilotView() {
  const patientHeader = document.getElementById('copilot-patient-header');
  const allergiesList = document.getElementById('copilot-allergies-list');
  const problemsList = document.getElementById('copilot-problems-list');
  const medsList = document.getElementById('copilot-meds-list');
  const diffBox = document.getElementById('copilot-diff-text');

  if (patientHeader) {
    patientHeader.textContent = `${passportState.patientName} (DOB: ${passportState.birthDate}) • Blood: ${passportState.bloodType} • Total Commits: ${passportState.commits.length}`;
  }

  if (allergiesList) {
    allergiesList.innerHTML = passportState.allergies.map(a => `
      <li style="color: #b91c1c; font-weight: 700;">🚨 ${a.substance} (${a.criticality}): ${a.reaction}</li>
    `).join('');
  }

  if (problemsList) {
    problemsList.innerHTML = passportState.conditions.map(c => `
      <li>• [${c.code}] ${c.name} (Onset: ${c.onset || '2015'})</li>
    `).join('');
  }

  if (medsList) {
    medsList.innerHTML = passportState.medications.map(m => `
      <li>• ${m.drug} - ${m.dose}</li>
    `).join('');
  }

  if (diffBox) {
    diffBox.innerHTML = `
      <strong>Timeline Delta Since Last Clinic Visit:</strong><br>
      • Ingested 7-day Google Health Connect telemetry (64 bpm RHR, 9,200 steps/day).<br>
      • Active conditions: ${passportState.conditions.length} | Active prescriptions: ${passportState.medications.length}.<br>
      • Zero unrecorded ER encounters detected.
    `;
  }
}

// Zero-Knowledge Cloudflare R2 Sync
function setupCloudRelay() {
  const syncBtn = document.getElementById('sync-zk-btn');
  const syncStatus = document.getElementById('sync-zk-status');

  if (!syncBtn || !syncStatus) return;

  syncBtn.addEventListener('click', () => {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Encrypting & Syncing...';

    setTimeout(() => {
      syncBtn.disabled = false;
      syncBtn.textContent = 'Sync Sovereign Vault to Cloudflare R2';
      const byteSize = Math.floor(JSON.stringify(passportState).length * 1.3);
      syncStatus.innerHTML = `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1rem; border-radius: 12px; color: #065f46; font-size: 0.85rem;">
          <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.3rem;">🔒 Vault Encrypted & Pushed to Cloudflare R2!</div>
          • <strong>Encryption:</strong> AES-256-GCM client-side (96-bit IV: <code>7f1a92e4b019</code>)<br>
          • <strong>Cloud Visibility:</strong> Pure unreadable ciphertext (Zero-Knowledge)<br>
          • <strong>Synced Size:</strong> ${byteSize} bytes (~${(byteSize / 1024).toFixed(1)} KB)<br>
          • <strong>Annual Storage Cost:</strong> $0.00018 / year on Cloudflare R2<br>
          • <strong>Turnstile Verification:</strong> Validated (Human Passkey Token)
        </div>
      `;
    }, 800);
  });
}

// Modal Handlers
window.openQRModal = function() {
  const modal = document.getElementById('qr-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeQRModal = function() {
  const modal = document.getElementById('qr-modal');
  if (modal) modal.style.display = 'none';
};
