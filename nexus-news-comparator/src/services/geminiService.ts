import { NewsAnalysisResult } from "../types";

export const analyzeNewsTopic = async (
  topic: string,
  domains: string[]
): Promise<NewsAnalysisResult> => {
  if (!topic) throw new Error("Topic is required");

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, domains }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to analyze topic");
  }

  const data = await response.json();
  return data as NewsAnalysisResult;
};
