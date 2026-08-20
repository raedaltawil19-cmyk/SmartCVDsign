/**
 * useJobTailorPopup — مسار تخصيص الوظيفة داخل نافذة واحدة (Popup).
 *
 * قواعد معمارية (بالتصميم لا بالتعليق):
 * - لا parser ثانٍ ولا نظام توصيات ثانٍ: التحليل يجري في وكيل application_tailor نفسه،
 *   والقراءة تمرّ بـuseTailorRecommendations (وهو يعيد استخدام scanForReview/cvReviewParser).
 * - لا كتابة على أي سيرة: لا create/update/delete ولا CV_ACTION ولا أدوات تعديل.
 * - السيرة الحالية تُرفق كـCV_CONTEXT مع الرسالة، فلا يُسأل المستخدم عن معرّف سيرة.
 * - نصّ ملصوق ⇒ تحليل مباشر بلا أداة بحث. رابط ⇒ الوكيل يستخدم FetchJobAd. لا SearchJobs هنا.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import useTailorRecommendations from "@/lib/agent/useTailorRecommendations";
import { cvContextBlock } from "@/lib/agent/tailorContext";

const AGENT_NAME = "application_tailor";

/** نصّ الطلب — يفصل صراحةً بين الإعلان الملصوق والرابط، بلا أي طلب بحث */
export function buildTailorRequest({ adText, adUrl }) {
  const text = String(adText || "").trim();
  const url = String(adUrl || "").trim();
  if (!text && !url) return { error: "NO_AD" };
  const parts = [];
  if (text) parts.push(`هذا نصّ إعلان الوظيفة كما هو، اعتمده مباشرةً كمصدر المتطلبات وحلّله بلا أي بحث:\n${text}`);
  if (url) parts.push(`رابط إعلان الوظيفة: ${url}\nاجلب متطلباته من الرابط نفسه.`);
  parts.push("طابق سيرتي المحدّدة مع متطلبات هذا الإعلان، وأعطني توصيات التخصيص في كتلة CV_REVIEW. لا تبحث عن وظائف أخرى، ولا تسألني عن معرّف سيرة — السيرة مرفقة.");
  return { request: parts.join("\n\n") };
}

export default function useJobTailorPopup({ cvRecord }) {
  const [messages, setMessages] = useState([]);
  const pollTimersRef = useRef([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const convRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const tailor = useTailorRecommendations({ messages, targetCv: cvRecord || null });

  useEffect(() => () => {
    pollTimersRef.current.forEach(clearTimeout);
    pollTimersRef.current = [];
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  // التحليل ينتهي عند وصول كتلة توصيات مكتملة أو خطأ عقد
  useEffect(() => {
    if (tailor.review || tailor.error) setAnalyzing(false);
  }, [tailor.review, tailor.error]);

  const analyze = useCallback(async ({ adText, adUrl }) => {
    if (!cvRecord?.id) { setError("NO_CV"); return; }
    const built = buildTailorRequest({ adText, adUrl });
    if (built.error) { setError(built.error); return; }
    setError(null);
    setAnalyzing(true);
    try {
      let conv = convRef.current;
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: "تخصيص لوظيفة", description: "تخصيص السيرة الحالية لإعلان وظيفة", cvId: cvRecord.id }
        });
        convRef.current = conv;
      }

      // Subscribe BEFORE sending the message. React state/effects are asynchronous;
      // waiting for conversationId here could miss a fast assistant response entirely.
      unsubscribeRef.current?.();
      unsubscribeRef.current = base44.agents.subscribeToConversation(conv.id, (d) => {
        setMessages(d?.messages || []);
      });

      await base44.agents.addMessage(conv, { role: "user", content: `${built.request}${cvContextBlock(cvRecord)}` });

      // Safety net for missed realtime events: read the conversation repeatedly until
      // the strict CV_REVIEW parser settles or the normal hook reports an error.
      pollTimersRef.current.forEach(clearTimeout);
      pollTimersRef.current = [1000, 2500, 5000, 9000, 15000, 25000, 40000, 60000, 90000].map((ms) => setTimeout(async () => {
        try {
          const latest = await base44.agents.getConversation(conv.id);
          if (latest?.messages) setMessages(latest.messages);
        } catch {
          // realtime subscription remains the primary channel
        }
      }, ms));

      // مهلة نهائية: لا يبقى المستخدم في انتظار مفتوح إن لم تصل كتلة توصيات مقبولة
      pollTimersRef.current.push(setTimeout(() => {
        setAnalyzing((busy) => {
          if (busy) setError("ANALYZE_FAILED");
          return false;
        });
      }, 100000));

    } catch {
      setAnalyzing(false);
      setError("ANALYZE_FAILED");
    }
  }, [cvRecord]);

  return {
    analyze,
    analyzing,
    error: error || tailor.error || null,
    review: tailor.review,
    ready: tailor.ready,
    selectedIds: tailor.selectedIds,
    toggleRecommendation: tailor.toggleRecommendation
  };
}