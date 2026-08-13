import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../prisma";

export interface AuthRequest extends Request {
  userId?: string;
  role?: string;
  email?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.nv_access || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status === "SUSPENDED") {
      return res.status(401).json({ error: "Account unavailable" });
    }
    req.userId = user.id;
    req.role = user.role;
    req.email = user.email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
