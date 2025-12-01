import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  computeRawFeatures, 
  computeVerticalityScore, 
  getAbstractionLevel,
  buildSingleTextPrompt,
  buildComparisonPrompt,
  formatSingleTextReport,
  formatComparisonReport
} from "./stylometrics";

export async function registerRoutes(app: Express): Promise<Server> {
  const { analyzeText, analyzeTextStreaming, callLLM } = await import("./llm");

  app.post("/api/analyze", async (req, res) => {
    try {
      const { text, provider, functionType, username } = req.body;

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
      
      // Save to history if user is logged in
      if (username && typeof username === "string" && username.trim().length >= 2) {
        try {
          const cleanUsername = username.trim().toLowerCase();
          let user = await storage.getUserByUsername(cleanUsername);
          if (!user) {
            user = await storage.createUser({ username: cleanUsername });
          }
          
          const inputPreview = text.substring(0, 200) + (text.length > 200 ? "..." : "");
          
          await storage.createAnalysisHistory({
            userId: user.id,
            analysisType: functionType,
            provider: provider,
            inputPreview: inputPreview,
            outputData: result
          });
        } catch (saveError) {
          console.error("Failed to save to history:", saveError);
          // Don't fail the request if history save fails
        }
      }
      
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
      const { text, provider, functionType, username } = req.body;

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

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      let fullContent = '';
      await analyzeTextStreaming(text, provider, functionType, (chunk: string) => {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      });

      // Save to history if user is logged in
      if (username && typeof username === "string" && username.trim().length >= 2) {
        try {
          const cleanUsername = username.trim().toLowerCase();
          let user = await storage.getUserByUsername(cleanUsername);
          if (!user) {
            user = await storage.createUser({ username: cleanUsername });
          }
          
          const inputPreview = text.substring(0, 200) + (text.length > 200 ? "..." : "");
          
          // Structure the output data based on function type
          let outputData: any;
          try {
            outputData = JSON.parse(fullContent);
          } catch {
            // For text-based outputs, structure them properly based on type
            if (functionType === "analyzer") {
              outputData = { analyzer: fullContent };
            } else if (functionType === "database") {
              outputData = { database: fullContent };
            } else if (functionType === "rewrite") {
              outputData = { summary: fullContent };
            } else {
              outputData = { rawContent: fullContent };
            }
          }
          
          await storage.createAnalysisHistory({
            userId: user.id,
            analysisType: functionType,
            provider: provider,
            inputPreview: inputPreview,
            outputData: outputData
          });
        } catch (saveError) {
          console.error("Failed to save streaming result to history:", saveError);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Streaming analysis error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message || "Analysis failed" })}\n\n`);
      res.end();
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username } = req.body;

      if (!username || typeof username !== "string" || username.trim().length < 2) {
        return res.status(400).json({ 
          error: "Username must be at least 2 characters" 
        });
      }

      const cleanUsername = username.trim().toLowerCase();
      
      let user = await storage.getUserByUsername(cleanUsername);
      
      if (!user) {
        user = await storage.createUser({ username: cleanUsername });
      }
      
      res.json({ 
        success: true, 
        user: { id: user.id, username: user.username } 
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ 
        error: error.message || "Login failed" 
      });
    }
  });

  app.post("/api/stylometrics/analyze", async (req, res) => {
    try {
      const { username, authorName, sourceTitle, text, provider } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing text" });
      }

      if (!authorName || typeof authorName !== "string") {
        return res.status(400).json({ error: "Missing author name" });
      }

      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (wordCount < 400) {
        return res.status(400).json({ 
          error: `Text too short: ${wordCount} words. Minimum 400 words required.` 
        });
      }

      const rawFeatures = computeRawFeatures(text);
      const prompt = buildSingleTextPrompt(authorName, sourceTitle || '', text, rawFeatures);
      
      const llmResponse = await callLLM(provider || 'grok', prompt);
      
      let llmResult;
      try {
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          llmResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (e) {
        console.error("Failed to parse LLM response:", e);
        llmResult = {
          metaphorDensity: 'moderate',
          anecdoteFrequency: 'occasional',
          signaturePhrases: [],
          negativeMarkers: [],
          sampleSentences: [],
          psychologicalProfile: {},
          narrativeSummary: "Analysis could not be completed.",
          clustering: { veryCloseTo: [], moderatelyCloseTo: [], farFrom: [] }
        };
      }

      const verticalityScore = computeVerticalityScore(
        rawFeatures, 
        llmResult.metaphorDensity, 
        llmResult.anecdoteFrequency
      );
      llmResult.verticalityScore = verticalityScore;
      
      const abstraction = getAbstractionLevel(verticalityScore);
      llmResult.abstractionLevel = abstraction.level;
      llmResult.abstractionDescription = abstraction.description;

      const fullReport = formatSingleTextReport(authorName, sourceTitle || '', rawFeatures, llmResult);

      res.json({
        success: true,
        report: fullReport,
        data: {
          authorName,
          sourceTitle,
          wordCount: rawFeatures.wordCount,
          verticalityScore,
          abstractionLevel: abstraction.level,
          rawFeatures,
          ...llmResult
        }
      });
    } catch (error: any) {
      console.error("Stylometrics analysis error:", error);
      res.status(500).json({ 
        error: error.message || "Stylometric analysis failed" 
      });
    }
  });

  app.post("/api/stylometrics/analyze/stream", async (req, res) => {
    try {
      const { username, authorName, sourceTitle, text, provider } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing text" });
      }

      if (!authorName || typeof authorName !== "string") {
        return res.status(400).json({ error: "Missing author name" });
      }

      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (wordCount < 400) {
        return res.status(400).json({ 
          error: `Text too short: ${wordCount} words. Minimum 400 words required.` 
        });
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      const rawFeatures = computeRawFeatures(text);
      
      res.write(`data: ${JSON.stringify({ 
        type: 'features', 
        rawFeatures,
        message: 'Computing stylometric features...' 
      })}\n\n`);

      const prompt = buildSingleTextPrompt(authorName, sourceTitle || '', text, rawFeatures);
      
      const llmResponse = await callLLM(provider || 'grok', prompt);
      
      for (let i = 0; i < llmResponse.length; i += 100) {
        const chunk = llmResponse.slice(i, i + 100);
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      let llmResult;
      try {
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          llmResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found");
        }
      } catch (e) {
        llmResult = {
          metaphorDensity: 'moderate',
          anecdoteFrequency: 'occasional',
          signaturePhrases: [],
          negativeMarkers: [],
          sampleSentences: [],
          psychologicalProfile: {},
          narrativeSummary: "Analysis could not be completed.",
          clustering: { veryCloseTo: [], moderatelyCloseTo: [], farFrom: [] }
        };
      }

      const verticalityScore = computeVerticalityScore(
        rawFeatures, 
        llmResult.metaphorDensity, 
        llmResult.anecdoteFrequency
      );
      llmResult.verticalityScore = verticalityScore;
      
      const abstraction = getAbstractionLevel(verticalityScore);
      llmResult.abstractionLevel = abstraction.level;
      llmResult.abstractionDescription = abstraction.description;

      const fullReport = formatSingleTextReport(authorName, sourceTitle || '', rawFeatures, llmResult);

      res.write(`data: ${JSON.stringify({ 
        type: 'complete',
        report: fullReport,
        data: {
          authorName,
          sourceTitle,
          wordCount: rawFeatures.wordCount,
          verticalityScore,
          abstractionLevel: abstraction.level,
          abstractionDescription: abstraction.description,
          rawFeatures,
          metaphorDensity: llmResult.metaphorDensity,
          anecdoteFrequency: llmResult.anecdoteFrequency,
          signaturePhrases: llmResult.signaturePhrases,
          negativeMarkers: llmResult.negativeMarkers,
          sampleSentences: llmResult.sampleSentences,
          closestAuthorMatch: llmResult.closestAuthorMatch,
          matchExplanation: llmResult.matchExplanation,
          psychologicalProfile: llmResult.psychologicalProfile,
          narrativeSummary: llmResult.narrativeSummary,
          clustering: llmResult.clustering
        }
      })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Stylometrics streaming error:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  });

  app.post("/api/stylometrics/compare", async (req, res) => {
    try {
      const { username, textA, textB, provider } = req.body;

      if (!textA?.text || !textA?.authorName) {
        return res.status(400).json({ error: "Missing Text A" });
      }

      if (!textB?.text || !textB?.authorName) {
        return res.status(400).json({ error: "Missing Text B" });
      }

      const wordCountA = textA.text.split(/\s+/).filter(Boolean).length;
      const wordCountB = textB.text.split(/\s+/).filter(Boolean).length;
      
      if (wordCountA < 400 || wordCountB < 400) {
        return res.status(400).json({ 
          error: `Texts too short. Text A: ${wordCountA} words, Text B: ${wordCountB} words. Minimum 400 words each.` 
        });
      }

      const rawFeaturesA = computeRawFeatures(textA.text);
      const rawFeaturesB = computeRawFeatures(textB.text);

      const prompt = buildComparisonPrompt(
        { authorName: textA.authorName, text: textA.text, rawFeatures: rawFeaturesA },
        { authorName: textB.authorName, text: textB.text, rawFeatures: rawFeaturesB }
      );

      const llmResponse = await callLLM(provider || 'grok', prompt);
      
      let llmResult;
      try {
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          llmResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found");
        }
      } catch (e) {
        console.error("Failed to parse comparison response:", e);
        llmResult = {
          textA: { metaphorDensity: 'moderate', anecdoteFrequency: 'occasional' },
          textB: { metaphorDensity: 'moderate', anecdoteFrequency: 'occasional' },
          comparison: { keyDivergences: [], sameRoomScenario: '', collaborativePotential: '' },
          verdict: 'Comparison could not be completed.'
        };
      }

      if (llmResult.textA) {
        const scoreA = computeVerticalityScore(rawFeaturesA, llmResult.textA.metaphorDensity, llmResult.textA.anecdoteFrequency);
        llmResult.textA.verticalityScore = scoreA;
        const absA = getAbstractionLevel(scoreA);
        llmResult.textA.abstractionLevel = absA.level;
        llmResult.textA.abstractionDescription = absA.description;
      }
      
      if (llmResult.textB) {
        const scoreB = computeVerticalityScore(rawFeaturesB, llmResult.textB.metaphorDensity, llmResult.textB.anecdoteFrequency);
        llmResult.textB.verticalityScore = scoreB;
        const absB = getAbstractionLevel(scoreB);
        llmResult.textB.abstractionLevel = absB.level;
        llmResult.textB.abstractionDescription = absB.description;
      }

      if (llmResult.comparison) {
        llmResult.comparison.verticalityDifference = Math.abs(
          (llmResult.textA?.verticalityScore || 0) - (llmResult.textB?.verticalityScore || 0)
        );
      }

      const fullReport = formatComparisonReport(
        { authorName: textA.authorName, rawFeatures: rawFeaturesA },
        { authorName: textB.authorName, rawFeatures: rawFeaturesB },
        llmResult
      );

      res.json({
        success: true,
        report: fullReport,
        data: llmResult
      });
    } catch (error: any) {
      console.error("Comparison error:", error);
      res.status(500).json({ 
        error: error.message || "Comparison failed" 
      });
    }
  });

  app.post("/api/stylometrics/save", async (req, res) => {
    try {
      const { username, authorName, sourceTitle, data, fullReport } = req.body;

      if (!username || typeof username !== "string" || username.trim().length < 2) {
        return res.status(401).json({ error: "Login required to save profiles" });
      }

      if (!authorName || typeof authorName !== "string" || authorName.trim().length === 0) {
        return res.status(400).json({ error: "Author name required" });
      }

      const cleanUsername = username.trim().toLowerCase();
      let user = await storage.getUserByUsername(cleanUsername);
      if (!user) {
        user = await storage.createUser({ username: cleanUsername });
      }

      const existingAuthor = await storage.getStylometricAuthorByName(user.id, authorName.trim());
      
      const authorData = {
        userId: user.id,
        authorName,
        sourceTitle: sourceTitle || null,
        wordCount: data?.wordCount || null,
        verticalityScore: data?.verticalityScore?.toString() || null,
        rawFeatures: data?.rawFeatures || null,
        signaturePhrases: data?.signaturePhrases || null,
        negativeMarkers: data?.negativeMarkers || null,
        sampleSentences: data?.sampleSentences || null,
        closestAuthorMatch: data?.closestAuthorMatch || null,
        matchExplanation: data?.matchExplanation || null,
        psychologicalProfile: data?.psychologicalProfile || null,
        narrativeSummary: data?.narrativeSummary || null,
        clustering: data?.clustering || null,
        fullReport: fullReport || null
      };

      let savedAuthor;
      if (existingAuthor) {
        savedAuthor = await storage.updateStylometricAuthor(existingAuthor.id, authorData);
      } else {
        savedAuthor = await storage.createStylometricAuthor(authorData);
      }

      res.json({
        success: true,
        message: existingAuthor ? 'Author profile updated' : 'Author profile saved',
        author: savedAuthor
      });
    } catch (error: any) {
      console.error("Save error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to save author" 
      });
    }
  });

  app.get("/api/stylometrics/authors", async (req, res) => {
    try {
      const { username } = req.query;

      if (!username || typeof username !== "string") {
        return res.status(400).json({ error: "Username required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.json({ authors: [] });
      }

      const authors = await storage.getStylometricAuthors(user.id);
      res.json({ authors });
    } catch (error: any) {
      console.error("Get authors error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to get authors" 
      });
    }
  });

  app.get("/api/stylometrics/author/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const author = await storage.getStylometricAuthor(parseInt(id));
      
      if (!author) {
        return res.status(404).json({ error: "Author not found" });
      }

      res.json({ author });
    } catch (error: any) {
      console.error("Get author error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to get author" 
      });
    }
  });

  app.delete("/api/stylometrics/author/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStylometricAuthor(parseInt(id));
      res.json({ success: true, message: "Author deleted" });
    } catch (error: any) {
      console.error("Delete error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to delete author" 
      });
    }
  });

  app.get("/api/stylometrics/export", async (req, res) => {
    try {
      const { username } = req.query;

      if (!username || typeof username !== "string") {
        return res.status(400).json({ error: "Username required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.json({ authors: [] });
      }

      const authors = await storage.getStylometricAuthors(user.id);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="stylometric-database-${username}.json"`);
      res.json({
        exportedAt: new Date().toISOString(),
        username,
        authorCount: authors.length,
        authors
      });
    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ 
        error: error.message || "Export failed" 
      });
    }
  });

  // History API endpoints
  
  // Save partial results from multi-chunk processing
  app.post("/api/history/save-partial", async (req, res) => {
    try {
      const { username, analysisType, provider, inputPreview, outputData, chunksCompleted, totalChunks } = req.body;
      
      if (!username || typeof username !== "string") {
        return res.status(400).json({ error: "Username required" });
      }
      
      const cleanUsername = username.trim().toLowerCase();
      let user = await storage.getUserByUsername(cleanUsername);
      if (!user) {
        user = await storage.createUser({ username: cleanUsername });
      }
      
      // Add chunk progress info to the output
      const enrichedOutput = {
        ...outputData,
        _chunkProgress: {
          completed: chunksCompleted,
          total: totalChunks,
          partial: chunksCompleted < totalChunks
        }
      };
      
      await storage.createAnalysisHistory({
        userId: user.id,
        analysisType,
        provider,
        inputPreview: `[${chunksCompleted}/${totalChunks} chunks] ${inputPreview}`,
        outputData: enrichedOutput
      });
      
      res.json({ success: true, message: `Saved results for ${chunksCompleted}/${totalChunks} chunks` });
    } catch (error: any) {
      console.error("Save partial results error:", error);
      res.status(500).json({ error: error.message || "Failed to save partial results" });
    }
  });
  
  app.get("/api/history", async (req, res) => {
    try {
      const { username, type } = req.query;

      if (!username || typeof username !== "string") {
        return res.status(400).json({ error: "Username required" });
      }

      const user = await storage.getUserByUsername(username.trim().toLowerCase());
      if (!user) {
        return res.json({ history: [] });
      }

      let history;
      if (type && typeof type === "string") {
        history = await storage.getAnalysisHistoryByType(user.id, type);
      } else {
        history = await storage.getAnalysisHistory(user.id);
      }

      res.json({ history });
    } catch (error: any) {
      console.error("Get history error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to get history" 
      });
    }
  });

  app.get("/api/history/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { username } = req.query;
      
      if (!username || typeof username !== "string") {
        return res.status(401).json({ error: "Login required" });
      }
      
      const user = await storage.getUserByUsername(username.trim().toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const item = await storage.getAnalysisHistoryItem(parseInt(id));
      
      if (!item) {
        return res.status(404).json({ error: "History item not found" });
      }
      
      // Verify ownership
      if (item.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({ item });
    } catch (error: any) {
      console.error("Get history item error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to get history item" 
      });
    }
  });

  app.delete("/api/history/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { username } = req.query;
      
      if (!username || typeof username !== "string") {
        return res.status(401).json({ error: "Login required" });
      }
      
      const user = await storage.getUserByUsername(username.trim().toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const item = await storage.getAnalysisHistoryItem(parseInt(id));
      
      if (!item) {
        return res.status(404).json({ error: "History item not found" });
      }
      
      // Verify ownership
      if (item.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteAnalysisHistoryItem(parseInt(id));
      res.json({ success: true, message: "History item deleted" });
    } catch (error: any) {
      console.error("Delete history error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to delete history item" 
      });
    }
  });

  app.post("/api/intelligence", async (req, res) => {
    try {
      const { text, provider, username } = req.body;

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

      const wordCount = text.split(/\s+/).filter(Boolean).length;
      
      const prompt = `You are a ruthless literary critic with impossibly high standards. Your task is to extract ONLY the truly sharp, unmistakably brilliant lines from this text.

WHAT COUNTS AS SHARP (be EXTREMELY strict - most texts have 0-4 sharp quotes, almost never more than 10 per 1000 words):
- High insight-to-word ratio
- Unexpected reversal or pattern-break
- Elegant compression of a big idea
- Dry/dark wit that reveals deep understanding
- Precise distinction everyone else blurs
- Must feel like a "knife" — NEVER merely correct, eloquent, academic, or moralising

WHAT DOES NOT COUNT:
- Academic jargon or technical language (no matter how complex)
- Eloquent but conventional observations
- Moralistic statements or calls to action
- Summaries or transitions
- Standard scholarly claims or arguments
- Merely correct statements

CALIBRATION EXAMPLES (these are your eternal gold standard):

EXAMPLE 1: Academic dissertation abstract on transcendental empiricism → 0 sharp quotes (too academic/conventional)

EXAMPLE 2: "The reason psychopaths can pass lie detector tests is that psychopaths don't believe anything. So they don't have to lie." → SHARP (unexpected insight, knife-like)

EXAMPLE 3: "We built machines that sound like they know things. They don't. They weave patterns from what we've already said and sell it back to us as truth." → SHARP (brutal formulation)

EXAMPLE 4: "The Emperor's New Clothes, but the tailors are algorithms and we're all clapping." → SHARP (dark wit, pattern-break)

EXAMPLE 5: Academic explanation of Gareth Evans' theory → 0 sharp quotes (merely correct/scholarly)

EXAMPLE 6: "Double-think is possible because double-think is about not believing anything." → SHARP (elegant compression)

EXAMPLE 7: "Credibility is relational; truth is not." → SHARP (precise distinction)

EXAMPLE 8: Book blurb about philosophy ("This is a book about everything...") → 0 sharp quotes (promotional language)

Now analyze the following text. Extract ONLY the genuinely sharp quotes (most texts will have very few or none).

TEXT TO ANALYZE:
${text}

Respond with valid JSON only:
{
  "sharpQuotes": ["quote1", "quote2", ...],
  "analysis": "Brief explanation of why these quotes are sharp (or why none were found)"
}`;

      const result = await callLLM(provider, prompt);
      
      let parsed;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = { sharpQuotes: [], analysis: "Failed to parse response" };
        }
      } catch {
        parsed = { sharpQuotes: [], analysis: "Failed to parse response" };
      }

      const sharpQuotes = Array.isArray(parsed.sharpQuotes) ? parsed.sharpQuotes.filter((q: any) => typeof q === 'string' && q.trim()) : [];
      const density = wordCount > 0 ? (sharpQuotes.length * 1000) / wordCount : 0;
      
      let score: number;
      if (density <= 1) {
        score = Math.round(density * 30);
      } else if (density <= 3) {
        score = Math.round(30 + ((density - 1) / 2) * 35);
      } else if (density <= 6) {
        score = Math.round(65 + ((density - 3) / 3) * 25);
      } else {
        score = Math.min(100, Math.round(90 + ((density - 6) / 4) * 10));
      }

      const response = {
        wordCount,
        sharpQuotes,
        quoteCount: sharpQuotes.length,
        density: parseFloat(density.toFixed(2)),
        score,
        analysis: parsed.analysis || ""
      };

      if (username && typeof username === "string" && username.trim().length >= 2) {
        try {
          const cleanUsername = username.trim().toLowerCase();
          let user = await storage.getUserByUsername(cleanUsername);
          if (!user) {
            user = await storage.createUser({ username: cleanUsername });
          }
          
          const inputPreview = text.substring(0, 200) + (text.length > 200 ? "..." : "");
          
          await storage.createAnalysisHistory({
            userId: user.id,
            analysisType: "intelligence",
            provider: provider,
            inputPreview: inputPreview,
            outputData: response
          });
        } catch (saveError) {
          console.error("Failed to save to history:", saveError);
        }
      }

      res.json(response);
    } catch (error: any) {
      console.error("Intelligence analysis error:", error);
      res.status(500).json({ 
        error: error.message || "Intelligence analysis failed" 
      });
    }
  });

  app.post("/api/intelligence/compare", async (req, res) => {
    try {
      const { textA, textB, provider, username } = req.body;

      if (!textA || typeof textA !== "string" || !textB || typeof textB !== "string") {
        return res.status(400).json({ 
          error: "Missing or invalid text fields in request body" 
        });
      }

      if (!provider || typeof provider !== "string") {
        return res.status(400).json({ 
          error: "Missing or invalid 'provider' field in request body" 
        });
      }

      const wordCountA = textA.split(/\s+/).filter(Boolean).length;
      const wordCountB = textB.split(/\s+/).filter(Boolean).length;
      
      const prompt = `You are a ruthless literary critic with impossibly high standards. Your task is to extract ONLY the truly sharp, unmistakably brilliant lines from TWO texts and compare them.

WHAT COUNTS AS SHARP (be EXTREMELY strict):
- High insight-to-word ratio
- Unexpected reversal or pattern-break
- Elegant compression of a big idea
- Dry/dark wit that reveals deep understanding
- Precise distinction everyone else blurs
- Must feel like a "knife" — NEVER merely correct, eloquent, academic, or moralising

WHAT DOES NOT COUNT:
- Academic jargon (no matter how complex)
- Eloquent but conventional observations
- Moralistic statements
- Standard scholarly claims

TEXT A:
${textA}

---

TEXT B:
${textB}

Respond with valid JSON only:
{
  "textA": {
    "sharpQuotes": ["quote1", "quote2", ...],
    "analysis": "Brief explanation"
  },
  "textB": {
    "sharpQuotes": ["quote1", "quote2", ...],
    "analysis": "Brief explanation"
  },
  "verdict": "One-sentence comparative verdict"
}`;

      const result = await callLLM(provider, prompt);
      
      let parsed;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = { textA: { sharpQuotes: [], analysis: "" }, textB: { sharpQuotes: [], analysis: "" }, verdict: "" };
        }
      } catch {
        parsed = { textA: { sharpQuotes: [], analysis: "" }, textB: { sharpQuotes: [], analysis: "" }, verdict: "" };
      }

      const quotesA = Array.isArray(parsed.textA?.sharpQuotes) ? parsed.textA.sharpQuotes.filter((q: any) => typeof q === 'string' && q.trim()) : [];
      const quotesB = Array.isArray(parsed.textB?.sharpQuotes) ? parsed.textB.sharpQuotes.filter((q: any) => typeof q === 'string' && q.trim()) : [];
      
      const densityA = wordCountA > 0 ? (quotesA.length * 1000) / wordCountA : 0;
      const densityB = wordCountB > 0 ? (quotesB.length * 1000) / wordCountB : 0;
      
      const calculateScore = (density: number): number => {
        if (density <= 1) return Math.round(density * 30);
        if (density <= 3) return Math.round(30 + ((density - 1) / 2) * 35);
        if (density <= 6) return Math.round(65 + ((density - 3) / 3) * 25);
        return Math.min(100, Math.round(90 + ((density - 6) / 4) * 10));
      };

      const scoreA = calculateScore(densityA);
      const scoreB = calculateScore(densityB);
      
      let winner: string;
      const densityDiff = Math.abs(densityA - densityB);
      if (densityDiff <= 0.3) {
        winner = "Essentially equal";
      } else if (densityA > densityB) {
        winner = "Text A is sharper";
      } else {
        winner = "Text B is sharper";
      }

      const response = {
        textA: {
          wordCount: wordCountA,
          sharpQuotes: quotesA,
          quoteCount: quotesA.length,
          density: parseFloat(densityA.toFixed(2)),
          score: scoreA,
          analysis: parsed.textA?.analysis || ""
        },
        textB: {
          wordCount: wordCountB,
          sharpQuotes: quotesB,
          quoteCount: quotesB.length,
          density: parseFloat(densityB.toFixed(2)),
          score: scoreB,
          analysis: parsed.textB?.analysis || ""
        },
        winner,
        verdict: parsed.verdict || ""
      };

      if (username && typeof username === "string" && username.trim().length >= 2) {
        try {
          const cleanUsername = username.trim().toLowerCase();
          let user = await storage.getUserByUsername(cleanUsername);
          if (!user) {
            user = await storage.createUser({ username: cleanUsername });
          }
          
          const inputPreview = `Text A: ${textA.substring(0, 100)}... vs Text B: ${textB.substring(0, 100)}...`;
          
          await storage.createAnalysisHistory({
            userId: user.id,
            analysisType: "intelligence_compare",
            provider: provider,
            inputPreview: inputPreview,
            outputData: response
          });
        } catch (saveError) {
          console.error("Failed to save to history:", saveError);
        }
      }

      res.json(response);
    } catch (error: any) {
      console.error("Intelligence comparison error:", error);
      res.status(500).json({ 
        error: error.message || "Intelligence comparison failed" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
