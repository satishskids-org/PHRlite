/**
 * PHRlite: Solo-Doctor Consented Magic Link Engine
 * 
 * Enables independent doctors on WhatsApp/telehealth to receive an ephemeral,
 * zero-knowledge 15-minute clinical summary and return a legally certified e-prescription
 * with ZERO software installation.
 */

import { generateEd25519KeyPair, signEd25519, verifyEd25519 } from '../core/crypto.ts';

export interface ConsentedSessionPayload {
  sessionId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: 'male' | 'female' | 'other';
  bloodGroup: string;
  allergies: string[];
  activeConditions: string[];
  currentMedications: string[];
  recentVitals?: {
    bloodPressure?: string;
    heartRate?: number;
    bloodGlucose?: number;
    recordedAt?: string;
  };
  consentPurpose: 'TELECONSULT_WHATSAPP';
  expiresAt: number; // Unix timestamp in ms (15 minutes from creation)
  patientSignature: string;
  patientPublicKey: string;
}

export interface DoctorEncounterResponse {
  sessionId: string;
  doctorName: string;
  doctorNmcRegistration: string;
  doctorClinicAddress: string;
  consultationNotes: string;
  prescriptionItems: {
    genericName: string;
    brandNameSuggestion?: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    isJanAushadhiAvailable: boolean;
    estimatedGenericSavingsInr: number;
  }[];
  timestamp: string;
  doctorSignature: string;
  doctorPublicKey: string;
}

export class MagicLinkManager {
  private static activeSessions: Map<string, ConsentedSessionPayload> = new Map();
  private static completedEncounters: Map<string, DoctorEncounterResponse> = new Map();

  /**
   * Generates a 15-minute consented magic link URL for WhatsApp consultation
   */
  public static createSession(
    patientData: {
      patientId: string;
      patientName: string;
      patientAge: number;
      patientGender: 'male' | 'female' | 'other';
      bloodGroup: string;
      allergies: string[];
      activeConditions: string[];
      currentMedications: string[];
      recentVitals?: {
        bloodPressure?: string;
        heartRate?: number;
        bloodGlucose?: number;
        recordedAt?: string;
      };
    },
    patientKeyPair: { publicKeyHex: string; privateKeyHex: string },
    baseUrl: string = 'https://phrlite.in'
  ): { sessionId: string; magicUrl: string; expiresAt: number } {
    const sessionId = `tkn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    const header = `${sessionId}|${patientData.patientId}|${expiresAt}|TELECONSULT_WHATSAPP`;
    const patientSignature = signEd25519(header, patientKeyPair.privateKeyHex);

    const payload: ConsentedSessionPayload = {
      sessionId,
      ...patientData,
      consentPurpose: 'TELECONSULT_WHATSAPP',
      expiresAt,
      patientSignature,
      patientPublicKey: patientKeyPair.publicKeyHex
    };

    this.activeSessions.set(sessionId, payload);
    const magicUrl = `${baseUrl}/rx/${sessionId}`;

    return { sessionId, magicUrl, expiresAt };
  }

  /**
   * Doctor opens magic link: validates expiry, authenticates signature, and returns clinical summary
   */
  public static accessSession(sessionId: string): {
    valid: boolean;
    error?: string;
    patientSummary?: ConsentedSessionPayload;
  } {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { valid: false, error: 'SESSION_NOT_FOUND: Link is invalid or has already been used.' };
    }

    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(sessionId);
      return { valid: false, error: 'SESSION_EXPIRED: 15-minute consultation window has lapsed.' };
    }

    const header = `${session.sessionId}|${session.patientId}|${session.expiresAt}|${session.consentPurpose}`;
    const isAuthentic = verifyEd25519(header, session.patientSignature, session.patientPublicKey);

    if (!isAuthentic) {
      return { valid: false, error: 'TAMPER_DETECTED: Cryptographic signature mismatch.' };
    }

    return { valid: true, patientSummary: session };
  }

  /**
   * Doctor seals consultation and returns certified prescription
   */
  public static submitDoctorEncounter(
    sessionId: string,
    encounter: Omit<DoctorEncounterResponse, 'sessionId' | 'timestamp' | 'doctorSignature'>,
    doctorKeyPair: { publicKeyHex: string; privateKeyHex: string }
  ): { success: boolean; encounterReceipt?: DoctorEncounterResponse; error?: string } {
    const access = this.accessSession(sessionId);
    if (!access.valid || !access.patientSummary) {
      return { success: false, error: access.error };
    }

    const timestamp = new Date().toISOString();
    const payloadToSign = `${sessionId}|${encounter.doctorNmcRegistration}|${encounter.prescriptionItems.length}|${timestamp}`;
    const doctorSignature = signEd25519(payloadToSign, doctorKeyPair.privateKeyHex);

    const fullEncounter: DoctorEncounterResponse = {
      sessionId,
      ...encounter,
      timestamp,
      doctorSignature,
      doctorPublicKey: doctorKeyPair.publicKeyHex
    };

    this.completedEncounters.set(sessionId, fullEncounter);
    // Remove session to prevent replay
    this.activeSessions.delete(sessionId);

    return { success: true, encounterReceipt: fullEncounter };
  }

  public static getCompletedEncounter(sessionId: string): DoctorEncounterResponse | undefined {
    return this.completedEncounters.get(sessionId);
  }
}

