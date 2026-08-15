/**
 * tailoredLookup — بحث نقيّ عن نسخة مخصّصة قائمة لنفس (Master + وظيفة).
 *
 * لا Schema جديد ولا مفتاح مطابقة مُختَرع: نعتمد فقط على ما هو مخزون فعلاً في SavedCV:
 *   1) jobApplicationId — هوية مستقرّة عند توفّرها (الأقوى).
 *   2) عنوان النسخة (titel) المطابق تماماً للعنوان الذي سيُولَّد لهذه الوظيفة — هوية ضعيفة
 *      لكنها كل المتاح عندما لا يوجد JobApplication. تُوسم weak ليقرّر المستخدم.
 * لا يكتب ولا يحذف شيئاً؛ ولا يستنتج أي هوية أخرى.
 */
import { tailoredChildrenOf } from "@/lib/cvProfiles";

/**
 * @returns {{existing:object|null, identity:"jobApplicationId"|"titel"|"none"}}
 */
export function findExistingTailored({ list, baseId, jobApplicationId, expectedTitel } = {}) {
  const children = tailoredChildrenOf(list, baseId);
  if (jobApplicationId) {
    const hit = children.find((r) => r.jobApplicationId === jobApplicationId);
    return { existing: hit || null, identity: "jobApplicationId" };
  }
  const wanted = String(expectedTitel || "").trim();
  if (wanted) {
    const hit = children.find((r) => String(r.titel || "").trim() === wanted);
    if (hit) return { existing: hit, identity: "titel" };
  }
  return { existing: null, identity: wanted ? "titel" : "none" };
}

export default findExistingTailored;