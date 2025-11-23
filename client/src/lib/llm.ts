
import { useApiKeys } from "./store";

export type AnalysisResult = {
  quotes: string[];
  annotatedQuotes: { quote: string; context: string }[];
  summary: string;
  database: string;
};

const SYSTEM_PROMPT = `
You are an advanced Text Intelligence Engine. Your goal is to analyze the provided text and generate structured outputs strictly following these rules:

1. **QUOTES**: Extract the best quotations. Minimum of 3 quotes for every 600 words.
2. **ANNOTATED QUOTES**: Extract quotes with 1 sentence of context/commentary explaining their significance.
3. **REWRITE**: Compress each paragraph into no more than two sentences. Do NOT skip any paragraphs.
4. **DATABASE**: Generate a fine-grained text-file database representation of the document (Metadata, Entities, Key concepts, Sentence Map).

Output must be valid JSON with this schema:
{
  "quotes": ["quote 1", "quote 2"...],
  "annotatedQuotes": [{"quote": "...", "context": "..."}...],
  "summary": "Full compressed text...",
  "database": "Raw text format of database..."
}
`;

export async function analyzeText(text: string, provider: string): Promise<AnalysisResult> {
  const keys = useApiKeys.getState().keys;
  
  if (provider === "openai") {
    if (!keys.openai) throw new Error("OpenAI API Key missing");
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${keys.openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // or gpt-4-turbo
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "OpenAI API Error");
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }

  if (provider === "grok") {
      // Placeholder for Grok (xAI) - using OpenAI compatible endpoint structure if available
      // or throwing error if key missing
      if (!keys.grok) throw new Error("Grok API Key missing");
      
      // Assuming xAI uses an OpenAI-compatible endpoint for this mock:
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${keys.grok}`,
        },
        body: JSON.stringify({
          model: "grok-beta", 
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: text }
          ],
          stream: false 
        })
      });

      if (!response.ok) {
         throw new Error("Grok API Error - Check Key or CORS");
      }
      const data = await response.json();
      // Grok might not support JSON mode strictly yet, might need manual parsing
      // For now assuming it returns parseable JSON string
      try {
        return JSON.parse(data.choices[0].message.content);
      } catch (e) {
         // Fallback parser if it returns markdown block
         const content = data.choices[0].message.content;
         const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
         if (jsonMatch) return JSON.parse(jsonMatch[1] || jsonMatch[0]);
         throw new Error("Failed to parse Grok response");
      }
  }
  
  // Fallback for other providers or if implementation is missing
  throw new Error(`Provider ${provider} implementation requires backend proxy. Please use OpenAI for client-side testing.`);
}
