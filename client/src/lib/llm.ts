
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

  // SIMULATION / DEMO MODE
  if (provider === "simulation") {
    // Return immediate mock data so the UI functions can be tested
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          quotes: [
            "The essence of knowledge lies not in its accumulation, but in its application to the novel structures of reality.",
            "Logic, when divorced from the chaotic nature of human experience, becomes a sterile tool of abstraction.",
            "Language frames our world, yet it is the silence between words where meaning truly resides."
          ],
          annotatedQuotes: [
            {
              quote: "The essence of knowledge lies not in its accumulation, but in its application to the novel structures of reality.",
              context: "Kuczynski's reflection on the limitations of traditional epistemology in the face of modern complexity."
            },
            {
              quote: "Logic, when divorced from the chaotic nature of human experience, becomes a sterile tool of abstraction.",
              context: "A critique of pure rationalism that fails to account for the phenomenological aspects of existence."
            },
            {
              quote: "Language frames our world, yet it is the silence between words where meaning truly resides.",
              context: "An exploration of the Wittgensteinian boundaries of expression and the ineffable."
            }
          ],
          summary: "The provided text delves into the philosophical intersection of logic and experience. It argues that while formal systems offer precision, they often miss the nuanced, chaotic texture of lived reality. The author suggests that a more robust framework must integrate the rigor of extensional logic with the fluidity of phenomenological insight. This synthesis is presented not as a rejection of structure, but as an evolution of it, necessary for comprehending the complexities of the modern human condition.",
          database: `ID: DOC-SIMULATION-001
TIMESTAMP: ${new Date().toISOString()}
TYPE: Philosophical Essay (Simulated)
LENGTH: ${text.split(/\s+/).length} words (estimated)
ENTITIES:
- Kuczynski (Author)
- Extensional Logic (Concept)
- Phenomenology (Concept)
- Epistemology (Field)
KEYWORDS: logic, structure, chaos, meaning, silence, application
SENTENCE_MAP:
[001] "The essence of knowledge..." (p.1, l.1)
[002] "Logic, when divorced..." (p.1, l.4)
[003] "Language frames..." (p.2, l.2)
METADATA_HASH: 7a9s8d7f9a8s7d9f8a7s`
        });
      }, 1500); // Small delay to feel "real"
    });
  }
  
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
