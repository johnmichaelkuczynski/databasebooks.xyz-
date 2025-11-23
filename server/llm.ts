export type AnalysisResult = {
  quotes: string[];
  annotatedQuotes: { quote: string; context: string }[];
  summary: string;
  database: string;
};

function getSystemPrompt(functionType: string, minQuotes: number): string {
  const prompts = {
    quotes: `Extract the best quotations from the text. Minimum of ${minQuotes} quotes.
Output valid JSON: {"quotes": ["quote 1", "quote 2", ...], "annotatedQuotes": [], "summary": "", "database": ""}`,
    
    context: `Extract the best quotations with one-line contextual commentary. Minimum of ${minQuotes} quotes.
Output valid JSON: {"quotes": [], "annotatedQuotes": [{"quote": "...", "context": "..."}, ...], "summary": "", "database": ""}`,
    
    rewrite: `Compress each paragraph into maximum 2 sentences. Do NOT skip any paragraphs.
Output valid JSON: {"quotes": [], "annotatedQuotes": [], "summary": "Full compressed text...", "database": ""}`,
    
    database: `Generate a fine-grained text-file database of the document including: metadata, entities, key concepts, structural map, and sentence index.
Output valid JSON: {"quotes": [], "annotatedQuotes": [], "summary": "", "database": "Database text format..."}`
  };
  
  return prompts[functionType as keyof typeof prompts] || prompts.quotes;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function calculateMinQuotes(text: string): number {
  const wordCount = countWords(text);
  return Math.max(3, Math.ceil((wordCount / 600) * 3));
}

async function callOpenAI(text: string, apiKey: string, functionType: string): Promise<AnalysisResult> {
  const minQuotes = calculateMinQuotes(text);
  const prompt = getSystemPrompt(functionType, minQuotes);

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

async function callAnthropic(text: string, apiKey: string, functionType: string): Promise<AnalysisResult> {
  const minQuotes = calculateMinQuotes(text);
  const prompt = getSystemPrompt(functionType, minQuotes);

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

async function callGrok(text: string, apiKey: string, functionType: string): Promise<AnalysisResult> {
  const minQuotes = calculateMinQuotes(text);
  const prompt = getSystemPrompt(functionType, minQuotes);

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-2-latest",
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

async function callPerplexity(text: string, apiKey: string, functionType: string): Promise<AnalysisResult> {
  const minQuotes = calculateMinQuotes(text);
  const prompt = getSystemPrompt(functionType, minQuotes);

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

async function callDeepSeek(text: string, apiKey: string, functionType: string): Promise<AnalysisResult> {
  const minQuotes = calculateMinQuotes(text);
  const prompt = getSystemPrompt(functionType, minQuotes);

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

export async function analyzeText(text: string, provider: string, functionType: string): Promise<AnalysisResult> {
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
      return callOpenAI(text, apiKeys.openai, functionType);
    
    case "anthropic":
      if (!apiKeys.anthropic) throw new Error("ANTHROPIC_API_KEY not configured in Replit Secrets");
      return callAnthropic(text, apiKeys.anthropic, functionType);
    
    case "grok":
      if (!apiKeys.grok) throw new Error("GROK_API_KEY not configured in Replit Secrets");
      return callGrok(text, apiKeys.grok, functionType);
    
    case "perplexity":
      if (!apiKeys.perplexity) throw new Error("PERPLEXITY_API_KEY not configured in Replit Secrets");
      return callPerplexity(text, apiKeys.perplexity, functionType);
    
    case "deepseek":
      if (!apiKeys.deepseek) throw new Error("DEEPSEEK_API_KEY not configured in Replit Secrets");
      return callDeepSeek(text, apiKeys.deepseek, functionType);
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
