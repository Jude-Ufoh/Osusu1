import { Router } from "express";
import { requireAuth, AuthedRequest } from "../auth";
import { db, getGroupState, inTransaction, Member } from "../db";
import { GROUP_SIZE } from "../config";

export const assignRouter = Router();

function shuffledPositions(count: number): number[] {
  const positions = Array.from({ length: count }, (_, i) => i + 1);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions;
}

assignRouter.post("/assign", requireAuth, (req: AuthedRequest, res) => {
  const me = req.member as Member;
  const groupState = getGroupState();

  const registeredCount = (
    db.prepare("SELECT COUNT(*) AS c FROM members").get() as unknown as { c: number }
  ).c;
  if (registeredCount < GROUP_SIZE) {
    return res.status(409).json({ error: "Not all 8 members have registered yet." });
  }

  if (groupState.umpire_member_id !== me.id) {
    return res.status(403).json({ error: "Only the umpire can run the assignment." });
  }

  const positions = inTransaction(() => {
    const state = getGroupState();
    if (!state.assignment_done) {
      const members = db.prepare("SELECT * FROM members").all() as unknown as Member[];
      const shuffled = shuffledPositions(members.length);
      const assignPosition = db.prepare("UPDATE members SET position = ? WHERE id = ?");
      members.forEach((member, i) => assignPosition.run(shuffled[i], member.id));
      db.prepare("UPDATE group_state SET assignment_done = 1 WHERE id = 1").run();
    }
    return db.prepare("SELECT name, position FROM members ORDER BY position ASC").all();
  });

  res.json({ positions });
});

assignRouter.post("/assign/swap", requireAuth, (req: AuthedRequest, res) => {
  const me = req.member as Member;
  const groupState = getGroupState();

  if (groupState.umpire_member_id !== me.id) {
    return res.status(403).json({ error: "Only the umpire can swap positions." });
  }

  if (!groupState.assignment_done) {
    return res.status(409).json({ error: "Assignment has not been done yet." });
  }

  const { name1, name2 } = req.body as { name1?: string; name2?: string };
  if (!name1 || !name2 || name1.toLowerCase() === name2.toLowerCase()) {
    return res.status(400).json({ error: "Provide two different member names to swap." });
  }

  try {
    const positions = inTransaction(() => {
      const m1 = db
        .prepare("SELECT id, position FROM members WHERE name = ? COLLATE NOCASE")
        .get(name1) as { id: number; position: number } | undefined;
      const m2 = db
        .prepare("SELECT id, position FROM members WHERE name = ? COLLATE NOCASE")
        .get(name2) as { id: number; position: number } | undefined;

      if (!m1 || !m2) throw Object.assign(new Error("Member not found."), { status: 404 });

      db.prepare("UPDATE members SET position = ? WHERE id = ?").run(m2.position, m1.id);
      db.prepare("UPDATE members SET position = ? WHERE id = ?").run(m1.position, m2.id);

      return db.prepare("SELECT name, position FROM members ORDER BY position ASC").all();
    });

    res.json({ positions });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.message ?? "Swap failed." });
  }
});
