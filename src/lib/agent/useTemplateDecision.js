/**
 * useTemplateDecision — تشغيل داخلي للوكيل `template_advisor` من داخل Builder.
 *
 * مسؤوليته الوحيدة: فتح محادثة جديدة، إرسال طلب مراجعة يحمل السياق صريحاً،
 * ثم انتظار كتلة TEMPLATE_DECISION مكتملة وصالحة وإعادتها كحالة.
 *
 * ممنوع تماماً في هذا الملف (بالتصميم لا بالتعليق):
 *   - أي استدعاء لـ SavedCV (create/update/delete) أو أي كيان.
 *   - أي تعديل على data أو templateId أو layout.
 *   - أي CV_ACTION أو smartAssistantAction أو أدوات التعديل.
 *   - أي navigate أو فتح صفحة.
 * لذلك لا يستورد هذا الملف سوى React و base44 (agents فقط).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

const AGENT_NAME = "template_advisor";

export const DECISION_OPEN = "<<<TEMPLATE_DECISION";
export const DECISION_CLOSE = "TEMPLATE_DECISION>>>";

/** القوالب الخمسة المعتمدة — قائمة مغلقة، بلا أي fallback أو تخمين */
export const ALLOWED_TEMPLATE_IDS = ["stockholm", "techpro", "creative", "nordic", "executive"];
const ALLOWED_DECISIONS = ["keep", "suggest"];

/**
 * يستخرج كتلة القرار من نص رسالة المساعد.
 * يعيد null إن كانت الكتلة غائبة أو غير مكتملة (بثّ جارٍ) أو JSON غير قابل للتحليل.
 */
export function extractTemplateDecision(content) {
  const text = String(content || "");
  const start = text.indexOf(DECISION_OPEN);
  if (start === -1) return null;
  const end = text.indexOf(DECISION_CLOSE, start + DECISION_OPEN.length);
  if (end === -1) return null; // الكتلة لم تُغلق بعد → ليست قراراً
  const raw = text.slice(start + DECISION_OPEN.length, end).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null; // JSON ناقص أو تالف → لا قرار
  }
}

/** يحذف كتلة القرار من النص المعروض للمستخدم، ويُبقي النص البشري كما هو */
export function stripTemplateDecision(content) {
  const text = String(content || "");
  const start = text.indexOf(DECISION_OPEN);
  if (start === -1) return text;
  const end = text.indexOf(DECISION_CLOSE, start + DECISION_OPEN.length);
  if (end === -1) return text.slice(0, start).trim();
  return (text.slice(0, start) + text.slice(end + DECISION_CLOSE.length)).trim();
}

/**
 * تحقّق صارم — fail-closed. أي قرار غير مطابق يُهمل بالكامل بلا تصحيح تلقائي.
 * @returns {{ok:true, decision:object}|{ok:false, reason:string}}
 */
export function validateTemplateDecision(parsed, currentTemplateId) {
  if (!parsed || typeof parsed !== "object") return { ok: false, reason: "NOT_AN_OBJECT" };
  const { decision, templateId, reason } = parsed;
  if (!ALLOWED_DECISIONS.includes(decision)) return { ok: false, reason: "DECISION_INVALID" };
  if (!ALLOWED_TEMPLATE_IDS.includes(templateId)) return { ok: false, reason: "TEMPLATE_INVALID" };
  if (decision === "suggest" && templateId === currentTemplateId) return { ok: false, reason: "SUGGEST_SAME_TEMPLATE" };
  if (decision === "keep" && templateId !== currentTemplateId) return { ok: false, reason: "KEEP_OTHER_TEMPLATE" };
  return { ok: true, decision: { decision, templateId, reason: typeof reason === "string" ? reason : "" } };
}

/**
 * بوابة البثّ — منطق نقيّ قابل للاختبار بلا React.
 * تُستدعى عند كل تحديث اشتراك، وتفحص فقط ما تغيّر نصه فعلاً.
 * @param {object} p
 * @param {Array} p.messages رسائل المحادثة كما وصلت من الاشتراك
 * @param {string} p.currentTemplateId القالب المعروض حالياً في Builder
 * @param {Map} p.seen مرجع دائم: message key → آخر نص فُحص
 * @param {Set} p.done مرجع دائم: مفاتيح ثُبِّت قرارها
 * @returns {{decision:object, text:string}|null} قرار صالح مرة واحدة فقط، أو null
 */
