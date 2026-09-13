/**
 * PHRlite: Sovereign Health Passport PWA & Clinical Engine
 * Designed for Patients, Families, and Clinicians
 */

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration note:', err);
    });
  });
}

// Global Simulated Family Vault State
const familyVault = {
  activeProfile: 'rohan',
  profiles: {
    rohan: {
      id: 'PASSPORT-IND-2026-9812',
      name: 'Rohan Verma',
      dob: '1990-08-14',
      age: 36,
      bloodType: 'B+',
      emergencyContact: 'Priya Verma (Spouse) • +91 98765 43210',
      allergies: [
        { substance: 'Sulfa Drugs', severity: 'HIGH', reaction: 'Severe rash, facial swelling' }
      ],
      conditions: [
        { name: 'Asthma (Mild Persistent)', code: 'J45.20', year: '2015' }
      ],
      meds: [
        { name: 'Salbutamol Inhaler', dose: '100mcg as needed' }
      ],
      stamps: [
        {
          id: 'stamp-1',
          tag: '🩺 CLINICAL ENCOUNTER',
          tagClass: 'background: #dbeafe; color: #1e40af;',
          title: 'Internal Medicine Annual Review',
          author: 'Dr. Emily Watson, MD',
          date: '10 Sep 2026',
          desc: 'Blood pressure 118/76 mmHg. Spirometry normal. Refilled Salbutamol inhaler.',
          hash: '77ea19...55b2'
        },
        {
          id: 'stamp-2',
          tag: '⌚ WEARABLE VITALS',
          tagClass: 'background: #dcfce7; color: #166534;',
          title: '7-Day Continuous Health Connect Log',
          author: 'Google Health Connect / Pixel Watch',
          date: '05 Sep 2026',
          desc: 'Resting Heart Rate: 64 bpm average. Daily steps: 9,200. SpO2: 99%. Sleep: 7.4 hrs.',
          hash: '3f8e12...89bb'
        },
        {
          id: 'stamp-3',
          tag: '💬 CONVERSATIONAL INTAKE',
          tagClass: 'background: #fef3c7; color: #92400e;',
          title: 'Adult Baseline Profile Setup',
          author: 'HealthVault Intake Agent',
          date: '01 Sep 2026',
          desc: 'Verified baseline chronic conditions, sulfa allergy, and family cardiac history.',
          hash: '9a4b8f...21c0'
        }
      ]
    },
    aarav: {
      id: 'PASSPORT-SKIDS-2026-4401',
      name: 'Aarav Verma',
      dob: '2016-06-20',
      age: 10,
      bloodType: 'O+',
      emergencyContact: 'Rohan Verma (Father) • +91 98123 45678',
      allergies: [
        { substance: 'Peanuts', severity: 'MILD', reaction: 'Localized hives' }
      ],
      conditions: [
        { name: 'Childhood Allergic Rhinitis', code: 'J30.1', year: '2022' }
      ],
      meds: [
        { name: 'Cetirizine Syrup', dose: '5ml at night as needed' }
      ],
      stamps: [
        {
          id: 'stamp-child-1',
          tag: '🎒 SKIDS CERTIFIED SCHOOL SCREENING',
          tagClass: 'background: #fef3c7; color: #92400e;',
          title: 'Annual Pediatric Health & Growth Exam',
          author: 'Dr. Anita Roy [SKIDS Child Health]',
          date: '12 Sep 2026',
          desc: 'Grade 4-B @ Greenwood High. Height: 138cm, Weight: 32.5kg (BMI: 17.1 - 50th percentile). Vision: 6/6 L/R. Dental: 0 caries.',
          hash: 'c471b0...66e2'
        },
        {
          id: 'stamp-child-2',
          tag: '💉 IMMUNIZATION RECORD',
          tagClass: 'background: #ede9fe; color: #6b21a8;',
          title: 'School Vaccination Attestation',
          author: 'City Pediatric Clinic',
          date: '15 Aug 2024',
          desc: 'Administered MMR booster & Tdap. Stamped into official digital passport record.',
          hash: '5d12a9...33f1'
        }
      ]
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  renderMobileScreen();
  setupCanvasSwitchers();
  setupDoctorCopilotSafety();
});

// Render the Live Interactive iPhone Screen
function renderMobileScreen() {
  const profile = familyVault.profiles[familyVault.activeProfile];
  if (!profile) return;

  // Header
  const userNameEl = document.getElementById('phone-user-name');
  if (userNameEl) userNameEl.textContent = profile.name;

  // Passport Card
  const cardNameEl = document.getElementById('phone-card-name');
  const cardIdEl = document.getElementById('phone-card-id');
  const cardBloodEl = document.getElementById('phone-blood-pill');
  const cardStampsCountEl = document.getElementById('phone-card-stamps-count');

  if (cardNameEl) cardNameEl.textContent = profile.name;
  if (cardIdEl) cardIdEl.textContent = profile.id;
  if (cardBloodEl) cardBloodEl.textContent = `BLOOD: ${profile.bloodType}`;
  if (cardStampsCountEl) cardStampsCountEl.textContent = `${profile.stamps.length} Stamps`;

  // Feed count
  const feedCountEl = document.getElementById('phone-feed-count');
  if (feedCountEl) feedCountEl.textContent = `${profile.stamps.length} Verified`;

  // Feed list
  const feedListEl = document.getElementById('phone-feed-list');
  if (feedListEl) {
    feedListEl.innerHTML = profile.stamps.map(s => `
      <div class="feed-card">
        <div class="feed-tag" style="${s.tagClass}">${s.tag}</div>
        <div class="feed-title">${s.title}</div>
        <div class="feed-body">${s.desc}</div>
        <div class="feed-foot">
          <span>✍️ ${s.author}</span><br>
          <span>📅 ${s.date} • # ${s.hash}</span>
        </div>
      </div>
    `).join('');
  }
}

// Switch Active Family Member in Phone Preview
window.switchProfile = function(profileKey) {
  familyVault.activeProfile = profileKey;
  renderMobileScreen();
  updateDoctorCopilotView();

  const rohanTab = document.getElementById('tab-prof-rohan');
  const aaravTab = document.getElementById('tab-prof-aarav');
  if (rohanTab && aaravTab) {
    if (profileKey === 'rohan') {
      rohanTab.style.background = '#064e3b';
      rohanTab.style.color = 'white';
      aaravTab.style.background = 'white';
      aaravTab.style.color = '#57534e';
    } else {
      aaravTab.style.background = '#064e3b';
      aaravTab.style.color = 'white';
      rohanTab.style.background = 'white';
      rohanTab.style.color = '#57534e';
    }
  }
};

// Canvas Tabs Switcher (Bottom Interactive Hub)
function setupCanvasSwitchers() {
  const switchBtns = document.querySelectorAll('.switch-btn');
  const views = document.querySelectorAll('.pwa-view-pane');

  switchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchBtns.forEach(b => b.classList.remove('active'));
      views.forEach(v => v.style.display = 'none');

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.style.display = 'block';

      if (btn.dataset.target === 'view-copilot') {
        updateDoctorCopilotView();
      }
    });
  });
}

