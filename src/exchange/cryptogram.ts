import crypto from 'node:crypto';
import type { 
  EncounterCryptogram, 
  FHIRCoverage 
} from '../core/types.ts';
import { 
  signEd25519, 
  verifyEd25519, 
  sha256 
} from '../core/crypto.ts';

// Cache to prevent replay attacks (in production backed by Redis / SQLite)
const seenNonces = new Set<string>();

/**
 * Generate canonical string representation of cryptogram for signing/verification
 */
export function canonicalCryptogramPayload(
  passportId: string,
  patientId: string,
  sessionNonce: string,
  timestamp: string,
  expiresAt: string,
  purpose: string,
  coverageSubscriberId: string = ''
): string {
  return [
    'PHR-UPI-v1',
    passportId,
    patientId,
    sessionNonce,
    timestamp,
    expiresAt,
    purpose,
    coverageSubscriberId
  ].join('|');
}

/**
 * Mint a dynamic, anti-replay Encounter Cryptogram on the patient's phone
 * Similar to an EMV Application Cryptogram (ARQC) or UPI Dynamic Intent QR.
 */
export function mintEncounterCryptogram(params: {
  passportId: string;
  patientId: string;
  patientPrivateKeyHex: string;
  patientPublicKeyHex: string;
  purpose?: 'OPD_CONSULT' | 'EMERGENCY' | 'PHARMACY' | 'LAB' | 'INPATIENT';
  validityMinutes?: number;
  coverage?: FHIRCoverage;
  scope?: 'SUMMARY_ONLY' | 'FULL_RECORDS';
}): EncounterCryptogram {
  const sessionNonce = crypto.randomBytes(16).toString('hex');
  const now = new Date();
  const timestamp = now.toISOString();
  
  const validityMinutes = params.validityMinutes ?? 30;
  const expiresAt = new Date(now.getTime() + validityMinutes * 60 * 1000).toISOString();
  const purpose = params.purpose ?? 'OPD_CONSULT';
  const scope = params.scope ?? 'SUMMARY_ONLY';

  const canonical = canonicalCryptogramPayload(
    params.passportId,
    params.patientId,
    sessionNonce,
    timestamp,
    expiresAt,
    purpose,
    params.coverage?.subscriberId ?? ''
  );

  const patientSignature = signEd25519(canonical, params.patientPrivateKeyHex);

  return {
    protocolVersion: 'PHR-UPI-v1',
    passportId: params.passportId,
    patientId: params.patientId,
    sessionNonce,
    timestamp,
    expiresAt,
    purpose,
    patientPublicKeyHex: params.patientPublicKeyHex,
    coverage: params.coverage,
    scope,
    patientSignature,
  };
}

export interface CryptogramValidationResult {
  valid: boolean;
  reason?: string;
  cryptogram?: EncounterCryptogram;
}

/**
 * Verify an incoming Encounter Cryptogram on the Provider / Clinic Terminal
 * Enforces:
 * 1. Protocol version adherence
 * 2. Time validity (reject expired tokens)
 * 3. Anti-replay verification (reject reused nonces)
 * 4. Ed25519 cryptographic signature verification
 */
export function verifyEncounterCryptogram(
  cryptogram: EncounterCryptogram,
  options: { allowClockSkewSeconds?: number } = {}
): CryptogramValidationResult {
  // 1. Check protocol version
  if (cryptogram.protocolVersion !== 'PHR-UPI-v1') {
    return { valid: false, reason: `Unsupported protocol version: ${cryptogram.protocolVersion}` };
  }

  // 2. Anti-Replay Check (Like EMV ATC / UPI transaction ID)
  if (seenNonces.has(cryptogram.sessionNonce)) {
    return { valid: false, reason: 'REPLAY_ATTACK_DETECTED: Session nonce has already been consumed' };
  }

  // 3. Expiration Check
  const nowMs = Date.now();
  const expiresMs = new Date(cryptogram.expiresAt).getTime();
  const clockSkewMs = (options.allowClockSkewSeconds ?? 60) * 1000;

  if (nowMs > expiresMs + clockSkewMs) {
    return { valid: false, reason: 'TOKEN_EXPIRED: Encounter cryptogram has exceeded its validity window' };
  }

  // 4. Ed25519 Signature Verification
  const canonical = canonicalCryptogramPayload(
    cryptogram.passportId,
    cryptogram.patientId,
    cryptogram.sessionNonce,
    cryptogram.timestamp,
    cryptogram.expiresAt,
    cryptogram.purpose,
    cryptogram.coverage?.subscriberId ?? ''
  );

  const signatureValid = verifyEd25519(
    canonical,
    cryptogram.patientSignature,
    cryptogram.patientPublicKeyHex
  );

  if (!signatureValid) {
    return { valid: false, reason: 'INVALID_SIGNATURE: Patient cryptographic signature verification failed' };
  }

  // Mark nonce as consumed
  seenNonces.add(cryptogram.sessionNonce);

  return {
    valid: true,
    cryptogram,
  };
}
