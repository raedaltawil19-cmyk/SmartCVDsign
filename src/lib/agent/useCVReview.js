/**
 * useCVReview — M5: استهلاك مخرج cv_review_coach وتحويله إلى حالة عرض فقط.
 *
 * قواعد معمارية (بالتصميم لا بالتعليق):
 * - لا يقرأ SavedCV ولا cvRepository — الحالة تأتي من Builder حصراً.
 * - لا يكتب أي شيء: لا setData ولا setLayout ولا setTemplateId ولا update.
 * - لا CV_ACTION، ولا executeAssistantAction، ولا أدوات تعديل السيرة.
 * - fail-closed: لا عرض إلا عند parseCVReview(...).ready === true.
 * لذلك لا يستورد سوى React + جسر السياق (cvReviewSession) + الـparser النقيّ.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createReviewConversation, sendReviewRequest, isReviewContextReady } from "@/lib/agent/cvReviewSession";
import { buildCVIndex, summarizeIndex } from "@/lib/agent/cvIndex";
import { parseCVReview, stripCVReview } from "@/lib/agent/cvReviewParser";
import { extractResearch, stripResearch } from "@/lib/agent/reviewResearch";
import { reviewVersionKey, getCachedReview, setCachedReview } from "@/lib/agent/reviewCache";
import { base44 } from "@/api/base44Client";

/**
 * بوابة البثّ — منطق نقيّ قابل للاختبار بلا React.
 * تُستدعى عند كل تحديث اشتراك وتفحص فقط ما تغيّر نصه فعلاً.
 * @param {object} p
 * @param {Array} p.messages رسائل المحادثة
 * @param {object} p.context سياق التحقّق { templateId, cvIndex } — لقطة لحظة بدء المراجعة
 * @param {Map} p.seen مرجع دائم: message key → آخر نص فُحص
 * @param {Set} p.done مرجع دائم: مفاتيح ثُبِّتت نتيجتها
 * @returns {{review:object, text:string}|{error:string}|null}
 */
export function scanForReview({ messages, context, seen, done }) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (!m || m.role !== "assistant") continue;
    const key = m.id || `idx-${i}`;
    if (done.has(key)) continue; // نتيجة هذه الرسالة مُثبَّتة — لا إعادة معالجة
    const content = String(m.content || "");
    if (seen.get(key) === content) continue; // لا تغيّر فعلي → لا تحليل
    seen.set(key, content);

    const res = parseCVReview(content, context);
    if (!res.ready) {
      // NOT_READY = بثّ جارٍ أو لا كتلة → ننتظر بلا توسيم وبلا خطأ.
      if (res.error === "NOT_READY") continue;
      done.add(key); // كتلة وصلت مكتملة لكنها تخرق العقد → تُهمل نهائياً
      return { error: res.error };
    }
    done.add(key);
    // البحث الخارجي يسافر في كتلة أخوية مستقلة: يُقرأ من قناته، ويُنظَّف من النصّ البشري،
    // وأي خلل فيه يعيد null فلا يمسّ CV_REVIEW إطلاقاً.
    return { review: res.review, text: stripResearch(stripCVReview(content)), research: extractResearch(content) };
  }
  return null;
}

/**
 * الخُطّاف. لا يشتغل تلقائياً — يبدأ فقط عند استدعاء run().
 * النتيجة snapshot: تثبُت حتى dismiss() أو تغيّر cvId.
 */
