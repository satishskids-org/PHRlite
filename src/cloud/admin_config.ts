/**
 * PHRlite: Admin Configuration & Cryptographic Audit Console (Module 3)
 * 
 * Statutory Compliance:
 * - Digital Personal Data Protection (DPDP) Act 2023, Section 8 (Data Fiduciary Obligations)
 * - Information Technology (Reasonable Security Practices) Rules, 2011
 */

import { generateEd25519KeyPair, signEd25519 } from '../core/crypto.ts';

export interface AdminCredentialSet {
  abdmClientId: string;
  abdmClientSecretMasked: string;
  abdmEnvironment: 'sandbox' | 'production';
  cashfreeAppId: string;
  cashfreeSecretMasked: string;
  nhcxSwitchUrl: string;
  cloudflareR2Bucket: string;
  updatedAt: string;
}

export interface DpdpAuditLogEntry {
  logId: string;
  timestamp: string;
  actorPublicKeyOrId: string;
  actionType: 'CONSENT_GRANTED' | 'CONSENT_REVOKED' | 'RECORD_ACCESSED' | 'PRESCRIPTION_DISPENSED' | 'CLAIM_ADJUDICATED';
  purposeCode: string;
  consentArtifactId?: string;
  ipAddressMasked: string;
  tamperProofSignature: string;
}

export interface PartnerApiKey {
  keyId: string;
  partnerName: string;
  partnerType: 'HOSPITAL' | 'PHARMACY_ECOMMERCE' | 'INSURER' | 'EMPLOYER_HR';
  publicKey: string;
  secretKeyPrefix: string;
  createdAt: string;
  status: 'ACTIVE' | 'REVOKED';
}

export class AdminConsoleManager {
  private static credentials: AdminCredentialSet = {
    abdmClientId: 'SBX_PHRLITE_NHA_001',
    abdmClientSecretMasked: 'sec_live_••••••••••••8841',
    abdmEnvironment: 'sandbox',
    cashfreeAppId: 'CF_SANDBOX_88120',
    cashfreeSecretMasked: 'cf_sec_••••••••••••9910',
    nhcxSwitchUrl: 'https://sandbox.nhcx.abdm.gov.in/v1',
    cloudflareR2Bucket: 'phrlite-zero-knowledge-vaults',
    updatedAt: new Date().toISOString()
  };

  private static auditLogs: DpdpAuditLogEntry[] = [];
  private static partnerApiKeys: PartnerApiKey[] = [];
  private static auditSigningKeys = generateEd25519KeyPair();

  public static getCredentials(): AdminCredentialSet {
    return { ...this.credentials };
  }

  public static updateCredentials(updates: Partial<AdminCredentialSet>): AdminCredentialSet {
    this.credentials = {
      ...this.credentials,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return this.getCredentials();
  }

  /**
   * Records an immutable, tamper-proof DPDP compliance audit entry
   */
  public static logAudit(params: {
    actorId: string;
    actionType: DpdpAuditLogEntry['actionType'];
    purposeCode: string;
    consentArtifactId?: string;
  }): DpdpAuditLogEntry {
    const logId = `AUDIT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const timestamp = new Date().toISOString();
    const payload = `${logId}|${timestamp}|${params.actorId}|${params.actionType}|${params.purposeCode}`;
    const signature = signEd25519(payload, this.auditSigningKeys.privateKeyHex);

    const entry: DpdpAuditLogEntry = {
      logId,
      timestamp,
      actorPublicKeyOrId: params.actorId,
      actionType: params.actionType,
      purposeCode: params.purposeCode,
      consentArtifactId: params.consentArtifactId,
      ipAddressMasked: '103.21.***.***',
      tamperProofSignature: signature
    };

    this.auditLogs.unshift(entry); // Newest first
    return entry;
  }

  public static getAuditLogs(limit: number = 50): DpdpAuditLogEntry[] {
    return this.auditLogs.slice(0, limit);
  }

  /**
   * Issues scoped B2B API keys for hospitals, pharmacies (Tata 1mg), and insurers
   */
  public static issuePartnerApiKey(
    partnerName: string,
    partnerType: PartnerApiKey['partnerType']
  ): { apiKey: PartnerApiKey; rawSecretKey: string } {
    const keyId = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rawSecretKey = `sk_live_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
    const keys = generateEd25519KeyPair();

    const apiKey: PartnerApiKey = {
      keyId,
      partnerName,
      partnerType,
      publicKey: keys.publicKeyHex,
      secretKeyPrefix: rawSecretKey.substring(0, 12) + '••••••••',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };

    this.partnerApiKeys.push(apiKey);
    return { apiKey, rawSecretKey };
  }

  public static getPartnerApiKeys(): PartnerApiKey[] {
    return [...this.partnerApiKeys];
  }
}

