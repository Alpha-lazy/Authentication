import { Express, Request } from "express";
import { createServer } from "http";
import { authenticateToken, validatePlaylist } from "./middleware";
import { getDB } from "./db";
import { generateToken, registerUser, loginUser } from "./auth";
import { ObjectId } from "mongodb";

// Extend Express Request to include user
declare module 'express' {
  interface Request {
    user?: {
      id: string;
    };
  }
}

export function registerRoutes(app: Express) {
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

  // Playlist routes
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

        const userId = new ObjectId(req.user.id);
        const playlistId = new ObjectId(req.body.playlistId);
        const { name, imageUrl } = req.body;

        const existing = await db
          .collection("favorites")
          .findOne({ userId, playlistId });

        if (existing) {
          return res
            .status(400)
            .json({ message: "Playlist already in favorites" });
        }

        await db
          .collection("favorites")
          .insertOne({ 
            userId, 
            playlistId, 
            name,
            imageUrl,
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

        const userId = new ObjectId(req.user.id);
        const playlistId = new ObjectId(req.params.id);

        const result = await db
          .collection("favorites")
          .deleteOne({ userId, playlistId });

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

      const userId = new ObjectId(req.user.id);

      const favorites = await db
        .collection("favorites")
        .aggregate([
          { $match: { userId } },
          {
            $lookup: {
              from: "playlists",
              localField: "playlistId",
              foreignField: "_id",
              as: "playlist",
            },
          },
          { $unwind: "$playlist" },
        ])
        .toArray();

      res.json(favorites.map((f) => ({
        ...f.playlist,
        name: f.name,
        imageUrl: f.imageUrl
      })));
    } catch (error) {
      res.status(500).json({ message: "Error fetching favorites" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}