export type AnalysisResult = {
  quotes: string[];
  annotatedQuotes: { quote: string; context: string }[];
  summary: string;
  database: string;
};

export async function analyzeText(
  text: string, 
  provider: string,
  functionType: 'quotes' | 'context' | 'rewrite' | 'database'
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
