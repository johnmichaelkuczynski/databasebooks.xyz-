export type AnalysisResult = {
  quotes: string[];
  annotatedQuotes: { quote: string; context: string }[];
  summary: string;
  database: string;
};

const SYSTEM_PROMPT = `You are an advanced Text Intelligence Engine. Your goal is to analyze the provided text and generate structured outputs strictly following these rules:

1. **QUOTES**: Extract the best quotations. Minimum of 3 quotes for every 600 words. Output as a simple list.
2. **ANNOTATED QUOTES**: Extract the same or different quotes with 1 sentence of context/commentary explaining their significance (e.g., "Kuczynski's critique of extensional logic...").
3. **REWRITE**: Compress each paragraph into no more than two sentences. Do NOT skip any paragraphs from the original text.
4. **DATABASE**: Generate a fine-grained text-file database representation of the document including: metadata (title, author, timestamp, word count), entities mentioned, key concepts/themes, structural map, and a detailed sentence index.

Output must be valid JSON with this exact schema:
{
  "quotes": ["quote 1", "quote 2", ...],
  "annotatedQuotes": [{"quote": "...", "context": "..."},  ...],
  "summary": "Full compressed text with each paragraph reduced to max 2 sentences...",
  "database": "Raw text format of database with metadata, entities, concepts, and sentence map..."
}`;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function calculateMinQuotes(text: string): number {
  const wordCount = countWords(text);
  return Math.max(3, Math.ceil((wordCount / 600) * 3));
}

async function callOpenAI(text: string, apiKey: string): Promise<AnalysisResult> {
  const minQuotes = calculateMinQuotes(text);
  const prompt = SYSTEM_PROMPT.replace("Minimum of 3 quotes", `Minimum of ${minQuotes} quotes`);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
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

async function callAnthropic(text: string, apiKey: string): Promise<AnalysisResult> {
  const minQuotes = calculateMinQuotes(text);
  const prompt = SYSTEM_PROMPT.replace("Minimum of 3 quotes", `Minimum of ${minQuotes} quotes`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: prompt,
      messages: [
        { role: "user", content: text }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Anthropic API Error");
  }

  const data = await response.json();
  const content = data.content[0].text;
  
  // Try to parse JSON, handle markdown code blocks
  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    throw new Error("Failed to parse Anthropic response");
  }
}

async function callGrok(text: string, apiKey: string): Promise<AnalysisResult> {
  const minQuotes = calculateMinQuotes(text);
  const prompt = SYSTEM_PROMPT.replace("Minimum of 3 quotes", `Minimum of ${minQuotes} quotes`);

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-beta",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text }
      ],
      temperature: 0
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Try to parse JSON, handle markdown code blocks
  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    throw new Error("Failed to parse Grok response");
  }
}

async function callPerplexity(text: string, apiKey: string): Promise<AnalysisResult> {
  const minQuotes = calculateMinQuotes(text);
  const prompt = SYSTEM_PROMPT.replace("Minimum of 3 quotes", `Minimum of ${minQuotes} quotes`);

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-large-128k-online",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Try to parse JSON, handle markdown code blocks
  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    throw new Error("Failed to parse Perplexity response");
  }
}

async function callDeepSeek(text: string, apiKey: string): Promise<AnalysisResult> {
  const minQuotes = calculateMinQuotes(text);
  const prompt = SYSTEM_PROMPT.replace("Minimum of 3 quotes", `Minimum of ${minQuotes} quotes`);

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Try to parse JSON
  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    throw new Error("Failed to parse DeepSeek response");
  }
}

export async function analyzeText(text: string, provider: string): Promise<AnalysisResult> {
  // Get API keys from environment variables (Replit Secrets)
  const apiKeys = {
    openai: process.env.OPENAI_API_KEY || "",
    anthropic: process.env.ANTHROPIC_API_KEY || "",
    grok: process.env.GROK_API_KEY || "",
    perplexity: process.env.PERPLEXITY_API_KEY || "",
    deepseek: process.env.DEEPSEEK_API_KEY || "",
  };

  switch (provider) {
    case "openai":
      if (!apiKeys.openai) throw new Error("OPENAI_API_KEY not configured in Replit Secrets");
      return callOpenAI(text, apiKeys.openai);
    
    case "anthropic":
      if (!apiKeys.anthropic) throw new Error("ANTHROPIC_API_KEY not configured in Replit Secrets");
      return callAnthropic(text, apiKeys.anthropic);
    
    case "grok":
      if (!apiKeys.grok) throw new Error("GROK_API_KEY not configured in Replit Secrets");
      return callGrok(text, apiKeys.grok);
    
    case "perplexity":
      if (!apiKeys.perplexity) throw new Error("PERPLEXITY_API_KEY not configured in Replit Secrets");
      return callPerplexity(text, apiKeys.perplexity);
    
    case "deepseek":
      if (!apiKeys.deepseek) throw new Error("DEEPSEEK_API_KEY not configured in Replit Secrets");
      return callDeepSeek(text, apiKeys.deepseek);
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
