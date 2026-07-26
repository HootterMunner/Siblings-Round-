import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with larger limits for images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API to upload image directly to the public folder
  app.post("/api/upload-image", (req, res) => {
    const { image, chapterOrder, extension = "png" } = req.body;
    
    if (!image || chapterOrder === undefined) {
      return res.status(400).json({ error: "Missing image or chapterOrder" });
    }

    try {
      const folderPath = path.join(process.cwd(), "public", "image", `C${chapterOrder}`);
      
      // Create folder if it doesn't exist
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Determine the next index
      const files = fs.readdirSync(folderPath);
      let nextIndex = 1;
      
      const indices = files
        .filter(f => f.startsWith(`C${chapterOrder}.`))
        .map(f => {
          const parts = f.split(".");
          return parseInt(parts[1], 10);
        })
        .filter(n => !isNaN(n));
        
      if (indices.length > 0) {
        nextIndex = Math.max(...indices) + 1;
      }

      const fileName = `C${chapterOrder}.${nextIndex}.${extension}`;
      const filePath = path.join(folderPath, fileName);
      
      // Remove base64 prefix
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      
      fs.writeFileSync(filePath, base64Data, "base64");
      
      res.json({ success: true, url: `/image/C${chapterOrder}/${fileName}` });
    } catch (error) {
      console.error("Error saving image:", error);
      res.status(500).json({ error: "Failed to save image" });
    }
  });

  // API to list images and audio for a specific chapter
  app.get("/api/gallery/:chapterOrder", (req, res) => {
    const chapterOrder = req.params.chapterOrder;
    const result: { images: string[], audios: string[] } = { images: [], audios: [] };

    try {
      // 1. Get images from /public/image/C[Order]
      const imageFolder = path.join(process.cwd(), "public", "image", `C${chapterOrder}`);
      if (fs.existsSync(imageFolder)) {
        const files = fs.readdirSync(imageFolder);
        result.images = files
          .filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f))
          .map(f => `/image/C${chapterOrder}/${f}`);
      }

      // 2. Get audio from /public/audio/voice/ matching C[Order].*
      // Or if there's a folder, but user said /public/audio/voice/C0.1.mp3
      const audioFolder = path.join(process.cwd(), "public", "audio", "voice");
      if (fs.existsSync(audioFolder)) {
        const files = fs.readdirSync(audioFolder);
        result.audios = files
          .filter(f => f.startsWith(`C${chapterOrder}.`) && /\.(mp3|wav|ogg|m4a)$/i.test(f))
          .map(f => `/audio/voice/${f}`);
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error listing gallery media:", error);
      res.status(500).json({ error: "Failed to list media" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
