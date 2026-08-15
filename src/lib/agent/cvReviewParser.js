/**
 * cvReviewParser — استخراج وتحقّق كتلة CV_REVIEW الصادرة عن cv_review_coach.
 *
 * قواعد معمارية:
 * - منطق نقيّ بالكامل (Pure Logic): لا base44، لا SavedCV، لا cvRepository، لا React،
 *   لا navigate، لا Agent API، لا UI، لا smartAssistantAction، ولا أي أداة تعديل سيرة.
 * - fail-closed على نمط TEMPLATE_DECISION: أي نقص أو خطأ ⇒ ready:false. لا fallback،
 *   ولا إصلاح JSON تلقائي، ولا مطابقة تقريبية، ولا قبول جزئي.
 * - لا يقرأ قاعدة بيانات ولا يعدّل شيئاً، ولا يحوّل التوصيات إلى CV_ACTION.
 * - مصدر الأقسام: ALL_SECTION_KEYS في cvIndex.js (بلا قائمة ثانية موازية).
 */
import { ALL_SECTION_KEYS, FIELD_ROLES } from "@/lib/agent/cvIndex";

export const REVIEW_OPEN = "<<<CV_REVIEW";
export const REVIEW_CLOSE = "CV_REVIEW>>>";

/** قوائم مغلقة مطابقة لعقد cv_review_coach.jsonc — لا اختراع أنواع */
export const REVIEW_STATUSES = ["no_improvement", "improvements_found"];
export const RECOMMENDATION_TYPES = ["content", "structure", "layout", "ats", "positioning", "job_alignment", "language"];
export const SEVERITIES = ["necessary", "valuable", "cosmetic"];
/** أقسام السيرة الفعلية + "layout" كهدف بنيوي منصوص عليه في العقد */
export const TARGET_SECTIONS = [...ALL_SECTION_KEYS, "layout"];
export const RECOMMENDATION_FIELDS = ["id", "type", "severity", "title", "problem", "why", "recommendation", "target", "dependsOn"];
/** حقول اختيارية معرَّفة في العقد — وجودها لا يُسقط المراجعة، وغيابها لا يُسقطها */
export const OPTIONAL_RECOMMENDATION_FIELDS = ["evidencePack"];
/** مفاتيح الهدف المسموحة — field يجعل الهدف دقيقاً على مستوى الحقل */
export const TARGET_KEYS = ["section", "itemRef", "field"];
/** عقد حزمة الأدلّة المجهَّزة مسبقاً في مرحلة المراجعة (تشخيص فقط) */
export const EVIDENCE_STATUSES = ["ready", "needs_user", "not_needed"];
export const EVIDENCE_CONFIDENCES = ["high", "medium", "low"];
export const EVIDENCE_FIELDS = ["status", "assessment", "existing", "relevant", "missing", "draft", "userConfirmationRequired"];
export const EVIDENCE_LIST_FIELDS = ["existing", "relevant", "missing", "userConfirmationRequired"];
export const ASSESSMENT_FIELDS = ["isValidRecommendation", "reason", "confidence"];
/** الأقسام التي تُلزم توصيات المحتوى فيها بحزمة أدلّة */
export const EVIDENCE_REQUIRED_SECTIONS = ["profil", "erfarenhet", "utbildning"];
export const REVIEW_FIELDS = ["reviewStatus", "summary", "recommendations"];
export const MAX_RECOMMENDATIONS = 7;

const fail = (error) => ({ ready: false, review: null, error });
const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const isFilledString = (v) => typeof v === "string" && v.trim() !== "";

/**
 * يستخرج كائن الكتلة من نصّ الرسالة.
 * @returns {object|null} null إن غابت الافتتاحية، أو لم تُغلق بعد (بثّ جارٍ)، أو تعذّر تحليل JSON.
 */
export function extractCVReview(content) {
  const text = String(content || "");
  const start = text.indexOf(REVIEW_OPEN);
  if (start === -1) return null;
  const end = text.indexOf(REVIEW_CLOSE, start + REVIEW_OPEN.length);
  if (end === -1) return null; // الكتلة لم تُغلق → ليست مراجعة
  const raw = text.slice(start + REVIEW_OPEN.length, end).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null; // JSON جزئي أو تالف → لا مراجعة، ولا إصلاح
  }
}

/** يحذف كتلة CV_REVIEW ويُبقي الشرح البشري كما هو */
export function stripCVReview(content) {
  const text = String(content || "");
  const start = text.indexOf(REVIEW_OPEN);
  if (start === -1) return text;
  const end = text.indexOf(REVIEW_CLOSE, start + REVIEW_OPEN.length);
  if (end === -1) return text.slice(0, start).trim();
  return (text.slice(0, start) + text.slice(end + REVIEW_CLOSE.length)).trim();
}

/** كل معرّفات العناصر الموجودة في CV_INDEX المُمرَّر (مخرج summarizeIndex) */
function collectIndexItemIds(cvIndex) {
  const sections = Array.isArray(cvIndex) ? cvIndex : Array.isArray(cvIndex?.sections) ? cvIndex.sections : null;
  if (!sections) return null; // فهرس غير متاح أو غير معروف الشكل → لا تخمين
  const ids = new Set();
  for (const s of sections) {
    for (const item of Array.isArray(s?.items) ? s.items : []) {
      if (isFilledString(item?.id)) ids.add(item.id);
    }
  }
  return ids;
}