export default function useCVReview(state) {
  const [review, setReview] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  // الكشف للمستخدم منفصل عن اكتمال المراجعة: التشغيل المسبق يجهّز النتيجة ولا يعرضها،
  // والعرض يحدث فقط عندما يطلب المستخدم «تحسين CV» صراحةً.
  const [revealed, setRevealed] = useState(false);
  // نتائج البحث الخارجي المجهَّزة مسبقاً — حالة **منفصلة تماماً** عن كائن المراجعة،
  // مفتاحها recommendationId. لا تُدمج في review ولا تُعرض في بطاقة التوصية.
  const [researchByRecommendation, setResearchByRecommendation] = useState({});

  const seenRef = useRef(new Map());
  const doneRef = useRef(new Set());
  const settledRef = useRef(false);
  const startedRef = useRef(false);
  const unsubRef = useRef(null);
  const pollTimersRef = useRef([]);
  const contextRef = useRef(null); // لقطة { templateId, cvIndex } لحظة بدء المراجعة
  const conversationRef = useRef(null);
  const requestRef = useRef(""); // نصّ الطلب الذي بدأت به الدورة الحالية
  const cacheKeyRef = useRef(null); // مفتاح نسخة السيرة لهذه الدورة

  // حالة Builder الحالية — تُقرأ لحظة الإرسال فقط، ولا تُشغّل مراجعة جديدة عند تغيّرها
  const stateRef = useRef(state);
  stateRef.current = state;

  const cleanup = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    pollTimersRef.current.forEach(clearTimeout);
    pollTimersRef.current = [];
  }, []);

  const reset = useCallback(() => {
    cleanup();
    seenRef.current = new Map();
    doneRef.current = new Set();
    settledRef.current = false;
    startedRef.current = false;
    contextRef.current = null;
    conversationRef.current = null;
    setReview(null);
    setMessage("");
    setResearchByRecommendation({});
    setSelectedIds([]);
    setLoading(false);
    setError(null);
    setDismissed(false);
    setRevealed(false);
    requestRef.current = "";
    cacheKeyRef.current = null;
  }, [cleanup]);

  // تغيّر السيرة ⇒ إسقاط نتيجة المراجعة القديمة نهائياً (لا تُعرض على سيرة أخرى)
  const cvId = state?.cvId || null;
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => { resetRef.current(); }, [cvId]);

  useEffect(() => cleanup, [cleanup]);

  /**
   * تشغيل المراجعة. `reveal` يحدّد العرض فقط، ولا يمسّ محتوى الطلب ولا التحليل:
   * التشغيل المسبق (reveal=false) يرسل نفس الرسالة ونفس السياق إلى نفس الوكيل بنفس
   * مهاراته وبحثه، ويخزّن النتيجة المكتملة كما هي؛ الضغط على «تحسين CV» يكشفها.
   */
  const start = useCallback(async (userRequest, reveal) => {
    const ctxState = stateRef.current;
    if (!isReviewContextReady(ctxState || {})) return;
    const request = String(userRequest || "").trim();
    const key = reviewVersionKey({ cvId: ctxState.cvId, templateId: ctxState.templateId, data: ctxState.data, userRequest: request });

    // نتيجة مكتملة لنفس نسخة السيرة ونفس الطلب: تُعرض كما هي بلا إعادة تحليل ولا نقص
    const cached = getCachedReview(key);
    if (cached) {
      settledRef.current = true;
      startedRef.current = true;
      requestRef.current = request;
      cacheKeyRef.current = key;
      setReview(cached.review);
      setMessage(cached.message);
      setResearchByRecommendation(cached.research || {});
      setLoading(false);
      setError(null);
      if (reveal) setRevealed(true);
      return;
    }

    // تغيّرت نسخة السيرة (أو الطلب) عن الدورة السابقة ⇒ مراجعة كاملة جديدة على الحالة الحالية.
    // دورة جارية على النسخة نفسها لا تُقطع أبداً، ولا تُقطع دورة جارية إلا بطلب صريح من المستخدم.
    const sameCycle = cacheKeyRef.current === key;
    // التشغيل المسبق لا يحق له إسقاط مراجعة مكشوفة أو قائمة توصيات يراجعها المستخدم.
    // بعد تنفيذ توصية يتغيّر data، فيتغيّر مفتاح النسخة؛ تجاهل prewarm الجديد هنا
    // حتى تبقى بقية التوصيات ظاهرة. إعادة المراجعة على النسخة الجديدة لا تحدث إلا
    // بطلب صريح من المستخدم عبر run()/«تحسين السيرة».
    if (startedRef.current && !sameCycle && !reveal) {
      return;
    }
    if (startedRef.current && !sameCycle && reveal) {
      cleanup();
      seenRef.current = new Map();
      doneRef.current = new Set();
      settledRef.current = false;
      startedRef.current = false;
      setReview(null);
      setMessage("");
      setResearchByRecommendation({});
      setSelectedIds([]);
      setError(null);
    }
    if (startedRef.current) {
      // دورة جارية ⇒ ننتظرها ونكشفها عند اكتمالها
      if (reveal) setRevealed(true);
      return;
    }
    startedRef.current = true;
    requestRef.current = request;
    cacheKeyRef.current = key;
    if (reveal) setRevealed(true);
    setLoading(true);
    setError(null);
    // لقطة سياق التحقّق: نفس البيانات التي أُرسلت للوكيل، فلا يتغيّر معيار itemRef أثناء المراجعة
    contextRef.current = {
      templateId: ctxState.templateId,
      cvIndex: summarizeIndex(buildCVIndex(ctxState.data))
    };
    // معالج واحد لكل مصدر رسائل (اشتراك أو قراءة مباشرة) — النتيجة تُثبَّت مرة واحدة
    const handle = (messages) => {
      if (settledRef.current) return;
      const hit = scanForReview({
        messages,
        context: contextRef.current,
        seen: seenRef.current,
        done: doneRef.current
      });
      if (!hit) return; // بثّ جارٍ → ننتظر
      settledRef.current = true;
      setLoading(false);
      cleanup();
      if (hit.error) { setError(hit.error); return; }
      setReview(hit.review);
      setMessage(hit.text);
      setResearchByRecommendation(hit.research || {}); // غياب البحث أو خلله ⇒ خريطة فارغة، والمراجعة كما هي
      // تخزين النتيجة المكتملة كما هي — بلا فلترة ولا تعديل ولا اختصار
      setCachedReview(cacheKeyRef.current, { review: hit.review, message: hit.text, research: hit.research || {} });
    };

    try {
      // الترتيب الصحيح: إنشاء المحادثة → بدء الاشتراك → إرسال الطلب،
      // حتى لا تصل كتلة CV_REVIEW قبل أن يبدأ المستمع بالمراقبة.
      const conversation = await createReviewConversation();
      if (!conversation) {
        setError("REVIEW_START_FAILED");
        setLoading(false);
        return;
      }
      conversationRef.current = conversation;
      unsubRef.current = base44.agents.subscribeToConversation(conversation.id, (payload) => handle(payload?.messages));

      const sent = await sendReviewRequest(conversation, ctxState, userRequest);

      if (sent.error) {
        setError("REVIEW_START_FAILED");
        setLoading(false);
        cleanup();
        return;
      }

      // حماية إضافية: قراءة الحالة الحالية للمحادثة بدلاً من الاعتماد على الأحداث المستقبلية وحدها
      const poll = async () => {
        if (settledRef.current) return;
        try {
          const conv = await base44.agents.getConversation(conversation.id);
          handle(conv?.messages);
        } catch {
          // القراءة فشلت → يبقى الاشتراك هو المصدر
        }
      };
      // المدى ممدود (بلا لانهاية) لأن مراجعة مدعومة ببحث خارجي قد تستغرق 30–45 ثانية إضافية.
      // الفجوات مكثَّفة حتى لا تُضيف القراءة الاحتياطية انتظاراً بعد اكتمال الردّ فعلاً.
      pollTimersRef.current = [1000, 3000, 6000, 9000, 12000, 16000, 20000, 25000, 30000, 36000, 42000, 50000, 58000, 66000, 74000, 82000, 90000]
        .map((ms) => setTimeout(poll, ms));
    } catch {
      setError("REVIEW_START_FAILED");
      setLoading(false);
      cleanup();
    }
  }, [cleanup]);

  /** طلب المستخدم الصريح — يعرض النتيجة (الجاهزة أو عند اكتمالها) */
  const run = useCallback((userRequest) => start(userRequest, true), [start]);

  /** تشغيل مسبق في الخلفية — نفس المراجعة تماماً، بلا عرض */
  const prewarm = useCallback(() => start(undefined, false), [start]);

  /** اختيار محلي بحت — لا استدعاء شبكة ولا تعديل سيرة */
  const toggleRecommendation = useCallback((id) => {
    if (typeof id !== "string" || !id) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const dismiss = useCallback(() => { setDismissed(true); }, []);

  return {
    review,
    ready: !!review && revealed && !dismissed,
    pending: revealed && loading,
    message,
    researchByRecommendation,
    loading,
    error,
    selectedIds,
    toggleRecommendation,
    dismiss,
    reset,
    run,
    prewarm
  };
}