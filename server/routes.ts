import { Express, Request } from "express";
import { createServer } from "http";
import { authenticateToken, validatePlaylist } from "./middleware";
import { getDB } from "./db";
import { generateToken, registerUser, loginUser } from "./auth";
import { userSchema } from "@shared/schema";
// import { ObjectId } from "mongodb";

// Extend Express Request to include user
declare module "express" {
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
          "/api/playlists/favorites",
        ],
        cretePlaylist: [
          "/api/create/playlist",
          "/api/all/playlist",
          "/api/playlist/track:playlistId",
          "/api/remove/playlist:playlistId",
          "/api/playlists/add/songs:playlistId",
          "/api/playlists/remove/songs:playlistId",
          
        ],
      },
    });
  });

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const { email, name, password } = req.body;
      if (!email || !name || !password) {
        return res
          .status(400)
          .json({ message: "Email, name, and password are required" });
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
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const user = await loginUser(email, password);
      const token = generateToken(user);
      res.json({ token });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Create the privete playlist

  app.post(
    "/api/create/playlist",
    authenticateToken,
    async (req: Request, res) => {
      try {
        const db = getDB();
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;

        const { name,desc } = req.body;

        const newPlaylist = {
          playlistId: userId + Math.floor(Math.random() * 10000).toString(),
          userId,
          name,
          desc,
          songs:[],
        };
        await db.collection("playlists").insertOne(newPlaylist);
        res.status(200).json({message:"Playlist created successfully"});
      } catch (error) {
        res.status(500).json({ message: "Error to create playlist" });
      }
    }
  );

  // Get all private private playlist
  app.get(
    "/api/all/playlist",
    authenticateToken,
    async (req: Request, res) => {
      try {
        const db = getDB();
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;

       const playlist = await db.collection("playlists").find({
            userId      
       }).toArray()
        
      res.status(200).json({playlist})
      } catch (error) {
        res.status(500).json({ message: "Error to get playlist" });
      }
    }
  );

  // get one playlist 
  app.get(
    "/api/playlist/track:playlistId",
    authenticateToken,
    async (req: Request, res) => {
      try {
        const db = getDB();
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const playlistId = req.params.playlistId

       const playlist = await db.collection("playlists").find({
            userId,
            playlistId      
       }).toArray()
        
      res.status(200).json({playlist})
      } catch (error) {
        res.status(500).json({ message: "Error to get playlist" });
      }
    }
  );

  // delete private playlist

  app.delete('/api/remove/playlist:playlistId',
    authenticateToken,
    async (req: Request, res) => {
      const db = getDB();
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.id;
      const playlistId = req.params.playlistId
    await db.collection("playlists").deleteOne({
        userId,
        playlistId    
   })

   res.status(200).json({message:"Playlist deleted successfully"})

    })

    // add songs to private playlist

  app.post(
    "/api/playlists/add/songs:playlistId",
    authenticateToken,
    async (req: Request, res) => {
      try {
        const db = getDB();
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id; // Use the authenticated user's ID directly
        const playlistId = req.params.playlistId;
        const { songs  } = req.body;

        const data = await db.collection("playlists").findOne({
          userId,
          playlistId
        });

        await db
          .collection("playlists")
          .updateOne(
            { userId, playlistId },
            { $set: { songs: [...data?.songs, ...songs], name: "top 50" } },
            { upsert: true }
          );

        res.json({ message: "Song added successfully" });
      } catch (error) {
        console.log(error);

        res.status(500).json({ message: "Error to add song" });
      }
    }

  );

// remove songs from private playlist
  app.post(
    "/api/playlists/remove/songs:playlistId",
    authenticateToken,
    async (req: Request, res) => {
      try {
        const db = getDB();
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id; // Use the authenticated user's ID directly
        const playlistId = req.params.playlistId;
        const { songs } = req.body;

        const data = await db.collection("playlists").findOne({
          userId,
          playlistId,
        });
        if (data) {
          const index = data?.songs.indexOf(songs);
          
          if (index > -1) { // only splice array when item is found
            data?.songs.splice(index,1); // 2nd parameter means remove one item only
           
            await db
            .collection("playlists")
            .updateOne(
              { userId, playlistId },
              { $set: { songs:data?.songs, name: "top 50" } },
              { upsert: true }
            )

            
          }
          res.json({ message: "Song remove successfully" });
        }
       

      
      } catch (error) {
        console.log(error);

        res.status(500).json({ message: "Error to add song" });
      }
    }
  );

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

        const existing = await db.collection("favorites").findOne({
          userId: userId,
          playlistId: playlistId,
        });

        if (existing) {
          return res
            .status(400)
            .json({ message: "Playlist already in favorites" });
        }

        await db.collection("favorites").insertOne({
          userId, // Store the userId as is (string)
          playlistId, // Convert playlistId to ObjectId
          name,
          imageUrl,
          url,
          songCount,
          createdAt: new Date(),
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

        const result = await db.collection("favorites").deleteOne({
          userId,
          playlistId,
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

  app.get(
    "/api/playlists/favorites",
    authenticateToken,
    async (req: Request, res) => {
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

        res.json(
          favorites.map((f) => ({
            id: f.playlistId.toString(),
            name: f.name,
            url: f.url,
            imageUrl: f.imageUrl,
            songCount: f.songCount,
          }))
        );
      } catch (error) {
        res.status(500).json({ message: "Error fetching favorites" });
      }
    }
  );

  // Create playlist

  // POST /playlist

  const httpServer = createServer(app);
  return httpServer;
}
