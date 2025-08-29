import { Express, Request } from "express";
import { createServer } from "http";
import { authenticateToken, validatePlaylist } from "./middleware";
import { getDB } from "./db";
import { generateToken, registerUser, loginUser } from "./auth";
import axios from 'axios';
import multer from 'multer'
const upload = multer({ storage: multer.memoryStorage() });

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

interface GeneratePlaylistRequest {
  prompt: string;
}

interface Song {
  title: string;
  artist: string;
  genre: string;
  language: string;
}

const MODELS = {
  TEXT_GENERATION: 'tiiuae/falcon-7b-instruct',
  MUSIC_RECOMMENDATION: 'sander-wood/spotify-recommendations'
};
const HUGGINGFACE_API_KEY = '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';
const MODEL_NAME = 'mistralai/Mixtral-8x7B-Instruct-v0.1';

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
          "/api/playlist:playlistId",
          "/api/get/playlists:songId",
          "/api/remove/playlist:playlistId",
          "/api/playlists/add/songs:playlistId",
          "/api/playlists/remove/songs:playlistId",
          "api/playlists/update/playlist:playlistId"
          
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

        const { name,desc,imageUrl } = req.body;

    

        if (imageUrl) {
          const newPlaylist = {
            playlistId: userId + Math.floor(Math.random() * 10000).toString(),
            userId,
            name,
            desc,
            imageUrl,
            songs:[],
          };
          await db.collection("playlists").insertOne(newPlaylist);
          res.status(200).json({message:"Playlist created successfully",playlistId:newPlaylist.playlistId});
        }

        else{
          const newPlaylist = {
            playlistId: userId + Math.floor(Math.random() * 10000).toString(),
            userId,
            name,
            desc,
            imageUrl:[],
            songs:[],
          };
          await db.collection("playlists").insertOne(newPlaylist);
          res.status(200).json({message:"Playlist created successfully",playlistId:newPlaylist.playlistId});
        }
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
    "/api/playlist:playlistId",
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

  // Get playlists by songs id 
  app.get(
    "/api/get/playlists:songId",
    authenticateToken,
    async (req: Request, res) => {
      try {
        const db = getDB();
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const songId = req.params.songId
        console.log(songId);
        

        if (!songId) {
          return res.status(400).json({ message: "Song ID is required" });
        }
        

       const playlist = await db.collection("playlists").find({
            userId,
            songs:songId      
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
        const { songs, imageUrl } = req.body;

        const data = await db.collection("playlists").findOne({
          userId,
          playlistId
        });
      
        console.log(imageUrl);
        
     if (imageUrl.length  < 4 ) {
      
      await db
      .collection("playlists")
      .updateOne(
        { userId, playlistId },
        { $set: { songs: [...data?.songs, ...songs],imageUrl:[...data?.imageUrl, ...imageUrl],} },
        { upsert: true }
      );

     }
     else{
        await db
          .collection("playlists")
          .updateOne(
            { userId, playlistId },
            { $set: { songs: [...data?.songs, ...songs],imageUrl:imageUrl} },
            { upsert: true }
          );
        }
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
        const { songs,imageUrl } = req.body;

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
              { $set: { songs:data?.songs,imageUrl:data?.imageUrl.filter((img: { id: string }) => img !== imageUrl)} },
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

  // update playlist info

  // app.post(
    
  //   "/api/playlists/update/playlist:playlistId",
  //   authenticateToken,
  //   upload.single("image"),
  //   async (req: Request, res) => {
  //     try {
  //       const db = getDB();
  //       if (!req.user) {
  //         return res.status(401).json({ message: "Unauthorized" });
  //       }

  //       const userId = req.user.id; // Use the authenticated user's ID directly
  //       const playlistId = req.params.playlistId;
  //       const { name, desc, imageUrl } = req.body || {};

  //       const data = await db.collection("playlists").findOne({
  //         userId,
  //         playlistId,
  //       });
  //       if (data) {
  //         // Build update object dynamically
  //         const updateFields: any = {};
  //         if (typeof name !== 'undefined') updateFields.name = name;
  //         if (typeof desc !== 'undefined') updateFields.desc = desc;
  //         if (typeof imageUrl !== 'undefined') updateFields.imageUrl = imageUrl;

  //         // If a file is uploaded, append its buffer to the imageUrl array
  //         if (req.file) {
  //           const currentImages = Array.isArray(data.imageUrl) ? data.imageUrl : [];
  //           updateFields.imageUrl = [...currentImages, req.file.buffer];
  //         }

  //         if (Object.keys(updateFields).length > 0) {
  //           await db
  //             .collection("playlists")
  //             .updateOne(
  //               { userId, playlistId },
  //               { $set: updateFields },
  //               { upsert: true }
  //             );
  //         }
  //         res.json({ message: "Playlist update successfully" });
  //       }
       

      
  //     } catch (error) {
  //       console.log(error);

  //       res.status(500).json({ message: "Error to update playlist" });
  //     }
  //   }
  // );

  app.post(
  "/api/playlists/update/playlist/:playlistId",  // <- small bug fix, you missed ":" before
  authenticateToken,
  upload.single("image"),
  async (req: Request, res) => {
    try {
      const db = getDB();
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.id;
      const playlistId = req.params.playlistId;
      const { name, desc, imageUrl } = req.body || {};

      const data = await db.collection("playlists").findOne({
        userId,
        playlistId,
      });

      if (!data) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      // Build update object dynamically
      const updateFields: any = {};
      if (typeof name !== "undefined") updateFields.name = name;
      if (typeof desc !== "undefined") updateFields.desc = desc;

      // Case 1: file uploaded → save its binary buffer
      if (req.file) {
        updateFields.imageUrl = [ req.file.buffer.toString('base64')]; // buffer stored
      }

      // Case 2: imageUrl sent in body → save it as a link
      if (imageUrl) {
        const currentImages = Array.isArray(data.imageUrl) ? data.imageUrl : [];
        updateFields.imageUrl = [...currentImages, imageUrl]; // link stored
      }

      if (Object.keys(updateFields).length > 0) {
        await db.collection("playlists").updateOne(
          { userId, playlistId },
          { $set: updateFields },
          { upsert: true }
        );
      }

      res.json({ message: "Playlist updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error updating playlist" });
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
        const { playlistId, name, imageUrl, url, songCount,type } = req.body;

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
          type,
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
            type: f.type
          }))
        );
      } catch (error) {
        res.status(500).json({ message: "Error fetching favorites" });
      }
    }
  );

  // Generate playlist

  app.post('/api/generate-playlist', async (req, res) => {
    const { prompt } = req.body;
  
    try {
      // Use FLAN-T5 model for better results
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${MODELS.TEXT_GENERATION}`,
        {
          inputs: `Generate 30 real songs for a playlist. Format exactly like this:
        "Lose Yourself by Eminem"
        "Eye of the Tiger by Survivor"
        "Stronger by Kanye West"
        Prompt: ${prompt}`,
          parameters: {
            max_length: 100,
            truncation: true,
            padding: 'max_length',
            batch_size: 1  // Ensure batch size is 1
          }
        },
        {
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      // Parse the response
      const generatedText = response.data.generated_text;
      const tracks = generatedText
        // .filter(line => line.trim())
        // .slice(0, 5) // Get first 5 items
        // .map((line, index) => {
        //   const match = line.match(/"?(.+?) by (.+?)"?$/);
        //   return match ? { 
        //     title: match[1].trim(), 
        //     artist: match[2].trim() 
        //   } : null;
        // })
        // .filter(Boolean);
  console.log(response);
  
      res.json({ playlist: tracks });
    } catch (err) {
      const error = err as {
        response?: {
          data?: {
            error?: string | string[];
          };
          status?: number;
        };
        message?: string;
      };
      console.error('Hugging Face Error:', error.response?.data || error.message);
    
      // Handle specific Hugging Face errors
      const hfError = error.response?.data?.error || [];
      const errorMessage = hfError || 'Failed to generate playlist';
      
      res.status(500).json({ 
        error: errorMessage,
        solution: errorMessage.includes('permissions') 
          ? 'Accept model terms at https://huggingface.co/google/flan-t5-xxl' 
          : undefined
      });
    }
  });


  
  const httpServer = createServer(app);
  return httpServer;
}