// Doctor Copilot View & Drug-Allergy Interaction Guardrail
function setupDoctorCopilotSafety() {
  const rxInput = document.getElementById('copilot-input-rx');
  const rxWarning = document.getElementById('copilot-rx-alert');
  const signBtn = document.getElementById('copilot-btn-sign');

  if (rxInput && rxWarning) {
    rxInput.addEventListener('input', () => {
      const val = rxInput.value.toLowerCase();
      const profile = familyVault.profiles[familyVault.activeProfile];
      const hasSulfa = profile.allergies.some(a => a.substance.toLowerCase().includes('sulfa'));
      const hasPeanut = profile.allergies.some(a => a.substance.toLowerCase().includes('peanut'));

      if (hasSulfa && (val.includes('bactrim') || val.includes('sulfa') || val.includes('septra'))) {
        rxWarning.style.display = 'block';
        rxWarning.innerHTML = `⚠️ <strong>CRITICAL ALLERGY CONTRAINDICATION:</strong> Patient has documented <strong>Sulfa Drug allergy</strong> (Reaction: Facial swelling). Prescribe alternative!`;
      } else if (hasPeanut && val.includes('peanut')) {
        rxWarning.style.display = 'block';
        rxWarning.innerHTML = `⚠️ <strong>CRITICAL ALLERGY CONTRAINDICATION:</strong> Patient has documented <strong>Peanut allergy</strong>.`;
      } else {
        rxWarning.style.display = 'none';
      }
    });
  }

  if (signBtn) {
    signBtn.addEventListener('click', () => {
      const assessment = document.getElementById('copilot-input-assessment')?.value || 'Acute Upper Respiratory Checkup';
      const plan = document.getElementById('copilot-input-plan')?.value || 'Symptomatic rest, hydration, monitoring.';

      const profile = familyVault.profiles[familyVault.activeProfile];
      const newStamp = {
        id: 'stamp-' + Date.now(),
        tag: '🩺 CLINICAL ENCOUNTER',
        tagClass: 'background: #dbeafe; color: #1e40af;',
        title: `Clinic Visit: ${assessment}`,
        author: 'Dr. Emily Watson, MD',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        desc: `Assessment: ${assessment}. Plan: ${plan}`,
        hash: '8f3a11...44a9'
      };

      profile.stamps.unshift(newStamp);
      renderMobileScreen();
      updateDoctorCopilotView();

      alert(`✅ Discharge summary cryptographically signed with Dr. Watson's Ed25519 key and appended to ${profile.name}'s Health Passport!`);
    });
  }
}

