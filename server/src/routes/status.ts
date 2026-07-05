import { Router } from "express";
import { requireAuth, AuthedRequest } from "../auth";
import { db, getGroupState, Member } from "../db";
import { GROUP_SIZE } from "../config";

export const statusRouter = Router();

statusRouter.get("/status", requireAuth, (req: AuthedRequest, res) => {
  const registeredCount = (
    db.prepare("SELECT COUNT(*) AS c FROM members").get() as unknown as { c: number }
  ).c;
  const groupState = getGroupState();
  const me = req.member as Member;

  if (registeredCount < GROUP_SIZE) {
    return res.json({
      stage: "waiting_for_registrations",
      registeredCount,
      groupSize: GROUP_SIZE,
    });
  }

  if (!groupState.assignment_done) {
    return res.json({
      stage: me.id === groupState.umpire_member_id ? "you_are_umpire" : "waiting_for_umpire",
      registeredCount,
      groupSize: GROUP_SIZE,
    });
  }

  const positions = db
    .prepare("SELECT name, position FROM members ORDER BY position ASC")
    .all();

  res.json({
    stage: "assigned",
    registeredCount,
    groupSize: GROUP_SIZE,
    positions,
  });
});
