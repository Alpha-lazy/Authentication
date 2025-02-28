// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// server/auth.ts
import jwt from "jsonwebtoken";

// server/db.ts
import { MongoClient } from "mongodb";
var url = "mongodb+srv://anishmore712:Anish%402007@cluster0.rjjzy.mongodb.net/";
var dbName = "AlphaMusic";
var client;
async function connectDB() {
  try {
    client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");
    return client.db(dbName);
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    throw err;
  }
}
function getDB() {
  if (!client) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return client.db(dbName);
}

// server/auth.ts
import bcrypt from "bcryptjs";
var JWT_SECRET = "thisisalphamusicappitisanunofficialapp";
function generateToken(user) {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
async function registerUser(email, name, password) {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    const existingUser = await usersCollection.findOne({ email });
    if (password.length <= 6) {
      throw new Error("Password must be at least 6 character.");
    }
    if (existingUser) {
      throw new Error("User already exists");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = {
      email,
      name,
      password: hashedPassword,
      createdAt: /* @__PURE__ */ new Date()
    };
    const result = await usersCollection.insertOne(newUser);
    return { ...newUser, _id: result.insertedId, password: void 0 };
  } catch (error) {
    throw error;
  }
}
async function loginUser(email, password) {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email });
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }
    return { ...user, password: void 0 };
  } catch (error) {
    throw error;
  }
}

// server/middleware.ts
function authenticateToken(req, res, next) {
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
function validatePlaylist(req, res, next) {
  const { name, url: url2, songCount, imageUrl, playlistId } = req.body;
  if (!name || !url2 || !songCount || !imageUrl || !playlistId) {
    return res.status(400).json({ message: "Missing required playlist fields (name, url, songCount, imageUrl,playlistId)" });
  }
  next();
}

// server/routes.ts
function registerRoutes(app2) {
  app2.get("/", (_req, res) => {
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
        ],
        cretePlaylist: [
          "/api/create/playlist"
        ]
      }
    });
  });
  app2.post("/api/register", async (req, res) => {
    try {
      const { email, name, password } = req.body;
      if (!email || !name || !password) {
        return res.status(400).json({ message: "Email, name, and password are required" });
      }
      const user = await registerUser(email, name, password);
      const token = generateToken(user);
      res.json({ token });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await loginUser(email, password);
      const token = generateToken(user);
      res.json({ token });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.post("/api/create/playlist", authenticateToken, async (req, res) => {
    try {
      const db = getDB();
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.id;
      const { name } = req.body;
      const newPlaylist = {
        playlistId: Math.floor(Math.random() * 1e3),
        name,
        userId,
        songs: []
      };
      await db.collection("playlists").insertOne(newPlaylist);
      res.status(500).json("Playlist created successfully");
    } catch (error) {
      res.status(500).json({ message: "Error to create playlist" });
    }
  });
  app2.get("/api/playlists", authenticateToken, async (req, res) => {
    try {
      const db = getDB();
      const playlists = await db.collection("playlists").find().toArray();
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ message: "Error fetching playlists" });
    }
  });
  app2.post(
    "/api/playlists/favorite",
    authenticateToken,
    validatePlaylist,
    async (req, res) => {
      try {
        const db = getDB();
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const userId = req.user.id;
        const { playlistId, name, imageUrl, url: url2, songCount } = req.body;
        const existing = await db.collection("favorites").findOne({
          userId,
          playlistId
        });
        if (existing) {
          return res.status(400).json({ message: "Playlist already in favorites" });
        }
        await db.collection("favorites").insertOne({
          userId,
          // Store the userId as is (string)
          playlistId,
          // Convert playlistId to ObjectId
          name,
          imageUrl,
          url: url2,
          songCount,
          createdAt: /* @__PURE__ */ new Date()
        });
        res.json({ message: "Added to favorites" });
      } catch (error) {
        res.status(500).json({ message: "Error adding to favorites" });
      }
    }
  );
  app2.delete(
    "/api/playlists/unfavorite/:id",
    authenticateToken,
    async (req, res) => {
      try {
        const db = getDB();
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const userId = req.user.id;
        const playlistId = req.params.id;
        const result = await db.collection("favorites").deleteOne({
          userId,
          playlistId
        });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Playlist not found in favorites" });
        }
        res.json({ message: "Removed from favorites" });
      } catch (error) {
        res.status(500).json({ message: "Error removing from favorites" });
      }
    }
  );
  app2.get("/api/playlists/favorites", authenticateToken, async (req, res) => {
    try {
      const db = getDB();
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.id;
      const favorites = await db.collection("favorites").find({ userId }).toArray();
      res.json(favorites.map((f) => ({
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import cors from "cors";
var corsConfig = {
  origin: "*",
  credential: true,
  methods: ["POST", "GET", "DELETE", "PUT"]
};
var app = express();
app.options("", cors(corsConfig));
app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store");
  }
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") || path === "/") {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      console.log(logLine);
    }
  });
  next();
});
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  if (status >= 500) {
    console.error("Server Error:", err);
  }
  res.status(status).json({
    error: true,
    message,
    ...process.env.NODE_ENV === "development" ? { stack: err.stack } : {}
  });
});
(async () => {
  try {
    await connectDB();
    const server = registerRoutes(app);
    const PORT = Number(process.env.PORT) || 5e3;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
