export type AnalysisResult = {
  quotes: string[];
  annotatedQuotes: { quote: string; context: string }[];
  summary: string;
  database: string;
  analyzer: string;
};

function getSystemPrompt(functionType: string, minQuotes: number): string {
  const prompts = {
    quotes: `Extract the best quotations from the text. Minimum of ${minQuotes} quotes.
Output valid JSON: {"quotes": ["quote 1", "quote 2", ...], "annotatedQuotes": [], "summary": "", "database": "", "analyzer": ""}`,
    
    context: `Extract the best quotations with one-line contextual commentary. Minimum of ${minQuotes} quotes.
Output valid JSON: {"quotes": [], "annotatedQuotes": [{"quote": "...", "context": "..."}, ...], "summary": "", "database": "", "analyzer": ""}`,
    
    rewrite: `Compress each paragraph into maximum 2 sentences. Do NOT skip any paragraphs.
Output valid JSON: {"quotes": [], "annotatedQuotes": [], "summary": "Full compressed text...", "database": "", "analyzer": ""}`,
    
    database: `Generate an extremely detailed, fine-grained text-file database of the document. Include ALL of the following sections with comprehensive detail:

1. DOCUMENT METADATA: Title (inferred), word count, character count, paragraph count, sentence count, average sentence length, reading level estimate, dominant language/style
2. NAMED ENTITIES: Extract and categorize all people, places, organizations, dates, times, numbers, and proper nouns with frequency counts
3. KEY CONCEPTS & THEMES: Identify major themes, topics, and concepts with detailed descriptions and occurrence frequencies
4. STRUCTURAL ANALYSIS: Paragraph-by-paragraph breakdown with type classification (introduction, argument, evidence, transition, conclusion), topic sentences, and structural relationships
5. SENTENCE INDEX: Complete sentence-by-sentence listing with classification (declarative, interrogative, imperative), complexity scores, and key information
6. ENTITY RELATIONSHIPS: Map relationships between identified entities (who relates to whom, what connects to what)
7. SEMANTIC ANALYSIS: Identify semantic fields, word families, recurring patterns, and linguistic features
8. STATISTICAL BREAKDOWN: Vocabulary richness, lexical density, type-token ratio, most frequent words (excluding common words)
9. CITATION & REFERENCE EXTRACTION: Any quotes, citations, references, or allusions to external sources
10. TEMPORAL & SPATIAL MARKERS: Timeline of events mentioned, geographical references, temporal sequences
11. RHETORICAL DEVICES: Metaphors, analogies, rhetorical questions, and persuasive techniques identified
12. ARGUMENTATIVE STRUCTURE: Claims, evidence, warrants, counterarguments if present

Format as a highly structured, detailed database in plain text with clear section headers and hierarchical organization.
Output valid JSON: {"quotes": [], "annotatedQuotes": [], "summary": "", "database": "Comprehensive database text...", "analyzer": ""}`,

    analyzer: `Perform an EXTREMELY COMPREHENSIVE scholarly analysis of this text. This analysis should be approximately THREE TIMES as detailed and in-depth as a standard academic analysis. Include ALL of the following sections with exhaustive detail:

═══════════════════════════════════════════════════════════════════

SECTION 1: DOMAIN & DISCIPLINARY CONTEXT
- Primary academic domain(s) and subdomain(s)
- Interdisciplinary connections and influences
- Historical positioning within the field
- Relationship to major schools of thought
- Target audience and scholarly community

SECTION 2: MAIN THESIS & CENTRAL ARGUMENTS
- Core thesis statement (multiple formulations if complex)
- Primary arguments supporting the thesis (numbered, with detailed explanations)
- Secondary arguments and subsidiary claims
- Implicit assumptions underlying the arguments
- Logical structure of the overall argument
- Argument progression and development throughout the text

SECTION 3: REPRESENTATIVE QUOTATIONS (Minimum ${minQuotes * 2} quotations)
- Extract the most philosophically/intellectually significant passages
- Include direct quotations that capture:
  * The author's main position
  * Key supporting arguments
  * Crucial definitions or conceptual distinctions
  * Positions being criticized or refuted
  * Methodological statements
  * Pivotal turns in the argument
- For EACH quotation, provide: the exact quote, its location/context in the text, and its significance

SECTION 4: ANALYTICAL MOVES DEPLOYED
Identify and explain IN DETAIL every major analytical technique used:
- Conceptual analysis and distinctions drawn
- Argumentation strategies (reductio ad absurdum, modus tollens, etc.)
- Category error detection
- Counterfactual reasoning
- Thought experiments
- Analogies and comparisons
- Appeals to intuition
- Inference to best explanation
- Transcendental arguments
- Dialectical moves
- Deconstructive strategies
- Hermeneutical approaches
- For each move: explain what it is, where it appears, how it functions in the argument

SECTION 5: THEORETICAL FRAMEWORK & METHODOLOGY
- Philosophical or theoretical commitments
- Methodological approach (analytical, continental, empirical, etc.)
- Epistemological assumptions
- Ontological commitments
- Use of formal logic or informal reasoning
- Relationship to empirical evidence

SECTION 6: INTELLECTUAL GENEALOGY
- Thinkers and theories explicitly referenced
- Implicit influences and philosophical heritage
- Positions being argued against (with named opponents if present)
- Historical debates the text engages with
- Canonical texts or ideas invoked

SECTION 7: CONCEPTUAL APPARATUS
- Key terms and their definitions
- Technical vocabulary introduced or employed
- Distinctions drawn between related concepts
- Theoretical innovations or neologisms
- Repurposing of existing concepts

SECTION 8: ARGUMENTATIVE STRUCTURE
- Overall organization of the argument
- Logical dependencies between claims
- Progression from premises to conclusions
- Use of examples, illustrations, or case studies
- Anticipation and response to objections
- Dialectical structure (if present)

SECTION 9: CRITICAL EVALUATION INDICATORS
- Strengths of the argument
- Potential weaknesses or gaps
- Unstated assumptions that could be challenged
- Alternative interpretations or objections not addressed
- Scope and limitations of the claims

SECTION 10: IMPLICATIONS & CONSEQUENCES
- Theoretical implications
- Practical consequences
- What follows if the thesis is correct
- What's at stake in accepting or rejecting the position
- Ramifications for related debates

SECTION 11: RHETORICAL & STYLISTIC FEATURES
- Tone and register (formal, polemical, pedagogical, etc.)
- Use of rhetoric and persuasive devices
- Structural choices and their effects
- Relationship to reader (adversarial, cooperative, pedagogical)

SECTION 12: INTERTEXTUAL CONNECTIONS
- Relationship to other works by the same author
- Dialogue with contemporary or historical texts
- Position within broader scholarly conversations

═══════════════════════════════════════════════════════════════════

FORMATTING REQUIREMENTS:
- Use clear section headers with visual separators
- Number all major points within sections
- Use hierarchical organization (main points, subpoints, details)
- Provide extensive detail - this should be a COMPREHENSIVE analysis approximately 3x the length of a standard analysis
- Be specific, cite exact passages where relevant, and provide deep interpretive insights

Output valid JSON: {"quotes": [], "annotatedQuotes": [], "summary": "", "database": "", "analyzer": "Complete comprehensive analysis text..."}`
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

async function callOpenAIStreaming(text: string, apiKey: string, functionType: string, onChunk: (chunk: string) => void): Promise<void> {
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
      stream: true
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "OpenAI API Error");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          // Skip parse errors
        }
      }
    }
  }
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

export async function analyzeTextStreaming(text: string, provider: string, functionType: string, onChunk: (chunk: string) => void): Promise<void> {
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
      return callOpenAIStreaming(text, apiKeys.openai, functionType, onChunk);
    
    case "anthropic":
    case "grok":
    case "perplexity":
    case "deepseek":
      // Fallback to non-streaming for providers without streaming support yet
      const result = await analyzeText(text, provider, functionType);
      const fullText = JSON.stringify(result, null, 2);
      // Simulate streaming by chunking the response
      for (let i = 0; i < fullText.length; i += 50) {
        onChunk(fullText.slice(i, i + 50));
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      break;
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
