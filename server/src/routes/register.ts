import { Router } from "express";
import bcrypt from "bcrypt";
import { db, getGroupState, inTransaction, Member } from "../db";
import { ADMIN_NAME, GROUP_SIZE } from "../config";

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

  const { total, umpireName } = inTransaction(() => {
    db.prepare("INSERT INTO members (name, pin_hash) VALUES (?, ?)").run(name.trim(), pinHash);

    const members = db.prepare("SELECT * FROM members").all() as unknown as Member[];
    let umpireName: string | undefined;

    if (members.length === GROUP_SIZE) {
      const state = getGroupState();
      const excludedNames = new Set(
        [ADMIN_NAME, state.last_umpire_name?.toLowerCase()].filter(Boolean) as string[],
      );
      const eligible = members.filter((m) => !excludedNames.has(m.name.toLowerCase()));
      const pool = eligible.length > 0 ? eligible : members.filter((m) => m.name.toLowerCase() !== ADMIN_NAME);
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      db.prepare("UPDATE group_state SET umpire_member_id = ? WHERE id = 1").run(chosen.id);
      umpireName = chosen.name;
    }

    return { total: members.length, umpireName };
  });

  res.status(201).json({
    message: `Welcome, ${name.trim()}! Your registration is complete.`,
    note:
      total < GROUP_SIZE
        ? "You will know your position when everyone has registered."
        : `Everybody has registered and ${umpireName} has been selected as the umpire. Ask them to log in and run the assignment.`,
    registeredCount: total,
    groupSize: GROUP_SIZE,
  });
});
