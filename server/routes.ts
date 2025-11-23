import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  const { analyzeText, analyzeTextStreaming } = await import("./llm");

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

  app.post("/api/analyze/stream", async (req, res) => {
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

      // Set up SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      await analyzeTextStreaming(text, provider, functionType, (chunk: string) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Streaming analysis error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message || "Analysis failed" })}\n\n`);
      res.end();
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
