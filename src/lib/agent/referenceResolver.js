/**
 * CV Understanding Engine — حلّ الإشارات السياقية.
 * "هذا"، "هذه"، "اللي فوق"، "اللي بعدها"، "احذفها"… تُحلّ بالاعتماد على
 * آخر عنصر تحدث عنه المستخدم + بنية النموذج (وليس القالب).
 */
import { normalizeText, getByRef } from "./cvIndex";

const PRONOUNS = ["هذا", "هذه", "هذي", "ذلك", "تلك", "هالشي", "den", "det", "denna", "detta", "this", "that", "it"];
const SUFFIX_HINTS = ["ها", "ه", "هم", "هن"]; // احذفها / رجعها / وصفها
const ABOVE = ["فوق", "اللي فوق", "أعلى", "السابق", "السابقة", "قبلها", "قبله", "ovanför", "föregående", "previous", "above"];
const BELOW = ["تحت", "اللي تحت", "بعدها", "بعده", "التالي", "التالية", "nedanför", "nästa", "next", "below"];

const hasAny = (n, words) => words.some((w) => n.includes(normalizeText(w)));

const neighbor = (index, ref, delta) => {
  const found = getByRef(index, ref);
  if (!found || !found.item) return null;
  const sec = found.section;
  const next = sec.items[found.item.index + delta];
  return next ? next.id : null;
};

/**
 * يحدد ما إذا كان النص يعتمد على السياق، ويحاول حلّه.
 * @returns {{ isReference: boolean, ref?: string, reason?: string, status: "resolved"|"needs_clarification"|"none" }}
 */
export function resolveReference(text, { index, lastItemRef } = {}) {
  const n = normalizeText(text);
  if (!n) return { isReference: false, status: "none" };

  const relativeAbove = hasAny(n, ABOVE);
  const relativeBelow = hasAny(n, BELOW);
  const pronoun =
    hasAny(n, PRONOUNS) ||
    SUFFIX_HINTS.some((s) => new RegExp(`(?:احذف|امسح|رجع|عدل|اختصر|حسن|وصف|شوف|اظهر)${s}\\b`).test(n));

  if (!relativeAbove && !relativeBelow && !pronoun) return { isReference: false, status: "none" };

  if (!lastItemRef || !index) {
    return { isReference: true, status: "needs_clarification", reason: "no_previous_target" };
  }

  if (relativeAbove || relativeBelow) {
    const ref = neighbor(index, lastItemRef, relativeAbove ? -1 : 1);
    if (!ref) return { isReference: true, status: "needs_clarification", reason: "no_neighbor" };
    return { isReference: true, status: "resolved", ref, reason: relativeAbove ? "previous_item" : "next_item" };
  }

  return { isReference: true, status: "resolved", ref: lastItemRef, reason: "pronoun_to_last_target" };
}