import { Router } from "express";
import crypto from "crypto";
import { requireAuth, AuthedRequest } from "../auth";
import { db, getGroupState, inTransaction, Member } from "../db";
import { ADMIN_NAME } from "../config";

export const adminRouter = Router();

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

adminRouter.post("/admin/reset", requireAuth, (req: AuthedRequest, res) => {
  const me = req.member as Member;
  const { adminPassword } = req.body ?? {};

  if (me.name.toLowerCase() !== ADMIN_NAME) {
    return res.status(404).end();
  }
  if (typeof adminPassword !== "string" || !safeEquals(adminPassword, process.env.ADMIN_PASSWORD as string)) {
    return res.status(401).json({ error: "Incorrect admin password." });
  }

  inTransaction(() => {
    const state = getGroupState();
    const outgoingUmpire = state.umpire_member_id
      ? (db.prepare("SELECT name FROM members WHERE id = ?").get(state.umpire_member_id) as unknown as
          | { name: string }
          | undefined)
      : undefined;
    const lastUmpireName = outgoingUmpire?.name ?? state.last_umpire_name;

    db.prepare("DELETE FROM members").run();
    db.prepare(
      "UPDATE group_state SET umpire_member_id = NULL, assignment_done = 0, last_umpire_name = ? WHERE id = 1",
    ).run(lastUmpireName);
  });

  res.json({ message: "The cycle has been reset. Registration is open again." });
});
