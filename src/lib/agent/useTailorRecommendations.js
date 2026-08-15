/**
 * useTailorRecommendations — جسر M7: استهلاك توصيات application_tailor وتحويلها إلى حالة عرض/اختيار.
 *
 * قواعد معمارية (بالتصميم لا بالتعليق):
 * - لا نظام Intent ثانٍ ولا parser ثانٍ: يعيد استخدام scanForReview (M5) وcvReviewParser بحرفيّتهما.
 * - لا يكتب شيئاً: لا create/update/delete، لا setData، لا CV_ACTION، ولا استدعاء لأي أداة تعديل.
 * - fail-closed: لا عرض إلا عند كتلة CV_REVIEW مكتملة ومطابقة للعقد.
 * - لا تنفيذ تلقائي: الاختيار محلي بحت، والإرسال بقرار المستخدم في الواجهة.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scanForReview } from "@/lib/agent/useCVReview";
import { buildCVIndex, summarizeIndex } from "@/lib/agent/cvIndex";

/**
 * @param {object} p
 * @param {Array} p.messages رسائل محادثة Job Tailor
 * @param {object|null} p.targetCv سجل السيرة المستهدفة (tailored) — منه يُبنى سياق التحقّق
 */
export default function useTailorRecommendations({ messages, targetCv }) {
  const [review, setReview] = useState(null);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const seenRef = useRef(new Map());
  const doneRef = useRef(new Set());

  const cvId = targetCv?.id || null;

  // سياق التحقّق: قالب السيرة المستهدفة وفهرس عناصرها — معيار itemRef، بلا تخمين
  const context = useMemo(
    () => (targetCv ? { templateId: targetCv.templateId, cvIndex: summarizeIndex(buildCVIndex(targetCv.data)) } : null),
    [targetCv]
  );

  // تغيّر السيرة المستهدفة ⇒ إسقاط أي توصيات سابقة (لا تُعرض على سيرة أخرى)
  useEffect(() => {
    seenRef.current = new Map();
    doneRef.current = new Set();
    setReview(null);
    setError(null);
    setSelectedIds([]);
    setDismissed(false);
  }, [cvId]);

  useEffect(() => {
    if (!context) return;
    const hit = scanForReview({ messages, context, seen: seenRef.current, done: doneRef.current });
    if (!hit) return; // بثّ جارٍ أو لا كتلة → انتظار
    if (hit.error) { setError(hit.error); return; }
    setError(null);
    setSelectedIds([]);
    setDismissed(false);
    setReview(hit.review);
  }, [messages, context]);

  const toggleRecommendation = useCallback((id) => {
    if (typeof id !== "string" || !id) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { review, ready: !!review && !dismissed, error, selectedIds, toggleRecommendation, dismiss };
}