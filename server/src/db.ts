import { createClient } from "@libsql/client";
import path from "path";

const url = process.env.TURSO_DATABASE_URL ?? `file:${path.join(__dirname, "..", "osusu.db")}`;

export const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export interface Member {
  id: number;
  name: string;
  pin_hash: string;
  position: number | null;
  collection_status: string;
  created_at: string;
}

export interface GroupState {
  id: number;
  umpire_member_id: number | null;
  assignment_done: number;
  last_umpire_name: string | null;
}

export async function initDb(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pin_hash TEXT NOT NULL,
      position INTEGER,
      collection_status TEXT NOT NULL DEFAULT 'waiting',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS group_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      umpire_member_id INTEGER,
      assignment_done INTEGER NOT NULL DEFAULT 0,
      last_umpire_name TEXT
    )
  `);

  await db.execute(
    "INSERT OR IGNORE INTO group_state (id, umpire_member_id, assignment_done) VALUES (1, NULL, 0)",
  );

  try {
    await db.execute("ALTER TABLE members ADD COLUMN collection_status TEXT NOT NULL DEFAULT 'waiting'");
  } catch {
    // column already exists
  }
}

type SqlArgs = (string | number | boolean | null)[];

export interface Runner {
  run(sql: string, args?: SqlArgs): Promise<void>;
  get<T>(sql: string, args?: SqlArgs): Promise<T | undefined>;
  all<T>(sql: string, args?: SqlArgs): Promise<T[]>;
}

export const runner: Runner = {
  async run(sql, args = []) {
    await db.execute({ sql, args });
  },
  async get<T>(sql: string, args: SqlArgs = []) {
    const result = await db.execute({ sql, args });
    return result.rows[0] as unknown as T | undefined;
  },
  async all<T>(sql: string, args: SqlArgs = []) {
    const result = await db.execute({ sql, args });
    return result.rows as unknown as T[];
  },
};

export async function getGroupState(r: Runner = runner): Promise<GroupState> {
  return (await r.get<GroupState>("SELECT * FROM group_state WHERE id = 1")) as GroupState;
}

export async function inTransaction<T>(fn: (t: Runner) => Promise<T>): Promise<T> {
  const tx = await db.transaction("write");
  const txRunner: Runner = {
    async run(sql, args = []) {
      await tx.execute({ sql, args });
    },
    async get<U>(sql: string, args: SqlArgs = []) {
      const result = await tx.execute({ sql, args });
      return result.rows[0] as unknown as U | undefined;
    },
    async all<U>(sql: string, args: SqlArgs = []) {
      const result = await tx.execute({ sql, args });
      return result.rows as unknown as U[];
    },
  };
  try {
    const result = await fn(txRunner);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
