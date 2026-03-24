import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Import API handlers
import sendSmsAlertHandler from "./api/send-sms-alert.js";
import alertHandler from "./api/alert.js";
import sendAlertHandler from "./api/send-alert.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/send-sms-alert", async (req, res) => {
    try {
      await sendSmsAlertHandler(req, res);
    } catch (error) {
      console.error("API Error (/api/send-sms-alert):", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/alert", async (req, res) => {
    try {
      await alertHandler(req, res);
    } catch (error) {
      console.error("API Error (/api/alert):", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/send-alert", async (req, res) => {
    try {
      await sendAlertHandler(req, res);
    } catch (error) {
      console.error("API Error (/api/send-alert):", error);
      res.status(500).json({ error: "Internal Server Error" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
