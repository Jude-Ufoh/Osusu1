import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { runner, Member } from "./db";

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthedRequest extends Request {
  member?: Member;
}

export function issueToken(memberId: number): string {
  return jwt.sign({ memberId }, JWT_SECRET, { expiresIn: "30d" });
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { memberId: number };
    const member = await runner.get<Member>("SELECT * FROM members WHERE id = ?", [payload.memberId]);
    if (!member) {
      return res.status(401).json({ error: "Member no longer exists." });
    }
    req.member = member;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
