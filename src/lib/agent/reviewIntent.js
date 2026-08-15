/**
 * reviewIntent — M6: تحويل توصية اختارها المستخدم (من CV_REVIEW) إلى Intent داخلي منظّم
 * يُسلَّم إلى Smart CV Assistant وحده.
 *
 * قواعد معمارية (بالتصميم لا بالتعليق):
 * - منطق نقيّ: لا base44، لا SavedCV، لا cvRepository، لا React، لا UI،
 *   ولا استدعاء لأي أداة تعديل (cvEditContentTool / cvMoveSectionTool) من هنا.
 * - لا ينفّذ شيئاً ولا يكتب شيئاً: مخرجه نصّ Intent فقط. نقطة التنفيذ الوحيدة تبقى
 *   executeAssistantAction داخل مسار Smart CV Assistant.
 * - fail-closed: أي توصية غير مختارة، أو هدف غير قابل للتحقّق في الحالة الحالية،
 *   أو تبعية غير مختارة ⇒ تُرفض ولا يُبنى لها Intent. لا تخمين ولا مطابقة تقريبية.
 * - المصدر الوحيد لقائمة الأقسام والحقول هو cvReviewParser (بلا قائمة موازية).
 */
import { TARGET_SECTIONS, RECOMMENDATION_FIELDS, RECOMMENDATION_TYPES, SEVERITIES } from "@/lib/agent/cvReviewParser";

export const INTENT_OPEN = "<<<REVIEW_INTENT";
export const INTENT_CLOSE = "REVIEW_INTENT>>>";

const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const isFilledString = (v) => typeof v === "string" && v.trim() !== "";

/** معرّفات العناصر الموجودة في الفهرس **الحالي** (مخرج summarizeIndex) — null إن تعذّر التعرّف */
export function collectItemIds(indexSummary) {
  const sections = Array.isArray(indexSummary)
    ? indexSummary
    : Array.isArray(indexSummary?.sections) ? indexSummary.sections : null;
  if (!sections) return null;
  const ids = new Set();
  for (const s of sections) {
    for (const item of Array.isArray(s?.items) ? s.items : []) {
      if (isFilledString(item?.id)) ids.add(item.id);
    }
  }
  return ids;
}

/**
 * يبني Intent لتوصية واحدة.
 * @param {object} p
 * @param {object} p.rec التوصية كما جاءت من CV_REVIEW (مُتحقَّق منها مسبقاً بالـparser)
 * @param {string[]} p.selectedIds ما اختاره المستخدم فعلاً
 * @param {string|null} p.cvId
 * @param {string} p.templateId القالب المعروض حالياً
 * @param {*} p.indexSummary فهرس الحالة **الحالية** للسيرة (summarizeIndex)
 * @returns {{ok:true, intent:object}|{ok:false, error:string}}
 */
export function buildReviewIntent({ rec, selectedIds = [], cvId = null, templateId, indexSummary }) {
  if (!isPlainObject(rec)) return { ok: false, error: "RECOMMENDATION_INVALID" };
  if (!isFilledString(rec.id)) return { ok: false, error: "RECOMMENDATION_ID_INVALID" };

  // (B) ما لم يختره المستخدم لا يصل إلى التنفيذ إطلاقاً
  const selected = Array.isArray(selectedIds) ? selectedIds : [];
  if (!selected.includes(rec.id)) return { ok: false, error: "NOT_SELECTED" };

  const missing = RECOMMENDATION_FIELDS.filter((f) => !(f in rec));
  if (missing.length) return { ok: false, error: `MISSING_FIELDS(${missing.join(",")})` };
  if (!RECOMMENDATION_TYPES.includes(rec.type)) return { ok: false, error: "TYPE_INVALID" };
  if (!SEVERITIES.includes(rec.severity)) return { ok: false, error: "SEVERITY_INVALID" };
  for (const f of ["title", "problem", "why", "recommendation"]) {
    if (!isFilledString(rec[f])) return { ok: false, error: `${f.toUpperCase()}_INVALID` };
  }

  // (F) هدف صالح
  if (!isPlainObject(rec.target)) return { ok: false, error: "TARGET_INVALID" };
  if (!TARGET_SECTIONS.includes(rec.target.section)) return { ok: false, error: "TARGET_SECTION_INVALID" };
  if (!isFilledString(templateId)) return { ok: false, error: "TEMPLATE_UNKNOWN" };

  // (G)+(H) الهدف يُتحقَّق منه مقابل الحالة الحالية لا مقابل لقطة المراجعة القديمة
  const hasRef = isFilledString(rec.target.itemRef);
  if (hasRef) {
    const ids = collectItemIds(indexSummary);
    if (!ids) return { ok: false, error: "ITEM_REF_UNVERIFIABLE" };
    if (!ids.has(rec.target.itemRef)) return { ok: false, error: "TARGET_STALE" };
  }

  // (8) التبعية لا تعني موافقة تلقائية: لا تنفيذ ولا إرسال ما لم تُختَر التبعية أيضاً
  const dependsOn = Array.isArray(rec.dependsOn) ? rec.dependsOn : [];
  const unmet = dependsOn.filter((d) => !selected.includes(d));
  if (unmet.length) return { ok: false, error: `DEPENDENCY_NOT_SELECTED(${unmet.join(",")})` };

  return {
    ok: true,
    intent: {
      source: "cv_review_coach",
      recommendationId: rec.id,
      type: rec.type,
      severity: rec.severity,
      title: rec.title,
      problem: rec.problem,
      why: rec.why,
      recommendation: rec.recommendation,
      target: hasRef
        ? { section: rec.target.section, itemRef: rec.target.itemRef }
        : { section: rec.target.section },
      dependsOn,
      cvId,
      context: { templateId, verifiedAgainst: "current_cv_state", itemRefVerified: hasRef }
    }
  };
}

