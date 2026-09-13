/**
 * PHRlite: High-End Sovereign Health Passport Engine & PWA
 * Authentic, Empathetic, Parallax-Enabled, Zero-Knowledge
 */

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Global Simulated Family Vault State
const vaultData = {
  currentPersona: 'family',
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
          tagStyle: 'background: #dbeafe; color: #1e40af;',
          title: 'Internal Medicine Annual Review',
          author: 'Dr. Emily Watson, MD',
          date: '10 Sep 2026',
          desc: 'Blood pressure 118/76 mmHg. Spirometry normal. Refilled Salbutamol inhaler.',
          hash: '77ea19...55b2'
        },
        {
          id: 'stamp-2',
          tag: '⌚ WEARABLE BIOMARKERS',
          tagStyle: 'background: #dcfce7; color: #166534;',
          title: 'Google Health Connect Continuous Log',
          author: 'Pixel Watch 3 / Health Connect',
          date: '05 Sep 2026',
          desc: '7-Day Rolling Summary: 64 bpm Resting HR, 9,200 steps/day, SpO2 99%.',
          hash: '3f8e12...89bb'
        },
        {
          id: 'stamp-3',
          tag: '💬 CONVERSATIONAL INTAKE',
          tagStyle: 'background: #fef3c7; color: #92400e;',
          title: 'Baseline HealthVault Genesis',
          author: 'HealthVault Intake Agent',
          date: '01 Sep 2026',
          desc: 'Verified baseline chronic conditions, sulfa allergy, and family history.',
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
        { substance: 'Peanuts', severity: 'MILD', reaction: 'Localized urticaria' }
      ],
      conditions: [
        { name: 'Childhood Allergic Rhinitis', code: 'J30.1', year: '2022' }
      ],
      meds: [
        { name: 'Cetirizine Syrup', dose: '5ml at bedtime as needed' }
      ],
      stamps: [
        {
          id: 'stamp-child-1',
          tag: '🎒 SKIDS CERTIFIED SCHOOL SCREENING',
          tagStyle: 'background: #fef3c7; color: #92400e;',
          title: 'Annual Pediatric Health & Growth Exam',
          author: 'Dr. Anita Roy [SKIDS Child Health]',
          date: '12 Sep 2026',
          desc: 'Grade 4-B @ Greenwood High. Height: 138cm, Weight: 32.5kg (BMI: 17.1 - 50th percentile). Vision: 6/6 L/R. Dental: 0 caries.',
          hash: 'c471b0...66e2'
        },
        {
          id: 'stamp-child-2',
          tag: '💉 IMMUNIZATION RECORD',
          tagStyle: 'background: #ede9fe; color: #6b21a8;',
          title: 'School Vaccination Attestation',
          author: 'City Pediatric Clinic',
          date: '15 Aug 2024',
          desc: 'Administered MMR booster & Tdap. Sealed into official digital passport record.',
          hash: '5d12a9...33f1'
        }
      ]
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setupParallaxMouseEffect();
  setupPersonaSwitching();
  renderPhoneInterior();
  setupCryptoInspector();
  setupSuiteTabNavigation();
  setupDoctorCopilotWorkstation();
});

// 1. Interactive 3D Parallax Tilt on Mouse Move
function setupParallaxMouseEffect() {
  const stage = document.getElementById('parallax-stage');
  const phone = document.getElementById('phone-viewport');
  const badge1 = document.getElementById('badge-top-right');
  const badge2 = document.getElementById('badge-bottom-left');

  if (!stage || !phone) return;

  stage.addEventListener('mousemove', (e) => {
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotX = -(y / rect.height) * 16;
    const rotY = (x / rect.width) * 16;

    phone.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
    if (badge1) badge1.style.transform = `translate3d(${x * 0.08}px, ${y * 0.08}px, 40px)`;
    if (badge2) badge2.style.transform = `translate3d(${-x * 0.08}px, ${-y * 0.08}px, 40px)`;
  });

  stage.addEventListener('mouseleave', () => {
    phone.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    if (badge1) badge1.style.transform = 'translate3d(0, 0, 0)';
    if (badge2) badge2.style.transform = 'translate3d(0, 0, 0)';
  });
}

