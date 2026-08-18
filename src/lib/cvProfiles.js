/**
 * cvProfiles — المسار الصريح بين CV Profile الأساسي (master) والنسخ المخصّصة (tailored).
 *
 * ثلاثة ضمانات معمارية:
 *   1) **لا تعديل على أي نسخة قائمة**: إنشاء نسخة مخصّصة = create فقط. لا update ولا حذف ولا كتابة
 *      على الأصل — ولا حتى حقل واحد. هذا مفروض بأن الوحدة لا تستدعي سوى repository.create.
 *   2) **استقلال النسخ**: البيانات تُنسخ نسخاً عميقاً، فتعديل النسخة لاحقاً لا يلمس الأصل.
 *   3) **اختيار الأساس بلا نموذج لغوي**: الترتيب عبر Fast Matching المحلي في jobMatcher.js فقط.
 *
 * منطق نقيّ: لا SDK ولا React ولا نموذج لغوي. المستودع يُمرَّر حقناً (dependency injection).
 */
import { localMatchScore, matchDetails } from "@/lib/jobMatcher";

export const MASTER = "master";
export const TAILORED = "tailored";

/** فارق الدرجة الذي دونه يصبح الاختيار غير حاسم */
export const WEAK_MARGIN = 8;

/** تشابه الوظيفة الحالية مع الوظيفة التي خُصصت لها نسخة Tailored. */
export function tailoredJobSimilarity(record, ad) {
  if (!isTailored(record)) return 0;
  const oldText = [record.tailoredForJobTitle, record.tailoredForCompany, record.tailoredForJobDescription].filter(Boolean).join(" ").toLowerCase();
  const newText = [ad?.rubrik, ad?.beskrivning, (ad?.krav || []).map((k) => k?.namn).join(" ")].filter(Boolean).join(" ").toLowerCase();
  if (!oldText || !newText) return 0;
  const tokens = (s) => new Set(s.split(/[^a-zåäö0-9]+/i).filter((x) => x.length > 2));
  const a = tokens(oldText); const b = tokens(newText);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  return Math.round(100 * (2 * intersection) / (a.size + b.size));
}

export const TAILORED_SOURCE_THRESHOLD = 35;

/**
 * نوع السيرة. السجلات القديمة قد لا تحمل cvType — تُعتبر master بالاستنتاج،
 * ولا يُكتب أي شيء في قاعدة البيانات لتصحيحها.
 */
export function cvTypeOf(rec) {
  return rec?.cvType === TAILORED ? TAILORED : MASTER;
}

export const isMaster = (rec) => cvTypeOf(rec) === MASTER;
export const isTailored = (rec) => cvTypeOf(rec) === TAILORED;

/** النسخ الأساسية المرشّحة لأن تكون أساساً لتخصيص جديد */
export function baseCandidates(list) {
  return (Array.isArray(list) ? list : []).filter(isMaster);
}

/**
 * ترتيب النسخ الأساسية أمام إعلان وظيفة — Fast Matching محلي بالكامل.
 * كسر التعادل: الأحدث تحديثاً أولاً.
 */
export function rankBaseCVs(list, ad) {
  return baseCandidates(list)
    .map((rec) => {
      const d = matchDetails(rec?.data, ad);
      return { id: rec.id, titel: rec.titel, cvType: cvTypeOf(rec), score: d.score, titleHits: d.titleHits, per: d.per, record: rec };
    })
    .sort((a, b) => b.score - a.score || String(b.record?.updated_date || "").localeCompare(String(a.record?.updated_date || "")));
}

/**
 * أفضل نسخة أساس لهذه الوظيفة.
 * @returns {{best:object|null, score:number, margin:number, confidence:"none"|"weak"|"strong", ranked:Array}}
 */
export function pickBestBaseCV(list, ad) {
  const ranked = rankBaseCVs(list, ad);
  if (ranked.length === 0) return { best: null, score: 0, margin: 0, confidence: "none", ranked };
  const [top, second] = ranked;
  const margin = second ? top.score - second.score : top.score;
  const confidence = top.score === 0 ? "none" : margin >= WEAK_MARGIN ? "strong" : "weak";
  return { best: top.record, score: top.score, margin, confidence, ranked };
}

const deepCopy = (v) => (v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)));

/**
 * حِمل إنشاء نسخة مخصّصة — كائن جديد بالكامل مشتقّ من الأساس، بلا أي مرجع مشترك معه.
 * لا يعدّل base إطلاقاً.
 */
export function buildTailoredPayload({ base, ad, jobApplicationId } = {}) {
  if (!base || !base.id || !base.data) return { error: "BASE_CV_INVALID" };
  const jobTitle = String(ad?.rubrik || "").trim();
  return {
    payload: {
      titel: jobTitle ? `${base.titel || "CV"} — ${jobTitle}`.slice(0, 120) : `${base.titel || "CV"} — نسخة مخصّصة`,
      data: deepCopy(base.data),
      templateId: base.templateId,
      layout: deepCopy(base.layout),
      templateSource: base.templateSource || "auto",
      templateReviewStatus: base.templateReviewStatus || "skipped",
      cvType: TAILORED,
      parentCvId: base.id,
      sourceMasterCvId: isMaster(base) ? base.id : (base.sourceMasterCvId || base.parentCvId || undefined),
      tailoredForJobTitle: jobTitle || undefined,
      tailoredForCompany: ad?.arbetsgivare || ad?.company || undefined,
      tailoredForJobDescription: String(ad?.beskrivning || "").slice(0, 6000) || undefined,
      jobApplicationId: jobApplicationId || undefined,
    },
  };
}

/**
 * ينشئ النسخة المخصّصة عبر المستودع المُمرَّر. **create فقط** — الأصل لا يُمَسّ.
 * @param {{create:Function}} repository
 */
export async function createTailoredCV(repository, args) {
  const built = buildTailoredPayload(args);
  if (built.error) return { error: built.error };
  const created = await repository.create(built.payload);
  return { created };
}

/** النسخ المخصّصة المشتقّة من نسخة أساس بعينها */
export function tailoredChildrenOf(list, baseId) {
  return (Array.isArray(list) ? list : []).filter((r) => isTailored(r) && r.parentCvId === baseId);
}

export { localMatchScore };