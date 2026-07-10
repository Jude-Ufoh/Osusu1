import { Router } from "express";
import { requireAuth, AuthedRequest } from "../auth";
import { runner, getGroupState, inTransaction, Member } from "../db";
import { GROUP_SIZE, ADMIN_NAME } from "../config";

function canManageAssignment(me: Member, umpireMemberId: number | null): boolean {
  return me.id === umpireMemberId || me.name.toLowerCase() === ADMIN_NAME;
}

export const assignRouter = Router();

const POSITIONS_QUERY =
  "SELECT name, position, collection_status AS collectionStatus FROM members ORDER BY position ASC";

function shuffledPositions(count: number): number[] {
  const positions = Array.from({ length: count }, (_, i) => i + 1);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions;
}

assignRouter.post("/assign", requireAuth, async (req: AuthedRequest, res) => {
  const me = req.member as Member;
  const groupState = await getGroupState();

  const countRow = await runner.get<{ c: number }>("SELECT COUNT(*) AS c FROM members");
  const registeredCount = countRow?.c ?? 0;
  if (registeredCount < GROUP_SIZE) {
    return res.status(409).json({ error: "Not all 8 members have registered yet." });
  }

  if (groupState.umpire_member_id !== me.id) {
    return res.status(403).json({ error: "Only the umpire can run the assignment." });
  }

  const positions = await inTransaction(async (t) => {
    const state = await getGroupState(t);
    if (!state.assignment_done) {
      const members = await t.all<Member>("SELECT * FROM members");
      const shuffled = shuffledPositions(members.length);
      for (let i = 0; i < members.length; i++) {
        await t.run("UPDATE members SET position = ? WHERE id = ?", [shuffled[i], members[i].id]);
      }
      await t.run("UPDATE group_state SET assignment_done = 1 WHERE id = 1");
    }
    return t.all(POSITIONS_QUERY);
  });

  res.json({ positions });
});

assignRouter.post("/assign/swap", requireAuth, async (req: AuthedRequest, res) => {
  const me = req.member as Member;
  const groupState = await getGroupState();

  if (!canManageAssignment(me, groupState.umpire_member_id)) {
    return res.status(403).json({ error: "Only the umpire or admin can swap positions." });
  }

  if (!groupState.assignment_done) {
    return res.status(409).json({ error: "Assignment has not been done yet." });
  }

  const { name1, name2 } = req.body as { name1?: string; name2?: string };
  if (!name1 || !name2 || name1.toLowerCase() === name2.toLowerCase()) {
    return res.status(400).json({ error: "Provide two different member names to swap." });
  }

  try {
    const positions = await inTransaction(async (t) => {
      const m1 = await t.get<{ id: number; position: number }>(
        "SELECT id, position FROM members WHERE name = ? COLLATE NOCASE",
        [name1],
      );
      const m2 = await t.get<{ id: number; position: number }>(
        "SELECT id, position FROM members WHERE name = ? COLLATE NOCASE",
        [name2],
      );

      if (!m1 || !m2) throw Object.assign(new Error("Member not found."), { status: 404 });

      await t.run("UPDATE members SET position = ? WHERE id = ?", [m2.position, m1.id]);
      await t.run("UPDATE members SET position = ? WHERE id = ?", [m1.position, m2.id]);

      return t.all(POSITIONS_QUERY);
    });

    res.json({ positions });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.message ?? "Swap failed." });
  }
});

assignRouter.post("/assign/collection-status", requireAuth, async (req: AuthedRequest, res) => {
  const me = req.member as Member;
  const groupState = await getGroupState();

  if (!canManageAssignment(me, groupState.umpire_member_id)) {
    return res.status(403).json({ error: "Only the umpire or admin can update collection status." });
  }

  if (!groupState.assignment_done) {
    return res.status(409).json({ error: "Assignment has not been done yet." });
  }

  const { name, status } = req.body as { name?: string; status?: string };
  const VALID = ["waiting", "next", "collected"];
  if (!name || !status || !VALID.includes(status)) {
    return res
      .status(400)
      .json({ error: "Provide a valid member name and status (waiting/next/collected)." });
  }

  const target = await runner.get<{ id: number }>(
    "SELECT id FROM members WHERE name = ? COLLATE NOCASE",
    [name],
  );

  if (!target) {
    return res.status(404).json({ error: "Member not found." });
  }

  await runner.run("UPDATE members SET collection_status = ? WHERE id = ?", [status, target.id]);

  const positions = await runner.all(POSITIONS_QUERY);
  res.json({ positions });
});
