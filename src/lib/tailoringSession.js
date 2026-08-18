/**
 * tailoringSession — الربط بين Fast Matching ومسار master/tailored ومسار تخصيص الوظيفة الفعلي.
 *
 * قواعد ثابتة:
 *   1) اختيار الأساس صريح دائماً: إمّا اختيار المستخدم (سيرة master محدّدة)، أو أفضل master
 *      عبر Fast Matching المحلي. **لا اختيار عشوائي إطلاقاً** — عند confidence = none نرجع
 *      NO_CONFIDENT_BASE بلا إنشاء أي شيء.
 *   2) عند confidence = weak نُكمل بحذر ونرفع علم cautious ليُبلَّغ الوكيل أن الأساس غير حاسم.
 *   3) النسخة المخصّصة تُنشأ create فقط عبر cvProfiles — الأصل (master) لا يُعدَّل ولا يُلمَس.
 *
 * منطق نقيّ: لا SDK ولا React. المستودع يُمرَّر حقناً.
 */
import { isMaster, isTailored, pickBestBaseCV, createTailoredCV, tailoredJobSimilarity, TAILORED_SOURCE_THRESHOLD } from "@/lib/cvProfiles";

/**
 * يحدّد نسخة الأساس (master) لهذه الجلسة.
 * @returns {{base:object|null, source:"explicit"|"parent"|"match", confidence:"explicit"|"strong"|"weak"|"none", cautious:boolean, margin:number, ranked:Array, error?:string}}
 */
export function resolveBaseCV({ list, preferredId, ad } = {}) {
  const all = Array.isArray(list) ? list : [];
  const preferred = preferredId ? all.find((r) => r?.id === preferredId) : null;

  // اختيار المستخدم الصريح يُحترم كما هو — لا مطابقة ولا استبدال.
  if (preferred && isMaster(preferred)) {
    return { base: preferred, source: "explicit", confidence: "explicit", cautious: false, margin: 0, ranked: [] };
  }

  // السيرة المخصّصة يمكن أن تكون مصدرًا لتخصيص جديد إذا كانت الوظيفة الجديدة
  // من نفس العائلة المهنية. إذا كانت مختلفة بوضوح نرجع إلى السيرة الأصلية المحسنة.
  if (preferred && isTailored(preferred)) {
    const similarity = tailoredJobSimilarity(preferred, ad);
    if (similarity >= TAILORED_SOURCE_THRESHOLD) {
      return { base: preferred, source: "selected_tailored", confidence: "strong", cautious: false, margin: similarity, ranked: [], similarity };
    }
    const master = all.find((r) => r?.id === preferred.sourceMasterCvId && isMaster(r))
      || all.find((r) => r?.id === preferred.parentCvId && isMaster(r));
    if (master) {
      return { base: master, source: "original_master", confidence: similarity > 0 ? "weak" : "explicit", cautious: similarity > 0, margin: similarity, ranked: [], similarity };
    }
  }

  const picked = pickBestBaseCV(all, ad);
  if (!picked.best || picked.confidence === "none") {
    return { base: null, source: "match", confidence: "none", cautious: false, margin: picked.margin, ranked: picked.ranked, error: "NO_CONFIDENT_BASE" };
  }
  return {
    base: picked.best,
    source: "match",
    confidence: picked.confidence,
    cautious: picked.confidence === "weak",
    margin: picked.margin,
    ranked: picked.ranked,
  };
}

/**
 * يبدأ جلسة تخصيص: يحدّد الأساس ثم ينشئ نسخة tailored مستقلة عنه.
 * @param {{repository:{create:Function}, list:Array, preferredId?:string, ad?:object, jobApplicationId?:string}} args
 */
export async function startTailoringSession({ repository, list, preferredId, ad, jobApplicationId } = {}) {
  const resolved = resolveBaseCV({ list, preferredId, ad });
  if (!resolved.base) return { error: resolved.error || "NO_CONFIDENT_BASE", resolved };
  const { created, error } = await createTailoredCV(repository, { base: resolved.base, ad, jobApplicationId });
  if (error) return { error, resolved };
  return { tailored: created, base: resolved.base, source: resolved.source, confidence: resolved.confidence, cautious: resolved.cautious, resolved };
}

/** إعلان وظيفة مبسّط من نصّ المستخدم — بلا نموذج لغوي، للمطابقة المحلية فقط */
export const adFromUserText = (text) => ({ rubrik: String(text || "").slice(0, 160), beskrivning: String(text || "") });