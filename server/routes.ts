import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  const { analyzeText } = await import("./llm");

  app.post("/api/analyze", async (req, res) => {
    try {
      const { text, provider, functionType } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ 
          error: "Missing or invalid 'text' field in request body" 
        });
      }

      if (!provider || typeof provider !== "string") {
        return res.status(400).json({ 
          error: "Missing or invalid 'provider' field in request body" 
        });
      }

      if (!functionType || typeof functionType !== "string") {
        return res.status(400).json({ 
          error: "Missing or invalid 'functionType' field in request body" 
        });
      }

      const result = await analyzeText(text, provider, functionType);
      
      res.json(result);
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ 
        error: error.message || "Analysis failed" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