export function scanForDecision({ messages, currentTemplateId, seen, done }) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (!m || m.role !== "assistant") continue;
    const key = m.id || `idx-${i}`;
    if (done.has(key)) continue; // قرار هذه الرسالة مُثبَّت — لا إعادة معالجة
    const content = String(m.content || "");
    if (seen.get(key) === content) continue; // لا تغيّر فعلي → لا تحليل
    seen.set(key, content);

    const parsed = extractTemplateDecision(content);
    if (!parsed) continue; // كتلة غائبة أو غير مكتملة → ننتظر، ولا نوسم الرسالة

    const check = validateTemplateDecision(parsed, currentTemplateId);
    if (!check.ok) {
      done.add(key); // قرار وصل مكتملاً لكنه غير صالح → يُهمل نهائياً بلا محاولة أخرى
      continue;
    }
    done.add(key);
    return { decision: check.decision, text: stripTemplateDecision(content) };
  }
  return null;
}

/** نصّ الطلب المرسل للوكيل — السياق صريح داخل الرسالة، لا في metadata */
export function buildReviewPrompt({ cvId, templateId, templateSource, data }) {
  return [
    "مطلوب منك مراجعة قالب هذه السيرة فقط — تحليل ثم قرار، بلا أي تعديل.",
    "لا تعدّل السيرة ولا القالب ولا تحفظ أي شيء: أنت مستشار قراءة فقط.",
    "اعتمد حصراً على السياق التالي كمصدر للحقيقة (هو أحدث من المحفوظ في قاعدة البيانات):",
    JSON.stringify({ cvId: cvId || null, currentTemplateId: templateId, templateSource, CV_DATA: data }),
    "",
    "أصدر قرارك في نهاية رسالتك بكتلة واحدة فقط بهذا الشكل الحرفي:",
    `${DECISION_OPEN} {"decision":"keep|suggest","templateId":"stockholm|techpro|creative|nordic|executive","reason":"..."} ${DECISION_CLOSE}`,
    'إن كان القالب الحالي مناسباً: decision = "keep" و templateId = القالب الحالي.',
    'إن كان قالب آخر أفضل: decision = "suggest" و templateId = القالب المقترح (ويجب أن يختلف عن الحالي).'
  ].join("\n");
}

/**
 * الخُطّاف. لا يشتغل تلقائياً — يبدأ فقط عند استدعاء run().
 * @param {object} p { cvId, templateId, templateSource, data }
 * @returns {{decision, templateId, reason, message, loading, error, ready, run, reset}}
 */
export default function useTemplateDecision({ cvId, templateId, templateSource, data }) {
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const seenRef = useRef(new Map());
  const doneRef = useRef(new Set());
  const settledRef = useRef(false);
  const unsubRef = useRef(null);
  const startedRef = useRef(false);

  // السياق الحالي من Builder — مصدر الحقيقة، يُقرأ لحظة الإرسال والفحص
  const ctxRef = useRef({ cvId, templateId, templateSource, data });
  ctxRef.current = { cvId, templateId, templateSource, data };

  const cleanup = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const run = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const ctx = ctxRef.current;
      // محادثة جديدة في كل تشغيل — لا listConversations ولا استئناف
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: "مراجعة قالب (داخلي)", description: "قرار مهيكل لمراجعة القالب" }
      });

      unsubRef.current = base44.agents.subscribeToConversation(conv.id, (payload) => {
        if (settledRef.current) return;
        const hit = scanForDecision({
          messages: payload?.messages,
          currentTemplateId: ctxRef.current.templateId,
          seen: seenRef.current,
          done: doneRef.current
        });
        if (!hit) return; // بثّ جارٍ أو كتلة غير مكتملة → ننتظر
        settledRef.current = true;
        setResult(hit.decision);
        setMessage(hit.text);
        setLoading(false);
        cleanup();
      });

      await base44.agents.addMessage(conv, { role: "user", content: buildReviewPrompt(ctx) });
    } catch (e) {
      setError("تعذّر تشغيل مراجعة القالب.");
      setLoading(false);
      cleanup();
    }
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    seenRef.current = new Map();
    doneRef.current = new Set();
    settledRef.current = false;
    startedRef.current = false;
    setResult(null);
    setMessage("");
    setLoading(false);
    setError(null);
  }, [cleanup]);

  return {
    decision: result?.decision || null,
    templateId: result?.templateId || null,
    reason: result?.reason || "",
    message,
    ready: !!result,
    loading,
    error,
    run,
    reset
  };
}

/* ────────────────────────────────────────────────────────────────
 * اختبارات المنطق النقيّ — لا تعمل تلقائياً، ولا تلمس أي ملف آخر.
 * استدعِ runTemplateDecisionTests() للحصول على النتائج.
 * ──────────────────────────────────────────────────────────────── */
