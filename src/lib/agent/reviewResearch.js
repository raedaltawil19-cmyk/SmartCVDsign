/**
 * reviewResearch — قناة أخوية لنتائج البحث الخارجي المجهَّزة مسبقاً (CV_RESEARCH).
 *
 * قواعد معمارية (بالتصميم لا بالتعليق):
 * - منطق نقيّ بالكامل: لا React، لا base44، لا شبكة، لا SavedCV، لا أدوات تعديل.
 *   هذه الطبقة **لا تبحث** ولا تستدعي ResearchPublicSource؛ البحث يحدث في مرحلة
 *   المراجعة داخل cv_review_coach، وهنا يُستخرج ما وصل فقط.
 * - **لا تمسّ عقد CV_REVIEW**: كتلة مستقلة تماماً، وملف مستقلّ عن cvReviewParser.
 * - fail-closed: أي خلل في الكتلة ⇒ يُهمَل **البحث وحده** (null)، ولا يتأثر CV_REVIEW.
 * - لا ترمي استثناءً أبداً: كل مسار خطأ يعيد null.
 * - المعلومة الناتجة معلومة عامة خارجية (external_source)، ولا تصبح حقيقة عن المرشَّح
 *   إلا عبر مسار التأكيد القائم (reviewEvidence) وبضغطة المستخدم.
 */

export const RESEARCH_OPEN = "<<<CV_RESEARCH";
export const RESEARCH_CLOSE = "CV_RESEARCH>>>";

/** الحالات المسموحة — لا ثالث لهما */
export const RESEARCH_STATUSES = ["ready", "no_source"];
/** حقول المصدر: ما تُعيده ResearchPublicSource فعلاً، بلا حقل واحد إضافي */
export const SOURCE_FIELDS = ["title", "url", "publisher", "sourceType", "isPrimary", "retrievedContent", "retrievalStatus"];
/** تصنيفات المصادر كما تُنتجها الأداة */
export const SOURCE_TYPES = ["official_authority", "official_document", "educational", "secondary", "unknown"];
/** الأداة لا تُخرج مصدراً إلا مجلوباً فعلاً */
export const RETRIEVAL_STATUSES = ["fetched"];
export const ENTRY_FIELDS = ["status", "sources"];
export const MAX_ENTRIES = 7;
export const MAX_SOURCES = 5;

const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const isFilledString = (v) => typeof v === "string" && v.trim() !== "";
const isHttpUrl = (v) => isFilledString(v) && /^https?:\/\//i.test(v.trim());

/** تحقّق مصدر واحد — يعيد false على أي نقص أو حقل غريب أو نوع خاطئ */
function isValidSource(src) {
  if (!isPlainObject(src)) return false;
  const keys = Object.keys(src);
  if (SOURCE_FIELDS.some((f) => !keys.includes(f))) return false;
  if (keys.some((k) => !SOURCE_FIELDS.includes(k))) return false;
  if (!isFilledString(src.title)) return false;
  if (!isHttpUrl(src.url)) return false;
  if (!isFilledString(src.publisher)) return false;
  if (!SOURCE_TYPES.includes(src.sourceType)) return false;
  if (typeof src.isPrimary !== "boolean") return false;
  if (!isFilledString(src.retrievedContent)) return false;
  if (!RETRIEVAL_STATUSES.includes(src.retrievalStatus)) return false;
  return true;
}

/** تحقّق مدخل توصية واحدة */
function isValidEntry(entry) {
  if (!isPlainObject(entry)) return false;
  const keys = Object.keys(entry);
  if (ENTRY_FIELDS.some((f) => !keys.includes(f))) return false;
  if (keys.some((k) => !ENTRY_FIELDS.includes(k))) return false;
  if (!RESEARCH_STATUSES.includes(entry.status)) return false;
  if (!Array.isArray(entry.sources)) return false;
  if (entry.sources.length > MAX_SOURCES) return false;
  if (entry.sources.some((s) => !isValidSource(s))) return false;
  // الحالة يجب أن يسندها محتواها: "ready" بلا مصدر واحد على الأقل ليست جاهزة
  if (entry.status === "ready" && entry.sources.length === 0) return false;
  if (entry.status === "no_source" && entry.sources.length > 0) return false;
  return true;
}

/**
 * تحقّق خريطة البحث كاملة — fail-closed على مستوى الكتلة:
 * أي مدخل غير صالح ⇒ تُهمَل الكتلة بالكامل (null)، ولا تُقبل جزئياً.
 * @returns {object|null}
 */
export function validateResearch(map) {
  if (!isPlainObject(map)) return null;
  const ids = Object.keys(map);
  if (ids.length === 0) return null;
  if (ids.length > MAX_ENTRIES) return null;
  for (const id of ids) {
    if (!isFilledString(id)) return null; // معرّف التوصية
    if (!isValidEntry(map[id])) return null;
  }
  return map;
}

/**
 * يستخرج خريطة البحث من نصّ رسالة الوكيل.
 * @returns {object|null} null إن غابت الكتلة، أو لم تُغلق بعد، أو تعذّر تحليلها، أو خرقت العقد.
 */
export function extractResearch(content) {
  const text = String(content || "");
  const start = text.indexOf(RESEARCH_OPEN);
  if (start === -1) return null;
  const end = text.indexOf(RESEARCH_CLOSE, start + RESEARCH_OPEN.length);
  if (end === -1) return null; // الكتلة لم تُغلق ⇒ لا بحث، ولا إصلاح
  const raw = text.slice(start + RESEARCH_OPEN.length, end).trim();
  if (!raw) return null;
  try {
    return validateResearch(JSON.parse(raw));
  } catch {
    return null; // JSON تالف ⇒ يُهمَل البحث وحده
  }
}

/** يحذف كتلة CV_RESEARCH من النصّ البشري ويُبقي ما حولها كما هو */
export function stripResearch(content) {
  const text = String(content || "");
  const start = text.indexOf(RESEARCH_OPEN);
  if (start === -1) return text;
  const end = text.indexOf(RESEARCH_CLOSE, start + RESEARCH_OPEN.length);
  if (end === -1) return text.slice(0, start).trim();
  return (text.slice(0, start) + text.slice(end + RESEARCH_CLOSE.length)).trim();
}

/** قراءة بحث توصية واحدة — بلا أي أثر جانبي */
export function researchFor(map, recommendationId) {
  if (!isPlainObject(map) || !isFilledString(recommendationId)) return null;
  const entry = map[recommendationId];
  return isValidEntry(entry) ? entry : null;
}

export default extractResearch;