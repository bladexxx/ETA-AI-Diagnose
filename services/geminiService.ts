

// FIX: Implemented the full Gemini service to resolve module not found errors and provide AI functionality.
import { GoogleGenAI, Type } from "@google/genai";
import type { Language, POLine, POLog, RiskAssessmentResult, JustificationCategory, CategorizedAnalysisResult } from '../types';

// Per instructions, API key is handled by the execution environment.
// It's assumed that a build tool (like Vite or Webpack) will replace process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash';


export const getRootCauseAnalysis = async (
    query: string,
    poLines: POLine[],
    poLogs: POLog[],
    vendor: string,
    language: Language
): Promise<CategorizedAnalysisResult | null> => {
    const systemInstruction = `You are a world-class supply chain analyst AI. Your task is to find the root cause of vendor performance issues based on Purchase Order (PO) data and change logs.

**Analysis & Formatting Rules:**
1.  **Response Format:** Your response MUST be a valid JSON object that adheres to the provided schema. Do not include any text outside of the JSON object.
2.  **Categorization:** Analyze the data and categorize each finding into one of two groups:
    *   'Vendor Issues': Problems originating from the supplier (e.g., shipping delays, production issues, repeated ETA push-outs).
    *   'Internal (EMT) Issues': Problems originating from our own systems or processes (e.g., data entry errors, frequent changes to PO quantities, unrealistic initial ETAs).
3.  **Summary:** Provide a concise, high-level summary of the overall situation in the 'summary' field.
4.  **Detailed Points:** For each category, provide specific, actionable findings as an array of markdown-formatted strings in the 'points' field.
    *   Start by stating the core issue, then provide one or two specific PO line examples that best illustrate that problem. Do NOT list all affected PO lines.
5.  **Context:** Today's date is ${new Date().toISOString().split('T')[0]}.
6.  **Language:** Generate the analysis in English. Translation will be handled by a separate process.`;


    const prompt = `
User Query: "${query}"

Vendor in Focus: ${vendor}

**Data:**

Open PO Lines:
${JSON.stringify(poLines, null, 2)}

PO Change Logs:
${JSON.stringify(poLogs, null, 2)}

Please provide your categorized root cause analysis in the specified JSON format.`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "A high-level summary of the findings." },
                        analysis: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    category: { type: Type.STRING, enum: ['Vendor Issues', 'Internal (EMT) Issues'] },
                                    points: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["category", "points"]
                            }
                        }
                    },
                    required: ["summary", "analysis"]
                }
            },
        });
        const jsonString = response.text;
        return JSON.parse(jsonString) as CategorizedAnalysisResult;
    } catch (error) {
        console.error("Error calling Gemini API or parsing response:", error);
        return null;
    }
};

export const translateText = async (
    analysis: CategorizedAnalysisResult,
    targetLanguage: Language
): Promise<CategorizedAnalysisResult | null> => {
    const languageName = targetLanguage === 'zh' ? 'Chinese' : 'English';
    const systemInstruction = `You are an expert translator. The user will provide a JSON object. Translate all user-facing string values ('summary' and all strings within the 'points' arrays) to ${languageName}. Maintain the original markdown formatting and the exact JSON structure. Only provide the translated JSON object as a response.`;
    
    const prompt = JSON.stringify(analysis, null, 2);
    
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                 responseSchema: { // Ensure the translated output also adheres to the schema
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        analysis: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    category: { type: Type.STRING, enum: ['Vendor Issues', 'Internal (EMT) Issues'] },
                                    points: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["category", "points"]
                            }
                        }
                    },
                    required: ["summary", "analysis"]
                }
            }
        });
        const jsonString = response.text;
        return JSON.parse(jsonString) as CategorizedAnalysisResult;
    } catch (error) {
        console.error("Error calling Gemini API for translation:", error);
        return null;
    }
};

export const getWhatIfSimulation = async (
    userPrompt: string,
    poLines: POLine[],
    language: Language
): Promise<string> => {
    const systemInstruction = `You are an expert supply chain simulation AI. Your task is to analyze the provided purchase order (PO) data and simulate the outcome based on the user's "what-if" scenario.
- Analyze the PO data provided in JSON format.
- Today's date is ${new Date().toISOString().split('T')[0]}.
- Calculate the impact of the user's proposed change.
- Clearly state which POs or vendors would be affected.
- Use markdown for formatting, including lists, bold text, and tables to present your findings.
- Respond in ${language === 'zh' ? 'Chinese' : 'English'}.`;

    const prompt = `
User's "What-If" Scenario: "${userPrompt}"

**Data:**

Open PO Lines:
${JSON.stringify(poLines, null, 2)}

Please run the simulation and report the results.`;

     try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "An error occurred while communicating with the AI service. Please check the console for details and try again later.";
    }
};

export const getRiskPrediction = async (
    poLines: POLine[],
    language: Language
): Promise<RiskAssessmentResult[]> => {
    const prompt = `Analyze the following open PO lines and identify those with a high or medium risk of future delays. Consider factors like existing past due status, high open quantities, and patterns across vendors. Return a JSON array of objects.

**Data:**
Open PO Lines:
${JSON.stringify(poLines, null, 2)}`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: `You are an expert supply chain risk assessment AI. Your task is to analyze the provided open purchase order (PO) data to predict which PO lines are at risk of future delays. Today's date is ${new Date().toISOString().split('T')[0]}. Respond ONLY with a JSON array that matches the provided schema. Provide justification in ${language === 'zh' ? 'Chinese' : 'English'}.`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            po_line_id: { type: Type.STRING },
                            risk_level: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                            justification: { type: Type.STRING }
                        },
                        required: ["po_line_id", "risk_level", "justification"]
                    }
                }
            },
        });
        
        const jsonString = response.text;
        return JSON.parse(jsonString) as RiskAssessmentResult[];
    } catch (error) {
        console.error("Error parsing JSON from Gemini API for risk prediction:", error);
        // On error, return an empty array so the UI can handle it gracefully.
        return [];
    }
};


export const categorizeJustifications = async (
  justifications: string[],
  language: Language
): Promise<JustificationCategory[]> => {
  const prompt = `Analyze this list of risk justifications. Group them into 3-5 high-level categories (e.g., "Severe Past Due", "Logistics Delays", "High Open Quantity"). For each category, provide a count of how many justifications fall into it.

**Justifications:**
${JSON.stringify(justifications)}
`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: `You are a text analysis AI. Your task is to categorize risk reasons. Respond ONLY with a JSON array that matches the provided schema. Provide category names in ${language === 'zh' ? 'Chinese' : 'English'}.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              count: { type: Type.INTEGER },
            },
            required: ['category', 'count'],
          },
        },
      },
    });

    const jsonString = response.text;
    return JSON.parse(jsonString) as JustificationCategory[];
  } catch (error) {
    console.error('Error categorizing justifications:', error);
    return [];
  }
};