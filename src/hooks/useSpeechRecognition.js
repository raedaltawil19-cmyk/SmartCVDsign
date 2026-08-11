import { useState, useEffect, useRef, useCallback } from "react";

/**
 * خطّاف للتعرف على الكلام عبر واجهة المتصفح (Web Speech API).
 * يدعم العربية والسويدية والإنجليزية.
 * يعيد { supported, listening, toggle, stop, interim }.
 */
export function useSpeechRecognition({ lang = "ar-SA", onResult } = {}) {
  const [supported] = useState(
    () => typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const finalBaseRef = useRef("");

  const ensureRec = useCallback(() => {
    if (!supported) return null;
    if (recRef.current) return recRef.current;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interimText = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) {
        const base = finalBaseRef.current;
        const merged = (base ? base + " " : "") + finalText.trim();
        finalBaseRef.current = merged;
        onResultRef.current?.(merged, true);
      }
      setInterim(interimText);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return rec;
  }, [supported, lang]);

  const start = useCallback((baseText = "") => {
    const rec = ensureRec();
    if (!rec) return;
    finalBaseRef.current = baseText || "";
    try {
      rec.start();
      setListening(true);
    } catch {
      // قد يكون قد بدأ بالفعل
    }
  }, [ensureRec]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      try { rec.stop(); } catch {}
    }
    setListening(false);
    setInterim("");
  }, []);

  const toggle = useCallback((baseText = "") => {
    if (listening) stop();
    else start(baseText);
  }, [listening, start, stop]);

  useEffect(() => () => {
    const rec = recRef.current;
    if (rec) { try { rec.abort(); } catch {} }
  }, []);

  return { supported, listening, interim, toggle, stop };
}