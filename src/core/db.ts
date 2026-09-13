import { DatabaseSync } from 'node:sqlite';
import type { PassportMetadata, Commit } from './types.ts';

export class PassportDatabase {
  private db: DatabaseSync;

  constructor(filePath: string = ':memory:') {
    this.db = new DatabaseSync(filePath);
    this.initSchema();
  }

  private initSchema(): void {
    // Enable Write-Ahead Logging (WAL) for safety and concurrent read performance
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA page_size = 4096;

      CREATE TABLE IF NOT EXISTS passport_info (
        passport_id TEXT PRIMARY KEY,
        genesis_timestamp TEXT NOT NULL,
        patient_identifier TEXT NOT NULL,
        master_public_key TEXT NOT NULL,
        schema_version TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS commits (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        commit_hash TEXT UNIQUE NOT NULL,
        parent_hash TEXT,
        author_id TEXT NOT NULL,
        author_role TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_public_key TEXT NOT NULL,
        signature TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        commit_type TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        fhir_bundle_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS active_conditions (
        id TEXT PRIMARY KEY,
        commit_hash TEXT NOT NULL,
        code TEXT NOT NULL,
        display_name TEXT NOT NULL,
        onset_date TEXT,
        clinical_status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS active_medications (
        id TEXT PRIMARY KEY,
        commit_hash TEXT NOT NULL,
        drug_name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS allergies (
        id TEXT PRIMARY KEY,
        substance TEXT NOT NULL,
        reaction TEXT NOT NULL,
        criticality TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_commits_parent ON commits(parent_hash);
      CREATE INDEX IF NOT EXISTS idx_commits_timestamp ON commits(timestamp);
      CREATE INDEX IF NOT EXISTS idx_conditions_status ON active_conditions(clinical_status);
      CREATE INDEX IF NOT EXISTS idx_meds_status ON active_medications(status);
    `);
  }

  public saveMetadata(meta: PassportMetadata): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO passport_info 
      (passport_id, genesis_timestamp, patient_identifier, master_public_key, schema_version)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      meta.passportId,
      meta.genesisTimestamp,
      meta.patientIdentifier,
      meta.masterPublicKeyHex,
      meta.schemaVersion
    );
  }

  public getMetadata(): PassportMetadata | null {
    const stmt = this.db.prepare(`SELECT * FROM passport_info LIMIT 1`);
    const row = stmt.get() as any;
    if (!row) return null;
    return {
      passportId: row.passport_id,
      genesisTimestamp: row.genesis_timestamp,
      patientIdentifier: row.patient_identifier,
      masterPublicKeyHex: row.master_public_key,
      schemaVersion: row.schema_version
    };
  }

  public insertCommit(commit: Commit): void {
    const stmt = this.db.prepare(`
      INSERT INTO commits (
        commit_hash, parent_hash, author_id, author_role, author_name,
        author_public_key, signature, timestamp, commit_type, summary_text, fhir_bundle_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      commit.commitHash,
      commit.parentHash,
      commit.author.id,
      commit.author.role,
      commit.author.name,
      commit.author.publicKeyHex,
      commit.signature,
      commit.timestamp,
      commit.commitType,
      commit.summaryText,
      JSON.stringify(commit.bundle)
    );

    // Update index tables for fast 1-page clinical views
    for (const entry of commit.bundle.entry) {
      const res = entry.resource;
      if (res.resourceType === 'Condition') {
        const condStmt = this.db.prepare(`
          INSERT OR REPLACE INTO active_conditions (id, commit_hash, code, display_name, onset_date, clinical_status)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        condStmt.run(
          res.id,
          commit.commitHash,
          res.code.coding[0]?.code || 'UNKNOWN',
          res.code.text || res.code.coding[0]?.display || 'Condition',
          res.onsetDate || commit.timestamp,
          res.clinicalStatus
        );
      } else if (res.resourceType === 'MedicationRequest') {
        const medStmt = this.db.prepare(`
          INSERT OR REPLACE INTO active_medications (id, commit_hash, drug_name, dosage, status)
          VALUES (?, ?, ?, ?, ?)
        `);
        medStmt.run(
          res.id,
          commit.commitHash,
          res.medication,
          res.dosageInstruction,
          res.status
        );
      } else if (res.resourceType === 'AllergyIntolerance') {
        const algStmt = this.db.prepare(`
          INSERT OR REPLACE INTO allergies (id, substance, reaction, criticality)
          VALUES (?, ?, ?, ?)
        `);
        algStmt.run(
          res.id,
          res.substance,
          res.reaction,
          res.criticality
        );
      }
    }
  }

  public getAllCommits(): Commit[] {
    const stmt = this.db.prepare(`SELECT * FROM commits ORDER BY seq ASC`);
    const rows = stmt.all() as any[];
    return rows.map(r => ({
      commitHash: r.commit_hash,
      parentHash: r.parent_hash,
      author: {
        id: r.author_id,
        role: r.author_role,
        name: r.author_name,
        publicKeyHex: r.author_public_key
      },
      signature: r.signature,
      timestamp: r.timestamp,
      commitType: r.commit_type,
      summaryText: r.summary_text,
      bundle: JSON.parse(r.fhir_bundle_json)
    }));
  }

  public getHeadCommit(): Commit | null {
    const stmt = this.db.prepare(`SELECT * FROM commits ORDER BY seq DESC LIMIT 1`);
    const r = stmt.get() as any;
    if (!r) return null;
    return {
      commitHash: r.commit_hash,
      parentHash: r.parent_hash,
      author: {
        id: r.author_id,
        role: r.author_role,
        name: r.author_name,
        publicKeyHex: r.author_public_key
      },
      signature: r.signature,
      timestamp: r.timestamp,
      commitType: r.commit_type,
      summaryText: r.summary_text,
      bundle: JSON.parse(r.fhir_bundle_json)
    };
  }

  public getActiveConditions(): any[] {
    const stmt = this.db.prepare(`SELECT * FROM active_conditions WHERE clinical_status = 'active'`);
    return stmt.all();
  }

  public getActiveMedications(): any[] {
    const stmt = this.db.prepare(`SELECT * FROM active_medications WHERE status = 'active'`);
    return stmt.all();
  }

  public getAllergies(): any[] {
    const stmt = this.db.prepare(`SELECT * FROM allergies`);
    return stmt.all();
  }

  public close(): void {
    this.db.close();
  }
}