/**
 * يبني Intents للتوصيات المختارة فقط — كل واحدة وحدة مستقلة (7)+(K).
 * @returns {{intents:object[], rejected:{id:string, error:string}[]}}
 */
export function buildSelectedIntents({ review, selectedIds = [], cvId = null, templateId, indexSummary }) {
  const list = Array.isArray(review?.recommendations) ? review.recommendations : [];
  const selected = Array.isArray(selectedIds) ? selectedIds : [];
  const intents = [];
  const rejected = [];
  for (const rec of list) {
    if (!isPlainObject(rec) || !selected.includes(rec.id)) continue; // غير مختارة ⇒ تُهمل بصمت
    const res = buildReviewIntent({ rec, selectedIds: selected, cvId, templateId, indexSummary });
    if (res.ok) intents.push(res.intent);
    else rejected.push({ id: rec.id, error: res.error });
  }
  return { intents, rejected };
}

/**
 * مفتاح تسليم الرسالة — يمنع الإرسال المزدوج **داخل دورة الإرسال نفسها** فقط.
 * عمداً لا يُبنى على (cvId + recommendationId) وحدهما: لو فعل، لَما استطاع المستخدم
 * إرسال التوصية نفسها مرة أخرى في دورة مراجعة جديدة على السيرة نفسها.
 */
export function intentDeliveryKey(cycleId, recommendationId) {
  return `cycle${cycleId}:${recommendationId}`;
}

/** رسائل بشرية لأسباب الرفض — للعرض فقط */
export const INTENT_REJECT_MESSAGES = {
  TARGET_STALE: "تغيّرت السيرة بعد إنشاء هذه التوصية، فلم تُرسَل. أعد المراجعة لتُبنى على الحالة الحالية.",
  ITEM_REF_UNVERIFIABLE: "تعذّر التحقّق من العنصر المقصود في السيرة الحالية، فلم تُرسَل التوصية.",
  TEMPLATE_UNKNOWN: "القالب الحالي غير محدَّد، فلم تُرسَل التوصية."
};

export function describeRejection(error) {
  if (typeof error === "string" && error.startsWith("DEPENDENCY_NOT_SELECTED")) {
    return "هذه التوصية مرتبطة بتوصية أخرى لم تخترها — اخترها أيضاً أو تجاهل هذه.";
  }
  return INTENT_REJECT_MESSAGES[error] || "تعذّر تجهيز هذه التوصية للتنفيذ.";
}

/**
 * يصوغ رسالة التسليم إلى Smart CV Assistant: Intent منظّم لا نصّ عشوائي.
 * الوكيل هو من يقرأ الحالة الحالية ويقرّر الإجراء، والتنفيذ يبقى عبر مساره الحالي.
 */
export function formatIntentMessage(intent) {
  return [
    "توصية مراجعة وافقتُ عليها. اقرأ الحالة الحالية للسيرة من CV_CONTEXT، ثم قرّر الإجراء المناسب ونفّذه بأدواتك المعتمدة.",
    "إن كان الهدف غير موجود في الحالة الحالية، أو كانت التوصية تحتاج معلومات ليست في سيرتي: لا تخترع محتوى ولا تخمّن — اسألني أو ارفض التنفيذ.",
    "نفّذ هذه التوصية وحدها، ولا تلمس شيئاً آخر.",
    `${INTENT_OPEN}\n${JSON.stringify(intent)}\n${INTENT_CLOSE}`
  ].join("\n\n");
}

export default buildReviewIntent;