import { GoogleGenAI, Type } from "@google/genai";
import { SALanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const DEFAULT_MODEL = "gemini-2.5-flash";

// Simple in-memory cache to reduce API calls
const cache = new Map<string, string>();

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // If rate limited, wait longer
    const isRateLimit = error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED";
    const nextDelay = isRateLimit ? delay * 4 : delay * 2;

    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, nextDelay);
  }
}

export async function translateText(text: string, targetLang: SALanguage): Promise<string> {
  if (targetLang === "en-ZA") return text;

  const cacheKey = `translate:${targetLang}:${text}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const langMap: Record<SALanguage, string> = {
    "en-ZA": "English",
    "zu-ZA": "isiZulu",
    "xh-ZA": "isiXhosa",
    "af-ZA": "Afrikaans",
    "st-ZA": "Sesotho",
  };

  try {
    const response = await retry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Translate the following text to ${langMap[targetLang]}. Only return the translated text: "${text}"`,
    }));
    const result = response.text || text;
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return text;
  }
}

export async function getSmartResponse(prompt: string, context: string, lang: SALanguage): Promise<string> {
  const cacheKey = `smart:${lang}:${context}:${prompt}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const langMap: Record<SALanguage, string> = {
    "en-ZA": "English",
    "zu-ZA": "isiZulu",
    "xh-ZA": "isiXhosa",
    "af-ZA": "Afrikaans",
    "st-ZA": "Sesotho",
  };

  try {
    const response = await retry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `You are a helpful accessibility assistant for SignBridge. 
      Context: ${context}
      User asked: ${prompt}
      Respond in ${langMap[lang]}. Keep it simple and helpful for someone with a disability.`,
    }));
    const result = response.text || "I'm sorry, I couldn't process that.";
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Gemini Smart Response Error:", error);
    return "I'm sorry, I'm having trouble connecting to my brain right now.";
  }
}

export async function getAvatarResponse(prompt: string, lang: SALanguage): Promise<{ text: string; translatedText: string }> {
  const cacheKey = `avatar:${lang}:${prompt}`;
  if (cache.has(cacheKey)) {
    const cached = JSON.parse(cache.get(cacheKey)!);
    return cached;
  }

  const langMap: Record<SALanguage, string> = {
    "en-ZA": "English",
    "zu-ZA": "isiZulu",
    "xh-ZA": "isiXhosa",
    "af-ZA": "Afrikaans",
    "st-ZA": "Sesotho",
  };

  try {
    const response = await retry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `You are an advanced AI Avatar for SignBridge, an accessibility app.
      The user said: "${prompt}"
      1. Respond naturally and helpfully in English.
      2. If the target language is not English, also provide a translation in ${langMap[lang]}.
      Return the response in JSON format with keys "english" and "translated".`,
      config: {
        responseMimeType: "application/json",
      }
    }));

    const data = JSON.parse(response.text || "{}");
    const result = {
      text: data.english || "I'm here to help.",
      translatedText: data.translated || ""
    };
    cache.set(cacheKey, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error("Gemini Avatar Response Error:", error);
    return { text: "I'm sorry, I'm having trouble thinking.", translatedText: "" };
  }
}

export async function simplifyExplanation(text: string, lang: SALanguage): Promise<string> {
  const cacheKey = `simplify:${lang}:${text}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const langMap: Record<SALanguage, string> = {
    "en-ZA": "English",
    "zu-ZA": "isiZulu",
    "xh-ZA": "isiXhosa",
    "af-ZA": "Afrikaans",
    "st-ZA": "Sesotho",
  };

  try {
    const response = await retry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Simplify this explanation for someone who needs clear, easy-to-understand instructions in ${langMap[lang]}: "${text}"`,
    }));
    const result = response.text || text;
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Gemini Simplify Error:", error);
    return text;
  }
}

export async function interpretSign(landmarkData: any): Promise<string> {
  try {
    const response = await retry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `
        Interpret the following hand landmark data as South African Sign Language (SASL).
        The input may include:
        - currentFrame: the latest observed hand pose
        - recentFrames: a short motion history of the last frames
        - motionSummary: how much the hand moved
        - fingerStates and poseHints: derived features for each hand
        - candidateLabels: local best guesses from the pose analyzer

        Use motion and handshape together. Many signs are dynamic, so do not rely only on the final pose.
        Prefer a concise result such as a single word, a short phrase, or a single fingerspelled letter.
        If the evidence is weak or ambiguous, return exactly: Unknown sign
        If candidateLabels match the observed pose and motion, you may use them.

        Data: ${JSON.stringify(landmarkData)}
        Return ONLY the interpreted text.
      `,
    }));
    return response.text?.trim() || "Unknown sign";
  } catch (error) {
    console.error("Gemini Sign Interpretation Error:", error);
    throw error;
  }
}

export async function interpretGestures(landmarkData: any): Promise<{ interpretation: string }> {
  try {
    const text = await interpretSign(landmarkData);
    return { interpretation: text };
  } catch (error) {
    const fallbackCandidate =
      Array.isArray(landmarkData?.candidateLabels) && landmarkData.candidateLabels.length > 0
        ? String(landmarkData.candidateLabels[0])
        : "Error interpreting gestures";
    return { interpretation: fallbackCandidate };
  }
}

export async function generateSign(text: string): Promise<any[]> {
  try {
    const response = await retry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `
        Generate a sequence of 5 keyframes for a South African Sign Language (SASL) gesture representing the word/phrase: "${text}".
        Each frame should be a list of 21 hand landmarks (x, y, z) for ONE hand.
        Return the data as a JSON array of frames, where each frame is an array of 21 objects with x, y, z properties.
        Example format: [[{"x":0.5, "y":0.5, "z":0}, ...], ...]
        Return ONLY the JSON array.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                z: { type: Type.NUMBER }
              },
              required: ["x", "y", "z"]
            }
          }
        }
      }
    }));

    const data = JSON.parse(response.text || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Gemini Sign Generation Error:", error);
    return [];
  }
}
