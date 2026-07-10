import { Router } from "express";
import { requireAuth, AuthedRequest } from "../auth";
import { runner, getGroupState, Member } from "../db";
import { GROUP_SIZE } from "../config";

export const statusRouter = Router();

statusRouter.get("/status", requireAuth, async (req: AuthedRequest, res) => {
  const registeredNames = (
    await runner.all<{ name: string }>("SELECT name FROM members ORDER BY id ASC")
  ).map((r) => r.name);
  const registeredCount = registeredNames.length;
  const groupState = await getGroupState();
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
        await runner.get<{ name: string }>("SELECT name FROM members WHERE id = ?", [
          groupState.umpire_member_id,
        ])
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

  const positions = await runner.all(
    "SELECT name, position, collection_status AS collectionStatus FROM members ORDER BY position ASC",
  );

  res.json({
    stage: "assigned",
    registeredCount,
    groupSize: GROUP_SIZE,
    registeredNames,
    umpireName,
    positions,
  });
});
