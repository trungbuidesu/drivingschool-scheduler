
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeTrendsWithGemini = async (weeklyData: any): Promise<GeminiAnalysisResult> => {
  try {
    const prompt = `
      You are an expert data analyst for a driving school. 
      Analyze the following weekly session data (Format: {week: 'YYYY-Wxx', bookings: number, cancellations: number}).
      
      Tasks:
      1. Analyze booking trends, cancellation rates, and operational efficiency.
      2. FORECAST the number of bookings for the NEXT 4 weeks based on the historical trend.

      Data: ${JSON.stringify(weeklyData)}

      OUTPUT FORMAT:
      Return strictly a JSON object with the following schema (do not include markdown code blocks like \`\`\`json):
      {
        "analysisHtml": "A string containing HTML (using <h4>, <ul>, <li>, <p>) with your textual insights.",
        "forecast": [
            { "week": "The next 4 weeks following the last data point (e.g., 2024-W45)", "predictedBookings": number }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysisHtml: { type: Type.STRING },
            forecast: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  week: { type: Type.STRING },
                  predictedBookings: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text || "{}";
    // Simple cleanup just in case the model adds markdown despite instructions
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(cleanText) as GeminiAnalysisResult;

  } catch (error) {
    console.error("Error analyzing trends:", error);
    return {
        analysisHtml: "<p class='text-red-500'>Failed to analyze trends. Please try again later.</p>",
        forecast: []
    };
  }
};