// 2. Persona Switcher in Hero (Patient vs Doctor vs School)
function setupPersonaSwitching() {
  const headlineEl = document.getElementById('hero-main-headline');
  const descEl = document.getElementById('hero-main-desc');
  const personaBtns = document.querySelectorAll('.persona-btn');

  const contentMap = {
    family: {
      headline: 'Your body has a story. <em>Finally, you own the book.</em>',
      desc: 'A lifelong health passport that lives securely on your phone. Stamped by your doctors, protected by your Face ID, and never sold to insurers or tech giants.',
      profileKey: 'rohan',
      badgeTop: { tag: 'SOVEREIGN VAULT', text: '100% Offline on Phone' },
      badgeBottom: { tag: 'FAMILY VAULT', text: 'Rohan & Aarav Linked' }
    },
    doctor: {
      headline: 'No 200-page scanned PDFs. <em>Just 30 seconds of pure clarity.</em>',
      desc: 'Instantly synthesize decades of history into an actionable 1-page clinical mental model. Look at the human in front of you, not the EHR monitor.',
      profileKey: 'rohan',
      badgeTop: { tag: 'INSTANT CLINICAL DIFF', text: 'Zero Repetitive Charting' },
      badgeBottom: { tag: 'DRUG-ALLERGY GUARD', text: 'Real-time Safety Alert' }
    },
    school: {
      headline: 'The genesis of lifetime health <em>starts in the classroom.</em>',
      desc: '1,000 students screened in a day. Zero lost paper slips. Official vision, dental, and growth stamps handed directly into parents\' custody.',
      profileKey: 'aarav',
      badgeTop: { tag: 'SKIDS VERIFIED', text: 'Annual School Checkup' },
      badgeBottom: { tag: 'INSTANT PARENT SMS', text: 'Claim Link Generated' }
    }
  };

  personaBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      personaBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.dataset.persona;
      const data = contentMap[mode];
      if (!data) return;

      headlineEl.innerHTML = data.headline;
      descEl.textContent = data.desc;

      vaultData.activeProfile = data.profileKey;
      renderPhoneInterior();

      // Update floating badges
      const topBadgeTag = document.getElementById('badge-top-tag');
      const topBadgeText = document.getElementById('badge-top-text');
      const botBadgeTag = document.getElementById('badge-bot-tag');
      const botBadgeText = document.getElementById('badge-bot-text');

      if (topBadgeTag) topBadgeTag.textContent = data.badgeTop.tag;
      if (topBadgeText) topBadgeText.textContent = data.badgeTop.text;
      if (botBadgeTag) botBadgeTag.textContent = data.badgeBottom.tag;
      if (botBadgeText) botBadgeText.textContent = data.badgeBottom.text;
    });
  });
}

// 3. Render Phone Interior Screen
function renderPhoneInterior() {
  const profile = vaultData.profiles[vaultData.activeProfile];
  if (!profile) return;

  const nameEl = document.getElementById('phone-user-display');
  const cardNameEl = document.getElementById('phone-card-holder');
  const cardIdEl = document.getElementById('phone-card-doc-num');
  const cardBloodEl = document.getElementById('phone-card-blood');
  const cardStampsCountEl = document.getElementById('phone-card-stamps-num');
  const feedCountEl = document.getElementById('phone-feed-counter');
  const feedListEl = document.getElementById('phone-feed-scroll');

  if (nameEl) nameEl.textContent = profile.name;
  if (cardNameEl) cardNameEl.textContent = profile.name;
  if (cardIdEl) cardIdEl.textContent = profile.id;
  if (cardBloodEl) cardBloodEl.textContent = `BLOOD: ${profile.bloodType}`;
  if (cardStampsCountEl) cardStampsCountEl.textContent = `${profile.stamps.length} Stamps`;
  if (feedCountEl) feedCountEl.textContent = `${profile.stamps.length} Verified`;

  if (feedListEl) {
    feedListEl.innerHTML = profile.stamps.map(s => `
      <div class="stamp-entry">
        <div class="stamp-pill-badge" style="${s.tagStyle}">${s.tag}</div>
        <div class="stamp-entry-title">${s.title}</div>
        <div class="stamp-entry-body">${s.desc}</div>
        <div class="stamp-entry-signature">
          <span>✍️ ${s.author}</span><br>
          <span>📅 ${s.date} • # ${s.hash}</span>
        </div>
      </div>
    `).join('');
  }
}

