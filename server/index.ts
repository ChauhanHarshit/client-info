import express, { type Request, Response, NextFunction } from "express";
import cookieParser from 'cookie-parser';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testConnection } from "./db";
import path from "path";
import fs from "fs";
import { Logtail } from "@logtail/node";
// Initialize BetterStack Logtail logger (only in production)
let logtail: any = null;
if (process.env.LOGTAIL_TOKEN) {
  logtail = new Logtail(process.env.LOGTAIL_TOKEN);
  console.log("BetterStack Logtail logging initialized");
} else {
  console.log("BetterStack Logtail token not found - logging disabled");
}

// Override console methods to integrate with BetterStack logging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  const message = args.map(String).join(" ");
  if (logtail) logtail.info(message);
  originalConsoleLog(...args);
};

console.error = (...args) => {
  const message = args.map(String).join(" ");
  if (logtail) logtail.error(message);
  originalConsoleError(...args);
};

console.warn = (...args) => {
  const message = args.map(String).join(" ");
  if (logtail) logtail.warn(message);
  originalConsoleWarn(...args);
};

const app = express();
app.set("trust proxy", true);

// Health check endpoint
app.get("/health", (req, res) => {
  const healthData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };
  if (logtail) logtail.info("Health check accessed", healthData);
  res.status(200).json(healthData);
});

app.use((req, res, next) => {
  const host = req.get("host");
  if (host && (host === "tastyyyy.com" || host === "www.tastyyyy.com")) {
    res.set("X-Frame-Options", "SAMEORIGIN");
    res.set("X-Content-Type-Options", "nosniff");
  }
  next();
});

// Configure cookie parser for JWT authentication
app.use(cookieParser());

// Configure Express for large file uploads
app.use(express.json({ limit: "10gb" }));
app.use(express.urlencoded({ extended: false, limit: "10gb" }));

// Increase payload size limits for multipart/form-data uploads
app.use((req, res, next) => {
  // Set specific timeout for upload endpoints
  if (req.path.includes('/api/inspo-pages/') && req.path.includes('/content') && req.method === 'POST') {
    req.setTimeout(300000); // 5 minutes for content uploads
  }
  next();
});

// Serve uploaded files with proper headers for download and preview
app.use("/uploads", (req: Request, res: Response, next: NextFunction) => {
  // Get the file extension to determine content type
  const filePath = path.join(process.cwd(), 'uploads', req.path);
  const ext = path.extname(req.path).toLowerCase();
  
  // Set proper content type for PDFs to enable browser preview
  if (ext === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
  }
  
  // Enable CORS for file access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  next();
}, express.static("uploads"));

// Serve public files (like share background image) with proper headers
app.use(express.static("public", {
  setHeaders: (res, path) => {
    // Set proper content type for images
    if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    
    // Enable CORS for file access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}));

// Enhanced request logging middleware
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
    if (path.startsWith("/api")) {
      const logData = {
        method: req.method,
        path: path,
        statusCode: res.statusCode,
        duration: duration,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
        timestamp: new Date().toISOString(),
      };

      if (logtail) {
        if (res.statusCode >= 400) {
          logtail.error(`API Error: ${req.method} ${path}`, {
            ...logData,
            response: capturedJsonResponse,
          });
        } else {
          logtail.info(`API Request: ${req.method} ${path}`, logData);
        }
      }

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Skip database connection test to prevent startup hanging
  console.log("Skipping database connection test for faster startup...");
  // const dbConnected = await testConnection();
  // if (!dbConnected) {
  //   console.warn("Database connection test failed, but continuing server startup...");
  // } else {
  //   console.log("Database connection test successful");
  // }

  const server = await registerRoutes(app);
  
  // Configure server for large file uploads
  server.timeout = 300000; // 5 minutes timeout for large file uploads
  server.maxHeadersCount = 0; // No limit on headers for large uploads



  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    const errorData = {
      message,
      status,
      stack: err.stack,
      method: req.method,
      path: req.path,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };

    if (logtail) logtail.error("Server Error", errorData);

    console.error(`Server Error [${status}]: ${message}`, {
      path: req.path,
      method: req.method,
      stack: err.stack?.split("\n").slice(0, 3).join("\n"),
    });

    res.status(status).json({ message });
  });

  // Check environment for proper production/development handling
  const isProduction = process.env.NODE_ENV === "production";
  
  if (isProduction) {
    console.log("Production mode: serving static files");
    serveStatic(app);
  } else {
    console.log("Development mode: setting up Vite");
    
    // Add static asset serving for compiled assets in development
    const distPath = path.resolve(import.meta.dirname, "../dist/public");
    if (fs.existsSync(distPath)) {
      console.log("Development mode: serving compiled assets from", distPath);
      app.use(express.static(distPath));
    }
    
    await setupVite(app, server);
  }
  
  // Add SPA fallback for client-side routes (both development and production)
  if (!isProduction) {
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      // For all other routes, let the Vite middleware handle it
      next();
    });
  } else {
    // Production SPA fallback - add before serveStatic middleware
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      // Skip static assets (files with extensions except for client routes)
      if (req.path.includes('.') && 
          !req.path.endsWith('/') && 
          !req.path.includes('creatorlogin') && 
          !req.path.includes('login') &&
          !req.path.includes('creator-app-layout')) {
        return next();
      }
      
      // Let serveStatic middleware handle SPA routing
      next();
    });
  }
  
  // Add aggressive cache-busting headers for custom domain requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = req.get('host');
    if (host && (host.includes('tastyyyy.com') || host.includes('www.tastyyyy.com'))) {
      // Ultra-aggressive cache bypassing
      const timestamp = Date.now();
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date(timestamp).toUTCString(),
        'ETag': `"${timestamp}"`,
        'X-Cache-Bypass': 'true',
        'X-No-Cache': 'true',
        'X-Timestamp': timestamp.toString(),
        'Vary': '*',
        'CF-Cache-Status': 'BYPASS'
      });
    }
    next();
  });

  const port = 5000;
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    const startupData = {
      port,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      betterStackEnabled: !!logtail,
    };

    if (logtail) {
      logtail.info("Server started successfully", startupData);
    }

    log(`🚀 Server running on port ${port} (${startupData.environment})`);
    console.log(
      "✅ BetterStack logging:",
      startupData.betterStackEnabled ? "enabled" : "disabled",
    );
  });

  process.on("uncaughtException", (error) => {
    const errorData = {
      type: "uncaughtException",
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
    if (logtail) logtail.error("Uncaught Exception", errorData);
    console.error("💥 Uncaught Exception:", error);
    
    // For database connection errors, try to continue rather than crash
    if ((error as any).code === '57P01' || error.message.includes('terminating connection')) {
      console.log("Database connection error detected, continuing server operation...");
      return;
    }
    
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    const errorData = {
      type: "unhandledRejection",
      reason: reason,
      promise: promise,
      timestamp: new Date().toISOString(),
    };
    if (logtail) logtail.error("Unhandled Promise Rejection", errorData);
    console.error("💥 Unhandled Promise Rejection:", reason);
    
    // For database connection errors, try to continue rather than crash
    if (reason && ((reason as any).code === '57P01' || (reason as any).message?.includes('terminating connection'))) {
      console.log("Database connection rejection detected, continuing server operation...");
      return;
    }
    
    process.exit(1);
  });
})();
