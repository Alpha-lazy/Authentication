import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth";

// Extend Express Request type to include user
declare module 'express' {
  interface Request {
    user?: {
      id: string;
    };
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

export function validatePlaylist(req: Request, res: Response, next: NextFunction) {
  const { name, url, songCount, imageUrl } = req.body;

  if (!name || !url || !songCount || !imageUrl) {
    return res.status(400).json({ message: "Missing required playlist fields (name, url, songCount, imageUrl)" });
  }

  next();
}