function updateDoctorCopilotView() {
  const profile = familyVault.profiles[familyVault.activeProfile];
  if (!profile) return;

  const headerEl = document.getElementById('copilot-view-header');
  const allergiesEl = document.getElementById('copilot-view-allergies');
  const conditionsEl = document.getElementById('copilot-view-conditions');
  const medsEl = document.getElementById('copilot-view-meds');

  if (headerEl) {
    headerEl.textContent = `${profile.name} (Age ${profile.age}) • Blood: ${profile.bloodType} • ID: ${profile.id}`;
  }

  if (allergiesEl) {
    allergiesEl.innerHTML = profile.allergies.map(a => `
      <li style="color: #b91c1c; font-weight: 800; font-size: 0.88rem; margin-bottom: 0.25rem;">
        🚨 ${a.substance} (${a.severity}): ${a.reaction}
      </li>
    `).join('');
  }

  if (conditionsEl) {
    conditionsEl.innerHTML = profile.conditions.map(c => `
      <li style="font-size: 0.85rem; color: #1c1917; margin-bottom: 0.25rem;">
        • [${c.code}] ${c.name} (Since ${c.year})
      </li>
    `).join('');
  }

  if (medsEl) {
    medsEl.innerHTML = profile.meds.map(m => `
      <li style="font-size: 0.85rem; color: #1c1917; margin-bottom: 0.25rem;">
        • ${m.name} (${m.dose})
      </li>
    `).join('');
  }
}

// Interactive Modals
window.showDoctorQRModal = function() {
  const modal = document.getElementById('modal-doctor-qr');
  if (modal) modal.style.display = 'flex';
};

window.closeDoctorQRModal = function() {
  const modal = document.getElementById('modal-doctor-qr');
  if (modal) modal.style.display = 'none';
};

window.showEmergencyCardModal = function() {
  const modal = document.getElementById('modal-emergency-card');
  const profile = familyVault.profiles[familyVault.activeProfile];

  if (modal && profile) {
    document.getElementById('emergency-modal-name').textContent = profile.name;
    document.getElementById('emergency-modal-blood').textContent = profile.bloodType;
    document.getElementById('emergency-modal-contact').textContent = profile.emergencyContact;
    document.getElementById('emergency-modal-allergies').textContent = profile.allergies.map(a => `${a.substance} (${a.reaction})`).join(', ');
    modal.style.display = 'flex';
  }
};

window.closeEmergencyCardModal = function() {
  const modal = document.getElementById('modal-emergency-card');
  if (modal) modal.style.display = 'none';
};

// Interactive SKIDS School Screening Stamping Form
window.submitSkidsChildScreening = function(e) {
  e.preventDefault();
  const name = document.getElementById('skids-in-name').value;
  const grade = document.getElementById('skids-in-grade').value;
  const height = parseFloat(document.getElementById('skids-in-ht').value);
  const weight = parseFloat(document.getElementById('skids-in-wt').value);
  const vision = document.getElementById('skids-in-vision').value;

  const bmi = (weight / ((height / 100) * (height / 100))).toFixed(1);

  // Add child to profiles or update Aarav
  familyVault.profiles.aarav.name = name;
  familyVault.profiles.aarav.stamps.unshift({
    id: 'stamp-' + Date.now(),
    tag: '🎒 SKIDS CERTIFIED SCHOOL SCREENING',
    tagClass: 'background: #fef3c7; color: #92400e;',
    title: `School Screening: ${name} (Grade ${grade})`,
    author: 'Dr. Anita Roy [SKIDS Child Health]',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    desc: `Height: ${height}cm, Weight: ${weight}kg (BMI: ${bmi}). Vision: ${vision}. Dental: Checked.`,
    hash: 'e82b41...77d3'
  });

  familyVault.activeProfile = 'aarav';
  renderMobileScreen();

  const alertBox = document.getElementById('skids-success-alert');
  if (alertBox) {
    alertBox.style.display = 'block';
    alertBox.innerHTML = `
      🎉 <strong>Passport Stamped for ${name}!</strong> Child's Health Passport has been created and verified with SKIDS Ed25519 signature. Parent SMS link generated: <code>https://phrlite.greybrain.in/claim?id=aarav-verma</code>. Switched phone preview to Aarav!
    `;
  }
};
