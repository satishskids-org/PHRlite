import { PassportDatabase } from './db.ts';
import { 
  computeCommitHash, 
  signEd25519, 
  verifyEd25519 
} from './crypto.ts';
import type { 
  Commit, 
  AuthorIdentity, 
  CommitType, 
  FHIRBundle, 
  PassportMetadata 
} from './types.ts';

export class GitHealthPassport {
  public db: PassportDatabase;

  constructor(dbOrPath: PassportDatabase | string = ':memory:') {
    if (typeof dbOrPath === 'string') {
      this.db = new PassportDatabase(dbOrPath);
    } else {
      this.db = dbOrPath;
    }
  }

  /**
   * Initialize a new sovereign passport (genesis)
   */
  public static init(
    passportId: string,
    patientIdentifier: string,
    masterPublicKeyHex: string,
    dbPath: string = ':memory:'
  ): GitHealthPassport {
    const passport = new GitHealthPassport(dbPath);
    const metadata: PassportMetadata = {
      passportId,
      genesisTimestamp: new Date().toISOString(),
      patientIdentifier,
      masterPublicKeyHex,
      schemaVersion: '1.0.0'
    };
    passport.db.saveMetadata(metadata);
    return passport;
  }

  /**
   * Append a new cryptographically signed commit
   */
  public appendCommit(params: {
    author: AuthorIdentity;
    authorPrivateKeyHex: string;
    commitType: CommitType;
    summaryText: string;
    bundle: FHIRBundle;
    customTimestamp?: string;
  }): Commit {
    const head = this.db.getHeadCommit();
    const parentHash = head ? head.commitHash : null;
    const timestamp = params.customTimestamp || new Date().toISOString();

    const bundleJson = JSON.stringify(params.bundle);
    const commitHash = computeCommitHash(
      parentHash,
      timestamp,
      params.author.id,
      params.commitType,
      bundleJson
    );

    // Sign the commit hash with author's Ed25519 private key
    const signature = signEd25519(commitHash, params.authorPrivateKeyHex);

    const commit: Commit = {
      commitHash,
      parentHash,
      author: params.author,
      signature,
      timestamp,
      commitType: params.commitType,
      summaryText: params.summaryText,
      bundle: params.bundle
    };

    this.db.insertCommit(commit);
    return commit;
  }

  /**
   * Verify the integrity of the entire commit chain from genesis to head
   */
  public verifyChain(): { valid: boolean; error?: string; commitCount: number } {
    const commits = this.db.getAllCommits();
    if (commits.length === 0) {
      return { valid: true, commitCount: 0 };
    }

    let expectedParent: string | null = null;

    for (let i = 0; i < commits.length; i++) {
      const c = commits[i];

      // 1. Verify parent hash pointer
      if (c.parentHash !== expectedParent) {
        return { 
          valid: false, 
          error: `Broken chain at commit ${c.commitHash}: parent expected ${expectedParent}, got ${c.parentHash}`,
          commitCount: i 
        };
      }

      // 2. Re-compute commit hash
      const bundleJson = JSON.stringify(c.bundle);
      const computed = computeCommitHash(
        c.parentHash,
        c.timestamp,
        c.author.id,
        c.commitType,
        bundleJson
      );

      if (computed !== c.commitHash) {
        return { 
          valid: false, 
          error: `Tampered hash at commit ${c.commitHash}`,
          commitCount: i 
        };
      }

      // 3. Verify cryptographic Ed25519 signature
      const isSignatureValid = verifyEd25519(
        c.commitHash,
        c.signature,
        c.author.publicKeyHex
      );

      if (!isSignatureValid) {
        return { 
          valid: false, 
          error: `Invalid signature at commit ${c.commitHash} by author ${c.author.name}`,
          commitCount: i 
        };
      }

      expectedParent = c.commitHash;
    }

    return { valid: true, commitCount: commits.length };
  }

  /**
   * Compute a timeline diff between two commits
   */
  public diff(fromCommitHash: string | null, toCommitHash: string): {
    addedConditions: string[];
    addedMedications: string[];
    observationsRecorded: number;
    encountersCount: number;
  } {
    const commits = this.db.getAllCommits();
    const result = {
      addedConditions: [] as string[],
      addedMedications: [] as string[],
      observationsRecorded: 0,
      encountersCount: 0
    };

    let startCollecting = fromCommitHash === null;

    for (const c of commits) {
      if (!startCollecting) {
        if (c.commitHash === fromCommitHash) {
          startCollecting = true;
        }
        continue;
      }

      for (const entry of c.bundle.entry) {
        const res = entry.resource;
        if (res.resourceType === 'Condition') {
          result.addedConditions.push(res.code.text || 'Condition');
        } else if (res.resourceType === 'MedicationRequest') {
          result.addedMedications.push(`${res.medication} (${res.dosageInstruction})`);
        } else if (res.resourceType === 'Observation') {
          result.observationsRecorded++;
        } else if (res.resourceType === 'Encounter') {
          result.encountersCount++;
        }
      }

      if (c.commitHash === toCommitHash) {
        break;
      }
    }

    return result;
  }
}

export { GitHealthPassport as GitEngine };

