/**
 * reviewCache — تخزين مؤقّت لنتيجة مراجعة **مكتملة** كما أنتجها cv_review_coach حرفياً.
 *
 * قواعد معمارية (بالتصميم لا بالتعليق):
 * - لا يحلّل ولا يعدّل ولا يفلتر ولا يعيد ترتيب أي توصية أو evidencePack أو بحث خارجي:
 *   يخزّن الكائن كما وصل من الـparser ويعيده كما هو. لا نقص ولا إعادة صياغة.
 * - المفتاح = هوية السيرة + القالب + بصمة محتوى السيرة + نصّ الطلب: أي تغيّر في أيّ منها
 *   يعني مراجعة مختلفة ⇒ لا إصابة كاش ⇒ تُشغَّل مراجعة كاملة جديدة بنفس الجودة.
 * - ذاكرة الجلسة فقط (Map في الوحدة): لا SavedCV، لا localStorage، لا شبكة.
 */

const MAX_ENTRIES = 5;
const store = new Map();

/** بصمة نصّية مستقرّة (djb2) — للمقارنة فقط، لا تُستخدم كبيانات */
function fingerprint(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * مفتاح نسخة المراجعة — null إن كانت الحالة غير كافية (فلا تخزين ولا قراءة).
 */
export function reviewVersionKey({ cvId, templateId, data, userRequest }) {
  if (!cvId || typeof cvId !== "string") return null;
  if (!templateId || typeof templateId !== "string") return null;
  if (!data || typeof data !== "object") return null;
  const request = String(userRequest || "").trim();
  return `${cvId}|${templateId}|${fingerprint(JSON.stringify(data))}|${fingerprint(request)}`;
}

/** نتيجة مكتملة مخزّنة لهذه النسخة، أو null */
export function getCachedReview(key) {
  if (!key) return null;
  return store.get(key) || null;
}

/** تخزين نتيجة مكتملة كما هي (review + النصّ البشري + خريطة البحث) */
export function setCachedReview(key, payload) {
  if (!key || !payload?.review) return;
  store.set(key, payload);
  while (store.size > MAX_ENTRIES) store.delete(store.keys().next().value);
}

export function clearReviewCache() {
  store.clear();
}