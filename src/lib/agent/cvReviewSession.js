/**
 * M2 — جسر السياق بين Builder و cv_review_coach.
 *
 * قواعد معمارية:
 * - Builder هو مالك الحالة ومصدر الحقيقة. هذه الطبقة تقرأ ما يُمرَّر إليها فقط.
 * - لا تقرأ SavedCV ولا cvRepository، ولا تكتب أي شيء في أي مكان.
 * - لا تلمس data ولا layout ولا templateId — تسلسلها كما وصلت فقط.
 * - CV_INDEX يُبنى عبر buildCVIndex/summarizeIndex الموجودتين في cvIndex.js (بلا أي فهرسة جديدة).
 */
import { base44 } from "@/api/base44Client";
import { buildCVIndex, summarizeIndex } from "@/lib/agent/cvIndex";

export const AGENT_NAME = "cv_review_coach";
export const CONTEXT_OPEN = "<<<CV_CONTEXT";
export const CONTEXT_CLOSE = "CV_CONTEXT>>>";

/** السيرة جاهزة للمراجعة؟ بلا أي fallback يغطّي نقص الحالة */
export function isReviewContextReady({ cvId, data, templateId, layout }) {
  if (!cvId || typeof cvId !== "string") return false;
  if (!templateId || typeof templateId !== "string") return false;
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return false;
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  return true;
}

/**
 * يبني كتلة CV_CONTEXT من حالة Builder الحالية لحظة الاستدعاء.
 * @returns {string|null} الكتلة النصية، أو null إن كانت الحالة غير جاهزة.
 */
export function buildCVContextBlock({ cvId, templateId, layout, data, templateReviewStatus }) {
  if (!isReviewContextReady({ cvId, data, templateId, layout })) return null;
  const payload = {
    cvId,
    templateId,
    layout,
    CV_DATA: data,
    CV_INDEX: summarizeIndex(buildCVIndex(data)),
    templateReviewStatus: templateReviewStatus || null
  };
  return `${CONTEXT_OPEN}\n${JSON.stringify(payload)}\n${CONTEXT_CLOSE}`;
}

/** نصّ الرسالة الأولى: السياق أولاً، ثم توضيح مصدر الحقيقة، ثم طلب المستخدم إن وُجد */
export function buildReviewMessage(state, userRequest) {
  const block = buildCVContextBlock(state);
  if (!block) return null;
  const request = String(userRequest || "").trim();
  return [
    block,
    "السياق أعلاه هو الحالة الحالية للسيرة التي تعمل عليها الآن. اعتمد عليه كمصدر الحقيقة الأساسي لهذه المراجعة، ولا تقرأ نسخة أخرى من السيرة ولا تعتمد على محادثة سابقة.",
    "قم بتحليل السيرة وفق تعليماتك الحالية. لا تعدّل السيرة ولا تطبّق أي تغيير.",
    request ? `طلب المستخدم:\n${request}` : "لم يكتب المستخدم طلباً محدداً — قدّم مراجعة تشخيصية عامة."
  ].join("\n\n");
}

/**
 * يبدأ مراجعة جديدة: محادثة جديدة دائماً (بلا listConversations وبلا استئناف)،
 * ثم رسالة واحدة تحمل السياق الكامل.
 * @returns {Promise<{conversation:object}|{error:string}>}
 */
export async function startCVReview(state, userRequest) {
  const content = buildReviewMessage(state, userRequest);
  if (!content) return { error: "CV_NOT_READY" };
  const conversation = await createReviewConversation();
  await base44.agents.addMessage(conversation, { role: "user", content });
  return { conversation };
}

/** إنشاء محادثة المراجعة فقط — يسمح ببدء الاشتراك قبل إرسال الطلب (منع race condition) */
export async function createReviewConversation() {
  return base44.agents.createConversation({
    agent_name: AGENT_NAME,
    // وصفي فقط — تحديد السيرة يحدث عبر cvId داخل CV_CONTEXT حصراً
    metadata: { name: "مراجعة السيرة", description: "مراجعة تشخيصية للسيرة الحالية" }
  });
}

/** إرسال طلب المراجعة إلى محادثة قائمة (بعد أن يصبح المستمع جاهزاً) */
export async function sendReviewRequest(conversation, state, userRequest) {
  const content = buildReviewMessage(state, userRequest);
  if (!conversation || !content) return { error: "CV_NOT_READY" };
  await base44.agents.addMessage(conversation, { role: "user", content });
  return { ok: true };
}

/** رسالة متابعة داخل نفس المراجعة — تُرسل الحالة الحالية عند الحاجة، بلا أي قراءة من SavedCV */
export async function sendReviewFollowUp(conversation, state, userText) {
  const text = String(userText || "").trim();
  if (!conversation || !text) return { error: "EMPTY" };
  const block = buildCVContextBlock(state);
  const content = block ? `${text}\n\n${block}` : text;
  await base44.agents.addMessage(conversation, { role: "user", content });
  return { ok: true };
}