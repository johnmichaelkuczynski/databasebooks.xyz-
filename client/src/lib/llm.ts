export type AnalysisResult = {
  quotes: string[];
  annotatedQuotes: { quote: string; context: string }[];
  summary: string;
  database: string;
  analyzer: string;
};

export async function analyzeText(
  text: string, 
  provider: string,
  functionType: 'quotes' | 'context' | 'rewrite' | 'database' | 'analyzer'
): Promise<AnalysisResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, provider, functionType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Analysis failed");
  }

  return response.json();
}

export async function analyzeTextStreaming(
  text: string,
  provider: string,
  functionType: 'quotes' | 'context' | 'rewrite' | 'database' | 'analyzer',
  onChunk: (chunk: string) => void,
  onComplete?: () => void
): Promise<void> {
  const response = await fetch("/api/analyze/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, provider, functionType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Analysis failed");
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
        
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.done) {
            onComplete?.();
            return;
          }
          if (parsed.content) {
            onChunk(parsed.content);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
        }
      }
    }
  }
  
  onComplete?.();
}
