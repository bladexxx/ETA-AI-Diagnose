// FIX: Implemented the full Gemini service to resolve module not found errors and provide AI functionality.
import { GoogleGenAI, Type } from "@google/genai";
import type { Language, POLine, POLog, RiskAssessmentResult, JustificationCategory, CategorizedAnalysisResult } from '../types';

// --- AI Gateway Configuration ---
const AI_GATEWAY_URL = process.env.VITE_AI_GATEWAY_URL;
const AI_GATEWAY_API_KEY = process.env.VITE_AI_GATEWAY_API_KEY;
const AI_GATEWAY_MODEL = process.env.VITE_AI_GATEWAY_MODEL;
const IS_GATEWAY_CONFIGURED = AI_GATEWAY_URL && AI_GATEWAY_API_KEY && AI_GATEWAY_MODEL;

// --- Original Gemini Client (Fallback) ---
const GEMINI_API_KEY = process.env.API_KEY;
const IS_GEMINI_CONFIGURED = !!GEMINI_API_KEY;

// --- Configuration Sanity Check ---
if (!IS_GATEWAY_CONFIGURED && !IS_GEMINI_CONFIGURED) {
  const errorMessage = "AI provider not configured. Please set either VITE_AI_GATEWAY_* variables for the AI Gateway, or the API_KEY environment variable for direct Gemini access.";
  // Display error in the UI to make it obvious for the user
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `<div style="position: absolute; top: 1rem; left: 1rem; right: 1rem; padding: 1.5rem; color: #fecaca; background-color: #7f1d1d; border: 1px solid #dc2626; border-radius: 8px; font-family: monospace; z-index: 9999;">
        <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;">Configuration Error</h2>
        <p>${errorMessage}</p>
      </div>`;
    }
  });
  throw new Error(errorMessage);
}


const GEMINI_MODEL = 'gemini-2.5-flash';
// Conditionally initialize the Gemini client to prevent errors if the key is missing (and gateway is used).
const ai = IS_GEMINI_CONFIGURED ? new GoogleGenAI({ apiKey: GEMINI_API_KEY! }) : null;


/**
 * A generic function to call the custom AI Gateway which mimics the OpenAI API.
 * This is used when gateway environment variables are provided.
 */
