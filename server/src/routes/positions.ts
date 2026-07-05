import { Router } from "express";
import { requireAuth } from "../auth";
import { db, getGroupState } from "../db";

export const positionsRouter = Router();

positionsRouter.get("/positions", requireAuth, (_req, res) => {
  const groupState = getGroupState();
  if (!groupState.assignment_done) {
    return res.status(409).json({ error: "Positions have not been assigned yet." });
  }
  const positions = db
    .prepare("SELECT name, position FROM members ORDER BY position ASC")
    .all();
  res.json({ positions });
});
