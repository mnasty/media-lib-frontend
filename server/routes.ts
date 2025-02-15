import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { videoMetadataSchema } from "@shared/schema";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/videos", async (req, res) => {
    const dirPath = req.query.path?.toString() || "";
    console.log(`Received request for videos in directory: ${dirPath}`);
    try {
      const videos = await storage.listDirectory(dirPath);
      console.log(`Sending response with ${videos.length} videos`);
      res.json(videos);
    } catch (error) {
      console.error('Error in /api/videos route:', error);
      res.status(500).json({ message: "Failed to list videos" });
    }
  });

  app.get("/api/videos/stream/:path(*)", async (req, res) => {
    const videoPath = req.params.path;
    const fullPath = path.join(process.env.MEDIA_DIR || "./media", videoPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "Video not found" });
    }

    const stat = fs.statSync(fullPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(fullPath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      });
      fs.createReadStream(fullPath).pipe(res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}