const callAIGateway = async (
    systemInstruction: string,
    userPrompt: string,
    isJsonOutput: boolean = false
): Promise<string> => {
    
    const messages = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
    ];

    const modelInBody = AI_GATEWAY_MODEL!;
    const gatewayUrl = AI_GATEWAY_URL!;
    // Construct the full URL as requested
    const fullGatewayUrl = `${gatewayUrl}/${modelInBody}/v1/chat/completions`;

    const body: {
        model: string;
        messages: { role: string; content: string }[];
        stream: boolean;
        response_format?: { type: string };
    } = {
        model: modelInBody,
        messages: messages,
        stream: false,
    };
    
    if (isJsonOutput) {
        body.response_format = { type: "json_object" };
    }

    try {
        const response = await fetch(fullGatewayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_GATEWAY_API_KEY!}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`AI Gateway request failed with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("Invalid response structure from AI Gateway.");
        }
        
        // Sometimes the JSON response is wrapped in markdown backticks
        return content.replace(/^```json\n?/, '').replace(/\n?```$/, '');

    } catch (error) {
        console.error("Error calling AI Gateway:", error);
        throw error; // Re-throw to be handled by the calling function
    }
};

/**
 * A generic function to call the Google Gemini API directly.
 * This is used as a fallback when the AI Gateway is not configured.
 */
const callGeminiDirectly = async (
    systemInstruction: string,
    userPrompt: string,
    jsonSchema?: object 
): Promise<string> => {
    if (!ai) {
        throw new Error("Gemini AI client is not initialized. Check your API_KEY environment variable.");
    }

    const config: any = {
        systemInstruction: systemInstruction,
    };
    if (jsonSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = jsonSchema;
    }

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: userPrompt,
            config: config,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error; // Re-throw to be handled by the calling function
    }
};


// --- Exported Service Functions ---

export const getRootCauseAnalysis = async (
    query: string,
    poLines: POLine[],
    poLogs: POLog[],
    vendor: string,
    language: Language
): Promise<CategorizedAnalysisResult | null> => {
    const systemInstruction = `You are a world-class supply chain analyst AI. Your task is to find the root cause of vendor performance issues based on Purchase Order (PO) data and change logs.

**Analysis & Formatting Rules:**
1.  **Response Format:** Your response MUST be a valid JSON object. Do not include any text outside of the JSON object. The JSON should conform to the following structure: { "summary": "string", "analysis": [{ "category": "'Vendor Issues' | 'Internal (EMT) Issues'", "points": ["string", ...] }] }.
2.  **Categorization:** Analyze the data and categorize each finding into one of two groups:
    *   'Vendor Issues': Problems originating from the supplier (e.g., shipping delays, production issues, repeated ETA push-outs).
    *   'Internal (EMT) Issues': Problems originating from our own systems or processes (e.g., data entry errors, frequent changes to PO quantities, unrealistic initial ETAs).
3.  **Summary:** Provide a concise, high-level summary of the overall situation in the 'summary' field.
4.  **Detailed Points:** For each category, provide specific, actionable findings as an array of markdown-formatted strings in the 'points' field.
    *   Start by stating the core issue, then provide one or two specific PO line examples that best illustrate that problem. Do NOT list all affected PO lines.
5.  **Context:** Today's date is ${new Date().toISOString().split('T')[0]}.
6.  **Language:** Generate the analysis in English. Translation will be handled by a separate process.`;

    const userPrompt = `
User Query: "${query}"
Vendor in Focus: ${vendor}
**Data:**
Open PO Lines:
${JSON.stringify(poLines, null, 2)}
PO Change Logs:
${JSON.stringify(poLogs, null, 2)}
Please provide your categorized root cause analysis in the specified JSON format.`;

    const geminiSchema = {
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
    };

    try {
        const jsonString = IS_GATEWAY_CONFIGURED
            ? await callAIGateway(systemInstruction, userPrompt, true)
            : await callGeminiDirectly(systemInstruction, userPrompt, geminiSchema);
        
        return JSON.parse(jsonString) as CategorizedAnalysisResult;
    } catch (error) {
        console.error("Error generating or parsing root cause analysis:", error);
        return null;
    }
};

export const translateText = async (
    analysis: CategorizedAnalysisResult,
    targetLanguage: Language
): Promise<CategorizedAnalysisResult | null> => {
    const languageName = targetLanguage === 'zh' ? 'Chinese' : 'English';
    const systemInstruction = `You are an expert translator. The user will provide a JSON object. Translate all user-facing string values ('summary' and all strings within the 'points' arrays) to ${languageName}. Maintain the original markdown formatting and the exact JSON structure. Only provide the translated JSON object as a response. The JSON structure is: { "summary": "string", "analysis": [{ "category": "string", "points": ["string", ...] }] }`;
    
    const userPrompt = JSON.stringify(analysis, null, 2);
    
    const geminiSchema = {
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
    };

    try {
        const jsonString = IS_GATEWAY_CONFIGURED
            ? await callAIGateway(systemInstruction, userPrompt, true)
            : await callGeminiDirectly(systemInstruction, userPrompt, geminiSchema);

        return JSON.parse(jsonString) as CategorizedAnalysisResult;
    } catch (error) {
        console.error("Error calling AI for translation:", error);
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
        return IS_GATEWAY_CONFIGURED
            ? await callAIGateway(systemInstruction, prompt, false)
            : await callGeminiDirectly(systemInstruction, prompt);
    } catch (error) {
        return "An error occurred while communicating with the AI service. Please check the console for details and try again later.";
    }
};

export const getRiskPrediction = async (
    poLines: POLine[],
    language: Language
): Promise<RiskAssessmentResult[]> => {
    const systemInstruction = `You are an expert supply chain risk assessment AI. Your task is to analyze the provided open purchase order (PO) data to predict which PO lines are at risk of future delays. Today's date is ${new Date().toISOString().split('T')[0]}. Respond ONLY with a JSON array that matches this structure: [{ "po_line_id": "string", "risk_level": "'High' | 'Medium' | 'Low'", "justification": "string" }]. Provide justification in ${language === 'zh' ? 'Chinese' : 'English'}.`;

    const userPrompt = `Analyze the following open PO lines and identify those with a high or medium risk of future delays. Consider factors like existing past due status, high open quantities, and patterns across vendors. Return a JSON array of objects.

**Data:**
Open PO Lines:
${JSON.stringify(poLines, null, 2)}`;

    const geminiSchema = {
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
    };

    try {
        const jsonString = IS_GATEWAY_CONFIGURED
            ? await callAIGateway(systemInstruction, userPrompt, true)
            : await callGeminiDirectly(systemInstruction, userPrompt, geminiSchema);
        
        return JSON.parse(jsonString) as RiskAssessmentResult[];
    } catch (error) {
        console.error("Error parsing JSON from AI for risk prediction:", error);
        return [];
    }
};


export const categorizeJustifications = async (
  justifications: string[],
  language: Language
): Promise<JustificationCategory[]> => {
  const systemInstruction = `You are a text analysis AI. Your task is to categorize risk reasons. Respond ONLY with a JSON array that matches this structure: [{ "category": "string", "count": number }]. Provide category names in ${language === 'zh' ? 'Chinese' : 'English'}.`;

  const userPrompt = `Analyze this list of risk justifications. Group them into 3-5 high-level categories (e.g., "Severe Past Due", "Logistics Delays", "High Open Quantity"). For each category, provide a count of how many justifications fall into it.

**Justifications:**
${JSON.stringify(justifications)}
`;

    const geminiSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          count: { type: Type.INTEGER },
        },
        required: ['category', 'count'],
      },
    };

  try {
    const jsonString = IS_GATEWAY_CONFIGURED
        ? await callAIGateway(systemInstruction, userPrompt, true)
        : await callGeminiDirectly(systemInstruction, userPrompt, geminiSchema);

    return JSON.parse(jsonString) as JustificationCategory[];
  } catch (error) {
    console.error('Error categorizing justifications:', error);
    return [];
  }
};