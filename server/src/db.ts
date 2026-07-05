import { DatabaseSync } from "node:sqlite";
import path from "path";

export const db = new DatabaseSync(path.join(__dirname, "..", "osusu.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pin_hash TEXT NOT NULL,
    position INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS group_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    umpire_member_id INTEGER,
    assignment_done INTEGER NOT NULL DEFAULT 0,
    last_umpire_name TEXT
  );

  INSERT OR IGNORE INTO group_state (id, umpire_member_id, assignment_done)
  VALUES (1, NULL, 0);
`);

export interface Member {
  id: number;
  name: string;
  pin_hash: string;
  position: number | null;
  created_at: string;
}

export interface GroupState {
  id: number;
  umpire_member_id: number | null;
  assignment_done: number;
  last_umpire_name: string | null;
}

export function getGroupState(): GroupState {
  return db.prepare("SELECT * FROM group_state WHERE id = 1").get() as unknown as GroupState;
}

export function inTransaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
