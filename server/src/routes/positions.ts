import { Router } from "express";
import { requireAuth } from "../auth";
import { runner, getGroupState } from "../db";

export const positionsRouter = Router();

positionsRouter.get("/positions", requireAuth, async (_req, res) => {
  const groupState = await getGroupState();
  if (!groupState.assignment_done) {
    return res.status(409).json({ error: "Positions have not been assigned yet." });
  }
  const positions = await runner.all("SELECT name, position FROM members ORDER BY position ASC");
  res.json({ positions });
});
