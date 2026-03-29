import { useCallback, useRef } from "react";
import { SALanguage } from "../types";

/**
 * Hook for text-to-speech with cooldown and language support.
 */
export function useSpeech(cooldownMs: number = 3000, lang: SALanguage = "en-ZA") {
  const lastSpokenRef = useRef<number>(0);

  const speak = useCallback((text: string, overrideLang?: SALanguage) => {
    const now = Date.now();
    if (now - lastSpokenRef.current < cooldownMs) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = overrideLang || lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = now;
  }, [cooldownMs, lang]);

  return { speak };
}
