import { Express, Request } from "express";
import { createServer } from "http";
import { authenticateToken, validatePlaylist } from "./middleware";
import { getDB } from "./db";
import { generateToken, registerUser, loginUser } from "./auth";
import { userSchema } from "@shared/schema";
// import { ObjectId } from "mongodb";

// Extend Express Request to include user
declare module 'express' {
  interface Request {
    user?: {
      id: string;
    };
  }
}

export function registerRoutes(app: Express) {
  // Root endpoint for health check
  app.get("/", (_req, res) => {
    
    
    res.json({
      status: "OK",
      message: "API is running",
      version: "1.0.0",
      endpoints: {
        auth: ["/api/register", "/api/login"],
        playlists: [
          "/api/playlists",
          "/api/playlists/favorite",
          "/api/playlists/unfavorite/:id",
          "/api/playlists/favorites"
        ]
      }
    });
  });

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const { email, name, password } = req.body;
      if (!email || !name || !password) {
        return res.status(400).json({ message: "Email, name, and password are required" });
      }

      const user = await registerUser(email, name, password);
      const token = generateToken(user);
      res.json({ token });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await loginUser(email, password);
      const token = generateToken(user);
      res.json({ token });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Playlist routes - all require authentication
  app.get("/api/playlists", authenticateToken, async (req, res) => {
    try {
      const db = getDB();
      const playlists = await db.collection("playlists").find().toArray();
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ message: "Error fetching playlists" });
    }
  });

  app.post(
    "/api/playlists/favorite",
    authenticateToken,
    validatePlaylist,
    async (req: Request, res) => {
      try { 
        const db = getDB();
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id; // Use the authenticated user's ID directly
        const { playlistId, name, imageUrl, url, songCount } = req.body;

        // Validate playlistId
        // if (!ObjectId.isValid(playlistId)) {
        //   return res.status(400).json({ message: "Invalid playlist ID format" });
        // }

        const existing = await db
          .collection("favorites")
          .findOne({ 
            userId,
            playlistId
          });

        if (existing) {
          return res
            .status(400)
            .json({ message: "Playlist already in favorites" });
        }

        await db
          .collection("favorites")
          .insertOne({ 
            userId, // Store the userId as is (string)
            playlistId, // Convert playlistId to ObjectId
            name,
            imageUrl,
            url,
            songCount,
            createdAt: new Date() 
          });

        res.json({ message: "Added to favorites" });
      } catch (error) {
        res.status(500).json({ message: "Error adding to favorites" });
      }
    }
  );

  app.delete(
    "/api/playlists/unfavorite/:id",
    authenticateToken,
    async (req: Request, res) => {
      try {
        const db = getDB();
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const playlistId = req.params.id;

        const result = await db
          .collection("favorites")
          .deleteOne({ 
            userId,
            playlistId
          });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ message: "Playlist not found in favorites" });
        }

        res.json({ message: "Removed from favorites" });
      } catch (error) {
        res.status(500).json({ message: "Error removing from favorites" });
      }
    }
  );

  app.get("/api/playlists/favorites", authenticateToken, async (req: Request, res) => {
    try {
      const db = getDB();
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.id;

      const favorites = await db
        .collection("favorites")
        .find({ userId })
        .toArray();

      res.json(favorites.map(f => ({
        id: f.playlistId.toString(),
        name: f.name,
        url: f.url,
        imageUrl: f.imageUrl,
        songCount: f.songCount
      })));
    } catch (error) {
      res.status(500).json({ message: "Error fetching favorites" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}