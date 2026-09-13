import { encryptZeroKnowledge, decryptZeroKnowledge } from '../core/crypto.ts';

export interface EncryptedCloudVault {
  passportId: string;
  ciphertextHex: string;
  ivHex: string;
  authTagHex: string;
  uploadedAt: string;
  blobSizeBytes: number;
}

export class CloudflareZeroKnowledgeRelay {
  private remoteBuckets: Map<string, EncryptedCloudVault> = new Map();

  /**
   * Verify Cloudflare Turnstile token (bot defense)
   */
  public verifyTurnstile(token: string): boolean {
    // In production, calls https://challenges.cloudflare.com/turnstile/v0/siteverify
    return token.length > 0 && !token.includes('invalid');
  }

  /**
   * Upload encrypted passport payload to Cloudflare R2 bucket
   * Cloudflare sees ONLY encrypted ciphertext
   */
  public uploadEncryptedVault(
    passportId: string,
    rawPassportData: string,
    clientMasterKeyHex: string,
    turnstileToken: string
  ): EncryptedCloudVault {
    if (!this.verifyTurnstile(turnstileToken)) {
      throw new Error('Cloudflare Turnstile bot verification failed.');
    }

    // Encrypt client-side BEFORE sending to cloud
    const encrypted = encryptZeroKnowledge(rawPassportData, clientMasterKeyHex);
    
    const vault: EncryptedCloudVault = {
      passportId,
      ciphertextHex: encrypted.ciphertextHex,
      ivHex: encrypted.ivHex,
      authTagHex: encrypted.authTagHex,
      uploadedAt: new Date().toISOString(),
      blobSizeBytes: Buffer.byteLength(encrypted.ciphertextHex, 'hex')
    };

    this.remoteBuckets.set(passportId, vault);
    return vault;
  }

  /**
   * Download and decrypt passport vault (client-side decrypt)
   */
  public downloadAndDecryptVault(
    passportId: string,
    clientMasterKeyHex: string
  ): string {
    const vault = this.remoteBuckets.get(passportId);
    if (!vault) {
      throw new Error(`Vault not found in R2 for passportId: ${passportId}`);
    }

    return decryptZeroKnowledge(
      vault.ciphertextHex,
      vault.ivHex,
      vault.authTagHex,
      clientMasterKeyHex
    );
  }

  public getVaultSizeBytes(passportId: string): number {
    const vault = this.remoteBuckets.get(passportId);
    return vault ? vault.blobSizeBytes : 0;
  }
}
