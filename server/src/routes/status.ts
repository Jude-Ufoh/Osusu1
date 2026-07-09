import { Router } from "express";
import { requireAuth, AuthedRequest } from "../auth";
import { db, getGroupState, Member } from "../db";
import { GROUP_SIZE } from "../config";

export const statusRouter = Router();

statusRouter.get("/status", requireAuth, (req: AuthedRequest, res) => {
  const registeredNames = (
    db.prepare("SELECT name FROM members ORDER BY id ASC").all() as unknown as { name: string }[]
  ).map((r) => r.name);
  const registeredCount = registeredNames.length;
  const groupState = getGroupState();
  const me = req.member as Member;

  if (registeredCount < GROUP_SIZE) {
    return res.json({
      stage: "waiting_for_registrations",
      registeredCount,
      groupSize: GROUP_SIZE,
      registeredNames,
    });
  }

  const umpireName = groupState.umpire_member_id
    ? (
        db.prepare("SELECT name FROM members WHERE id = ?").get(groupState.umpire_member_id) as unknown as
          | { name: string }
          | undefined
      )?.name
    : undefined;

  if (!groupState.assignment_done) {
    return res.json({
      stage: me.id === groupState.umpire_member_id ? "you_are_umpire" : "waiting_for_umpire",
      registeredCount,
      groupSize: GROUP_SIZE,
      registeredNames,
      umpireName,
    });
  }

  const positions = db
    .prepare("SELECT name, position, collection_status AS collectionStatus FROM members ORDER BY position ASC")
    .all();

  res.json({
    stage: "assigned",
    registeredCount,
    groupSize: GROUP_SIZE,
    registeredNames,
    umpireName,
    positions,
  });
});