// 4. Zero-Knowledge Cryptographic Scramble Inspector
function setupCryptoInspector() {
  const toggleBtn = document.getElementById('btn-crypto-toggle');
  const cipherPane = document.getElementById('pane-ciphertext-view');
  let isEncrypted = false;

  if (!toggleBtn || !cipherPane) return;

  toggleBtn.addEventListener('click', () => {
    isEncrypted = !isEncrypted;

    if (isEncrypted) {
      toggleBtn.textContent = '🔒 Showing Cloudflare R2 View (AES-256 Ciphertext)';
      toggleBtn.style.background = '#059669';
      toggleBtn.style.color = 'white';

      // Scramble into high-entropy ciphertext
      cipherPane.innerHTML = `
        <span style="color: #34d399;">// AES-256-GCM Encrypted Blob (Stored on Cloudflare R2)</span>
        <br><span style="color: #f59e0b;">IV (96-bit Nonce):</span> 0x8a92f4e0912cb84129e001ab
        <br><span style="color: #38bdf8;">Auth Tag:</span> 0x3d7b42f9e110c4a9
        <br><span style="color: #94a3b8;">Payload (Unreadable to Cloudflare, Insurers, & Hackers):</span>
        <br><span style="word-break: break-all; color: #cbd5e1;">7a9f82b1c4e0934d88e10023a9b1c7f42847d0e9182374b92c4819e0f3984712bc9048a172e9471b023948e7192a48b02938471b29038471b023948e7192a48b02938471b...</span>
        <br><br><span style="color: #34d399;">✓ Cloudflare Storage Cost: $0.00018 / year</span>
      `;
    } else {
      toggleBtn.textContent = '👁️ Inspect What Cloudflare Actually Sees';
      toggleBtn.style.background = 'rgba(16, 185, 129, 0.18)';
      toggleBtn.style.color = '#a7f3d0';

      cipherPane.innerHTML = `
        <span style="color: #38bdf8;">// Your Phone's Decrypted Local Vault (Protected by Face ID)</span>
        <br>{
        <br>&nbsp;&nbsp;<span style="color: #fef08a;">"patient"</span>: "Rohan Verma",
        <br>&nbsp;&nbsp;<span style="color: #fef08a;">"bloodType"</span>: "B+",
        <br>&nbsp;&nbsp;<span style="color: #fef08a;">"allergies"</span>: ["Sulfa Drugs (HIGH Anaphylaxis)"],
        <br>&nbsp;&nbsp;<span style="color: #fef08a;">"conditions"</span>: ["Asthma (Mild Persistent)"],
        <br>&nbsp;&nbsp;<span style="color: #fef08a;">"wearable"</span>: "Resting Heart Rate: 64 bpm"
        <br>}
      `;
    }
  });
}

// 5. Suite Interactive Canvas Tab Navigation
function setupSuiteTabNavigation() {
  const tabs = document.querySelectorAll('.tab-pill-btn');
  const panes = document.querySelectorAll('.suite-pane-view');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.style.display = 'none');

      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.target);
      if (target) target.style.display = 'block';

      if (tab.dataset.target === 'pane-suite-copilot') {
        refreshCopilotDoctorView();
      }
    });
  });
}

// 6. Doctor Copilot Interactive Workstation
function setupDoctorCopilotWorkstation() {
  refreshCopilotDoctorView();

  const rxInput = document.getElementById('suite-copilot-rx');
  const rxAlert = document.getElementById('suite-copilot-alert');
  const signBtn = document.getElementById('suite-copilot-sign-btn');

  if (rxInput && rxAlert) {
    rxInput.addEventListener('input', () => {
      const val = rxInput.value.toLowerCase();
      const profile = vaultData.profiles[vaultData.activeProfile];
      const hasSulfa = profile.allergies.some(a => a.substance.toLowerCase().includes('sulfa'));
      const hasPeanut = profile.allergies.some(a => a.substance.toLowerCase().includes('peanut'));

      if (hasSulfa && (val.includes('bactrim') || val.includes('sulfa') || val.includes('septra'))) {
        rxAlert.style.display = 'block';
        rxAlert.innerHTML = `🚨 <strong>CRITICAL DRUG CONTRAINDICATION:</strong> Patient has documented <strong>Sulfa Drug allergy</strong> (Reaction: Facial swelling). Prescribe an alternative antibiotic!`;
      } else if (hasPeanut && val.includes('peanut')) {
        rxAlert.style.display = 'block';
        rxAlert.innerHTML = `🚨 <strong>CRITICAL ALLERGY CONTRAINDICATION:</strong> Patient has documented <strong>Peanut allergy</strong>.`;
      } else {
        rxAlert.style.display = 'none';
      }
    });
  }

  if (signBtn) {
    signBtn.addEventListener('click', () => {
      const assessment = document.getElementById('suite-copilot-assessment')?.value || 'Acute Routine Checkup';
      const plan = document.getElementById('suite-copilot-plan')?.value || 'Patient advised healthy lifestyle.';

      const profile = vaultData.profiles[vaultData.activeProfile];
      const newStamp = {
        id: 'stamp-' + Date.now(),
        tag: '🩺 CLINICAL ENCOUNTER',
        tagStyle: 'background: #dbeafe; color: #1e40af;',
        title: `Clinic Consultation: ${assessment}`,
        author: 'Dr. Emily Watson, MD',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        desc: `Assessment: ${assessment}. Plan: ${plan}`,
        hash: '8f3a11...44a9'
      };

      profile.stamps.unshift(newStamp);
      renderPhoneInterior();
      refreshCopilotDoctorView();

      alert(`✅ Discharge commit signed with Dr. Watson's Ed25519 key and appended to ${profile.name}'s Health Passport!`);
    });
  }
}