/**
 * تحقّق حزمة الأدلّة — fail-closed: أي نقص أو حقل غريب أو نوع خاطئ ⇒ خطأ.
 * لا إصلاح تلقائي، ولا قبول جزئي، ولا استنتاج للحالة.
 */
function validateEvidencePack(pack, at) {
  if (!isPlainObject(pack)) return `${at}.evidencePack: NOT_AN_OBJECT`;
  const keys = Object.keys(pack);
  const missing = EVIDENCE_FIELDS.filter((f) => !keys.includes(f));
  if (missing.length) return `${at}.evidencePack: MISSING_FIELDS(${missing.join(",")})`;
  const extra = keys.filter((k) => !EVIDENCE_FIELDS.includes(k));
  if (extra.length) return `${at}.evidencePack: UNKNOWN_FIELDS(${extra.join(",")})`;

  if (!EVIDENCE_STATUSES.includes(pack.status)) return `${at}.evidencePack: STATUS_INVALID`;

  const a = pack.assessment;
  if (!isPlainObject(a)) return `${at}.evidencePack.assessment: NOT_AN_OBJECT`;
  const aKeys = Object.keys(a);
  const aMissing = ASSESSMENT_FIELDS.filter((f) => !aKeys.includes(f));
  if (aMissing.length) return `${at}.evidencePack.assessment: MISSING_FIELDS(${aMissing.join(",")})`;
  const aExtra = aKeys.filter((k) => !ASSESSMENT_FIELDS.includes(k));
  if (aExtra.length) return `${at}.evidencePack.assessment: UNKNOWN_FIELDS(${aExtra.join(",")})`;
  // توصية غير صالحة لا تُعرض إطلاقاً — لا حالة عرض لها
  if (a.isValidRecommendation !== true) return `${at}.evidencePack.assessment: NOT_A_VALID_RECOMMENDATION`;
  if (!isFilledString(a.reason)) return `${at}.evidencePack.assessment: REASON_INVALID`;
  if (!EVIDENCE_CONFIDENCES.includes(a.confidence)) return `${at}.evidencePack.assessment: CONFIDENCE_INVALID`;

  for (const f of EVIDENCE_LIST_FIELDS) {
    if (!Array.isArray(pack[f])) return `${at}.evidencePack.${f}: NOT_ARRAY`;
    if (pack[f].some((v) => !isFilledString(v))) return `${at}.evidencePack.${f}: ITEM_INVALID`;
  }
  if (pack.draft !== null && !isFilledString(pack.draft)) return `${at}.evidencePack: DRAFT_INVALID`;

  // اتساق الحالة مع محتواها — لا تُقبل حالة تدّعي شيئاً لا يسنده المحتوى
  if (pack.status === "ready" && !isFilledString(pack.draft) && pack.userConfirmationRequired.length === 0) {
    return `${at}.evidencePack: READY_WITHOUT_DRAFT`;
  }
  if (pack.status === "needs_user" && pack.missing.length === 0 && pack.userConfirmationRequired.length === 0) {
    return `${at}.evidencePack: NEEDS_USER_WITHOUT_REQUEST`;
  }
  if (pack.status === "not_needed" && (pack.missing.length > 0 || pack.userConfirmationRequired.length > 0)) {
    return `${at}.evidencePack: NOT_NEEDED_WITH_REQUEST`;
  }
  return null;
}

