import { Router } from "express";
import bcrypt from "bcrypt";
import { db, Member } from "../db";
import { issueToken } from "../auth";
import { ADMIN_NAME } from "../config";

export const loginRouter = Router();

loginRouter.post("/login", async (req, res) => {
  const { name, pin } = req.body ?? {};

  if (typeof name !== "string" || typeof pin !== "string") {
    return res.status(400).json({ error: "Name and pin are required." });
  }

  const member = db.prepare("SELECT * FROM members WHERE name = ?").get(name.trim()) as unknown as
    | Member
    | undefined;

  if (!member || !(await bcrypt.compare(pin, member.pin_hash))) {
    return res.status(401).json({ error: "Name or PIN is incorrect." });
  }

  const groupState = db
    .prepare("SELECT umpire_member_id FROM group_state WHERE id = 1")
    .get() as unknown as {
    umpire_member_id: number | null;
  };

  res.json({
    token: issueToken(member.id),
    member: {
      id: member.id,
      name: member.name,
      isUmpire: groupState.umpire_member_id === member.id,
      isAdmin: member.name.toLowerCase() === ADMIN_NAME,
    },
  });
});