function refreshCopilotDoctorView() {
  const profile = vaultData.profiles[vaultData.activeProfile];
  if (!profile) return;

  const headerEl = document.getElementById('suite-copilot-header');
  const allergiesEl = document.getElementById('suite-copilot-allergies');
  const problemsEl = document.getElementById('suite-copilot-problems');
  const medsEl = document.getElementById('suite-copilot-meds');

  if (headerEl) {
    headerEl.textContent = `${profile.name} (Age ${profile.age}) • Blood: ${profile.bloodType} • ID: ${profile.id}`;
  }

  if (allergiesEl) {
    allergiesEl.innerHTML = profile.allergies.map(a => `
      <li style="color: #991b1b; font-weight: 800; margin-bottom: 0.3rem;">
        🚨 ${a.substance} (${a.severity}): ${a.reaction}
      </li>
    `).join('');
  }

  if (problemsEl) {
    problemsEl.innerHTML = profile.conditions.map(c => `
      <li style="margin-bottom: 0.3rem;">• [${c.code}] ${c.name} (Since ${c.year})</li>
    `).join('');
  }

  if (medsEl) {
    medsEl.innerHTML = profile.meds.map(m => `
      <li style="margin-bottom: 0.3rem;">• ${m.name} (${m.dose})</li>
    `).join('');
  }
}

// Interactive SKIDS School Screening Stamping in Hub
window.submitSkidsFromHub = function(e) {
  e.preventDefault();
  const name = document.getElementById('hub-skids-name').value;
  const grade = document.getElementById('hub-skids-grade').value;
  const height = parseFloat(document.getElementById('hub-skids-ht').value);
  const weight = parseFloat(document.getElementById('hub-skids-wt').value);
  const vision = document.getElementById('hub-skids-vision').value;

  const bmi = (weight / ((height / 100) * (height / 100))).toFixed(1);

  vaultData.profiles.aarav.name = name;
  vaultData.profiles.aarav.stamps.unshift({
    id: 'stamp-' + Date.now(),
    tag: '🎒 SKIDS CERTIFIED SCHOOL SCREENING',
    tagStyle: 'background: #fef3c7; color: #92400e;',
    title: `School Screening: ${name} (Grade ${grade})`,
    author: 'Dr. Anita Roy [SKIDS Child Health]',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    desc: `Height: ${height}cm, Weight: ${weight}kg (BMI: ${bmi}). Vision: ${vision}. Checked by School Health Team.`,
    hash: 'e82b41...77d3'
  });

  vaultData.activeProfile = 'aarav';
  renderPhoneInterior();

  const msgBox = document.getElementById('hub-skids-success');
  if (msgBox) {
    msgBox.style.display = 'block';
    msgBox.innerHTML = `
      🎉 <strong>Child Passport Created & Stamped!</strong> Official SKIDS stamp appended for ${name}. Parent SMS claim link created: <code>https://phrlite.greybrain.in/claim?id=aarav-verma</code>. Switched live phone preview to Aarav!
    `;
  }
};

// Modal Windows
window.showPassModal = function() {
  const modal = document.getElementById('pass-modal-view');
  if (modal) modal.style.display = 'flex';
};

window.closePassModal = function() {
  const modal = document.getElementById('pass-modal-view');
  if (modal) modal.style.display = 'none';
};

window.showMedicalIdModal = function() {
  const modal = document.getElementById('med-id-modal-view');
  const profile = vaultData.profiles[vaultData.activeProfile];

  if (modal && profile) {
    document.getElementById('modal-field-name').textContent = profile.name;
    document.getElementById('modal-field-blood').textContent = profile.bloodType;
    document.getElementById('modal-field-contact').textContent = profile.emergencyContact;
    document.getElementById('modal-field-allergies').textContent = profile.allergies.map(a => `${a.substance} (${a.reaction})`).join(', ');
    modal.style.display = 'flex';
  }
};

window.closeMedicalIdModal = function() {
  const modal = document.getElementById('med-id-modal-view');
  if (modal) modal.style.display = 'none';
};
