import { useState, useEffect, useCallback } from "react";

interface VoiceAssistantProps {
  onCommand: (command: string) => void;
  lang: string;
}

/**
 * Hook for voice recognition (Siri-like assistant).
 */
export function useVoiceAssistant({ onCommand, lang }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = lang;

      recog.onstart = () => setIsListening(true);
      recog.onend = () => setIsListening(false);
      recog.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          alert("Microphone access was denied. Please allow microphone permissions in your browser settings to use the voice assistant.");
        } else if (event.error === "no-speech") {
          // Silent error, just stop listening
        } else {
          alert(`Speech recognition error: ${event.error}`);
        }
      };

      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        onCommand(transcript);
      };

      setRecognition(recog);
    }
  }, [onCommand, lang]);

  const startListening = useCallback(() => {
    if (recognition) {
      try {
        recognition.start();
      } catch (e) {
        console.error("Recognition already started", e);
      }
    } else {
      alert("Speech recognition is not supported in this browser.");
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }
  }, [recognition]);

  return { isListening, startListening, stopListening };
}
