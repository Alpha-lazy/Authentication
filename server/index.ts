import express from "express";
import { registerRoutes } from "./routes";
import { connectDB } from "./db";
import cors from "cors";
const corsConfig ={
   origin:"*",
   credential:true,
   methods:["POST","GET","DELETE","PUT"]
}
const app = express();

// Basic middleware
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.options("",cors(corsConfig))
app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));



// API request middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
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
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(logLine);
    }
  });

  next();
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (status >= 500) {
    console.error('Server Error:', err);
  }

  res.status(status).json({ 
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Register API routes first
(async () => {
  try {
    await connectDB();
    const server = registerRoutes(app);

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