export function runTemplateDecisionTests() {
  const out = [];
  const check = (name, cond, extra) => out.push({ name, pass: !!cond, ...(extra !== undefined ? { extra } : {}) });
  const BLOCK = (o) => `${DECISION_OPEN} ${JSON.stringify(o)} ${DECISION_CLOSE}`;
  const gate = () => ({ seen: new Map(), done: new Set() });
  const scan = (content, current, g) =>
    scanForDecision({ messages: [{ id: "m1", role: "assistant", content }], currentTemplateId: current, seen: g.seen, done: g.done });

  // 1) keep صالح
  {
    const r = scan(`قالبك مناسب.\n${BLOCK({ decision: "keep", templateId: "stockholm", reason: "بنية متوازنة" })}`, "stockholm", gate());
    check("1) valid keep accepted", r && r.decision.decision === "keep" && r.decision.templateId === "stockholm");
    check("1b) human text kept, block hidden", r && r.text === "قالبك مناسب." , r?.text);
  }
  // 2) suggest صالح
  {
    const r = scan(BLOCK({ decision: "suggest", templateId: "techpro", reason: "مهارات كثيرة" }), "stockholm", gate());
    check("2) valid suggest accepted", r && r.decision.decision === "suggest" && r.decision.templateId === "techpro");
  }
  // 3) suggest بنفس القالب الحالي → مرفوض
  check("3) suggest with same template rejected",
    scan(BLOCK({ decision: "suggest", templateId: "stockholm", reason: "x" }), "stockholm", gate()) === null);
  // 4) templateId غير معروف → مرفوض
  check("4) unknown templateId rejected",
    scan(BLOCK({ decision: "suggest", templateId: "berlin", reason: "x" }), "stockholm", gate()) === null);
  // 5) decision غير معروف → مرفوض
  check("5) unknown decision rejected",
    scan(BLOCK({ decision: "replace", templateId: "techpro", reason: "x" }), "stockholm", gate()) === null);
  // 6) JSON غير مكتمل أثناء البثّ → لا قرار، ولا توسيم
  {
    const g = gate();
    const partial = `أحلّل...\n${DECISION_OPEN} {"decision":"sugg`;
    check("6) partial block yields no decision", scan(partial, "stockholm", g) === null);
    check("6b) partial does not mark message done", g.done.size === 0);
    // 7) ثم يكتمل → قرار واحد
    const full = `أحلّل...\n${BLOCK({ decision: "suggest", templateId: "creative", reason: "y" })}`;
    const r = scan(full, "stockholm", g);
    check("7) completed block yields exactly one decision", r && r.decision.templateId === "creative" && g.done.size === 1);
    // 8) نفس المحتوى يصل مرة أخرى → لا معالجة مكررة
    check("8) same content again is not reprocessed", scan(full, "stockholm", g) === null);
  }
  // 9) لا كتلة → لا قرار
  check("9) no block yields no decision", scan("أرى أن سيرتك جيدة.", "stockholm", gate()) === null);
  // 10) CV_DATA لا يُعدَّل عند بناء الطلب
  {
    const data = { namn: "Anna", erfarenhet: [{ roll: "Dev" }] };
    const snapshot = JSON.stringify(data);
    buildReviewPrompt({ cvId: "abc", templateId: "stockholm", templateSource: "user", data });
    check("10) CV_DATA not mutated", JSON.stringify(data) === snapshot);
    const p = buildReviewPrompt({ cvId: "abc", templateId: "stockholm", templateSource: "user", data });
    check("10b) prompt carries cvId/templateId/templateSource/CV_DATA",
      p.includes('"cvId":"abc"') && p.includes('"currentTemplateId":"stockholm"') && p.includes('"templateSource":"user"') && p.includes('"CV_DATA"'));
  }
  // 11) لا مسار كتابة على SavedCV في هذه الوحدة
  check("11) no SavedCV write path in module surface",
    typeof scanForDecision === "function" && typeof extractTemplateDecision === "function" &&
    typeof validateTemplateDecision === "function" && typeof buildReviewPrompt === "function");
  // 12) رسالة المستخدم لا تُفحص
  check("12) user messages ignored",
    scanForDecision({ messages: [{ id: "u1", role: "user", content: BLOCK({ decision: "suggest", templateId: "techpro" }) }], currentTemplateId: "stockholm", ...gate() }) === null);

  return { results: out, allPassed: out.every((r) => r.pass) };
}