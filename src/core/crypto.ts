import crypto from 'node:crypto';

export interface KeyPairHex {
  publicKeyHex: string;
  privateKeyHex: string;
}

/**
 * Generate a new Ed25519 cryptographic keypair
 */
export function generateEd25519KeyPair(): KeyPairHex {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  // Export raw keys to hex
  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  // Raw Ed25519 public key is the last 32 bytes of the SPKI DER
  const pubRaw = pubDer.subarray(pubDer.length - 32);

  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });
  // Raw Ed25519 private key seed is the last 32 bytes of the PKCS8 DER
  const privRaw = privDer.subarray(privDer.length - 32);

  return {
    publicKeyHex: pubRaw.toString('hex'),
    privateKeyHex: privRaw.toString('hex'),
  };
}

/**
 * Sign a payload using an Ed25519 private key (hex)
 */
export function signEd25519(data: string, privateKeyHex: string): string {
  const privKeyDer = Buffer.concat([
    // PKCS#8 prefix for Ed25519 (16 bytes)
    Buffer.from('302e020100300506032b657004220420', 'hex'),
    Buffer.from(privateKeyHex, 'hex')
  ]);

  const privateKey = crypto.createPrivateKey({
    key: privKeyDer,
    format: 'der',
    type: 'pkcs8'
  });

  const signature = crypto.sign(null, Buffer.from(data, 'utf-8'), privateKey);
  return signature.toString('hex');
}

/**
 * Verify an Ed25519 signature
 */
export function verifyEd25519(data: string, signatureHex: string, publicKeyHex: string): boolean {
  try {
    const pubKeyDer = Buffer.concat([
      // SPKI prefix for Ed25519 (12 bytes)
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(publicKeyHex, 'hex')
    ]);

    const publicKey = crypto.createPublicKey({
      key: pubKeyDer,
      format: 'der',
      type: 'spki'
    });

    return crypto.verify(
      null,
      Buffer.from(data, 'utf-8'),
      publicKey,
      Buffer.from(signatureHex, 'hex')
    );
  } catch (err) {
    return false;
  }
}

/**
 * Calculate SHA-256 hash of a string
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf-8').digest('hex');
}

/**
 * Calculate canonical hash for a commit
 */
export function computeCommitHash(
  parentHash: string | null,
  timestamp: string,
  authorId: string,
  commitType: string,
  bundleJson: string
): string {
  const bundleHash = sha256(bundleJson);
  const canonicalPayload = [
    parentHash ?? 'GENESIS',
    timestamp,
    authorId,
    commitType,
    bundleHash
  ].join('::');
  return sha256(canonicalPayload);
}

/**
 * Zero-Knowledge AES-256-GCM Encryption
 * Encrypts a string/buffer using a secret key
 */
export function encryptZeroKnowledge(data: string, secretKeyHex: string): {
  ciphertextHex: string;
  ivHex: string;
  authTagHex: string;
} {
  const key = crypto.createHash('sha256').update(Buffer.from(secretKeyHex, 'hex')).digest();
  const iv = crypto.randomBytes(12); // 96-bit nonce for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(data, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    ciphertextHex: encrypted,
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex')
  };
}

/**
 * Zero-Knowledge AES-256-GCM Decryption
 */
export function decryptZeroKnowledge(
  ciphertextHex: string,
  ivHex: string,
  authTagHex: string,
  secretKeyHex: string
): string {
  const key = crypto.createHash('sha256').update(Buffer.from(secretKeyHex, 'hex')).digest();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}