/** تحقّق توصية واحدة — يعيد رسالة الخطأ أو null */
function validateRecommendation(rec, i, indexIds) {
  const at = `recommendations[${i}]`;
  if (!isPlainObject(rec)) return `${at}: NOT_AN_OBJECT`;

  const keys = Object.keys(rec);
  const missing = RECOMMENDATION_FIELDS.filter((f) => !keys.includes(f));
  if (missing.length) return `${at}: MISSING_FIELDS(${missing.join(",")})`;
  const extra = keys.filter((k) => !RECOMMENDATION_FIELDS.includes(k) && !OPTIONAL_RECOMMENDATION_FIELDS.includes(k));
  if (extra.length) return `${at}: UNKNOWN_FIELDS(${extra.join(",")})`;

  if (!isFilledString(rec.id)) return `${at}: ID_INVALID`;
  if (!RECOMMENDATION_TYPES.includes(rec.type)) return `${at}: TYPE_INVALID`;
  if (!SEVERITIES.includes(rec.severity)) return `${at}: SEVERITY_INVALID`;
  for (const f of ["title", "problem", "why", "recommendation"]) {
    if (!isFilledString(rec[f])) return `${at}: ${f.toUpperCase()}_INVALID`;
  }

  if (!isPlainObject(rec.target)) return `${at}: TARGET_NOT_AN_OBJECT`;
  const targetKeys = Object.keys(rec.target);
  const unknownTargetKeys = targetKeys.filter((k) => !TARGET_KEYS.includes(k));
  if (unknownTargetKeys.length) return `${at}: TARGET_UNKNOWN_FIELDS(${unknownTargetKeys.join(",")})`;
  if (!TARGET_SECTIONS.includes(rec.target.section)) return `${at}: TARGET_SECTION_INVALID`;

  // field: اسم حقل حقيقي في هذا القسم فقط — لا تخمين ولا حقل من قسم آخر
  if (targetKeys.includes("field")) {
    const roles = FIELD_ROLES[rec.target.section];
    if (!roles || !isFilledString(rec.target.field)) return `${at}: TARGET_FIELD_INVALID`;
    if (!Object.keys(roles).includes(rec.target.field)) return `${at}: TARGET_FIELD_NOT_IN_SECTION`;
  }

  if (targetKeys.includes("itemRef")) {
    if (!isFilledString(rec.target.itemRef)) return `${at}: ITEM_REF_INVALID`;
    // itemRef يُقبل فقط إذا أمكن التحقّق منه فعلاً في CV_INDEX — بلا تخمين وبلا مطابقة تقريبية
    if (!indexIds) return `${at}: ITEM_REF_UNVERIFIABLE`;
    if (!indexIds.has(rec.target.itemRef)) return `${at}: ITEM_REF_NOT_IN_INDEX`;
  }

  if (!Array.isArray(rec.dependsOn)) return `${at}: DEPENDS_ON_NOT_ARRAY`;
  if (rec.dependsOn.some((d) => !isFilledString(d))) return `${at}: DEPENDS_ON_ITEM_INVALID`;
  if (rec.dependsOn.includes(rec.id)) return `${at}: SELF_DEPENDENCY`;

  // حزمة الأدلّة: إلزامية لتوصيات المحتوى في الأقسام النصّية، ومُتحقَّق منها كلما وُجدت
  const needsPack = rec.type === "content" && EVIDENCE_REQUIRED_SECTIONS.includes(rec.target.section);
  if (keys.includes("evidencePack")) {
    const err = validateEvidencePack(rec.evidencePack, at);
    if (err) return err;
  } else if (needsPack) {
    return `${at}: EVIDENCE_PACK_MISSING`;
  }

  return null;
}

/**
 * تحقّق صارم من كائن المراجعة مقابل العقد.
 * @param {object} review الكائن المستخرج
 * @param {object} [context] { templateId?, cvIndex? } — للتحقّق الإضافي فقط
 * @returns {{ok:true, review:object}|{ok:false, error:string}}
 */
export function validateCVReview(review, context) {
  if (!isPlainObject(review)) return { ok: false, error: "NOT_AN_OBJECT" };

  const keys = Object.keys(review);
  const missing = REVIEW_FIELDS.filter((f) => !keys.includes(f));
  if (missing.length) return { ok: false, error: `MISSING_FIELDS(${missing.join(",")})` };
  const extra = keys.filter((k) => !REVIEW_FIELDS.includes(k));
  if (extra.length) return { ok: false, error: `UNKNOWN_FIELDS(${extra.join(",")})` };

  if (!REVIEW_STATUSES.includes(review.reviewStatus)) return { ok: false, error: "REVIEW_STATUS_INVALID" };
  if (!isFilledString(review.summary)) return { ok: false, error: "SUMMARY_INVALID" };
  if (!Array.isArray(review.recommendations)) return { ok: false, error: "RECOMMENDATIONS_NOT_ARRAY" };

  const list = review.recommendations;
  if (review.reviewStatus === "no_improvement" && list.length !== 0) return { ok: false, error: "NO_IMPROVEMENT_WITH_RECOMMENDATIONS" };
  if (review.reviewStatus === "improvements_found" && list.length === 0) return { ok: false, error: "IMPROVEMENTS_FOUND_WITHOUT_RECOMMENDATIONS" };
  if (list.length > MAX_RECOMMENDATIONS) return { ok: false, error: "TOO_MANY_RECOMMENDATIONS" };

  const indexIds = context && "cvIndex" in context ? collectIndexItemIds(context.cvIndex) : null;

  for (let i = 0; i < list.length; i++) {
    const err = validateRecommendation(list[i], i, indexIds);
    if (err) return { ok: false, error: err };
  }

  const ids = list.map((r) => r.id);
  if (new Set(ids).size !== ids.length) return { ok: false, error: "DUPLICATE_RECOMMENDATION_ID" };

  return { ok: true, review };
}

/**
 * المسار الكامل: استخراج ثم تحقّق. fail-closed في كل خطوة.
 * @param {string} content نصّ رسالة الوكيل (قد يكون بثّاً جزئياً)
 * @param {object} [context] { templateId?, cvIndex? }
 * @returns {{ready:boolean, review:object|null, error:string|null}}
 */
export function parseCVReview(content, context) {
  const parsed = extractCVReview(content);
  if (!parsed) return fail("NOT_READY");
  const check = validateCVReview(parsed, context);
  if (!check.ok) return fail(check.error);
  return { ready: true, review: check.review, error: null };
}

export default parseCVReview;