import { Router } from "express";
import bcrypt from "bcrypt";
import { db, inTransaction, Member } from "../db";
import { GROUP_SIZE } from "../config";

export const registerRouter = Router();

registerRouter.post("/register", async (req, res) => {
  const { name, pin } = req.body ?? {};

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Name is required." });
  }
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: "PIN must be exactly 4 digits." });
  }

  const currentCount = (db.prepare("SELECT COUNT(*) AS c FROM members").get() as unknown as {
    c: number;
  }).c;
  if (currentCount >= GROUP_SIZE) {
    return res.status(409).json({ error: "All 8 spots are already registered." });
  }

  const existing = db.prepare("SELECT id FROM members WHERE name = ?").get(name.trim());
  if (existing) {
    return res.status(409).json({ error: "That name is already registered." });
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const { total, umpireSelected } = inTransaction(() => {
    db.prepare("INSERT INTO members (name, pin_hash) VALUES (?, ?)").run(name.trim(), pinHash);

    const members = db.prepare("SELECT * FROM members").all() as unknown as Member[];
    let umpireSelected = false;

    if (members.length === GROUP_SIZE) {
      const chosen = members[Math.floor(Math.random() * members.length)];
      db.prepare("UPDATE group_state SET umpire_member_id = ? WHERE id = 1").run(chosen.id);
      umpireSelected = true;
    }

    return { total: members.length, umpireSelected };
  });

  res.status(201).json({
    message: `Welcome, ${name.trim()}! Your registration is complete.`,
    note:
      total < GROUP_SIZE
        ? "You will know your position when everyone has registered."
        : umpireSelected
          ? "All 8 members have registered. An umpire has been selected to assign positions."
          : undefined,
    registeredCount: total,
    groupSize: GROUP_SIZE,
  });
});
