/**
 * CV Understanding Engine — البحث السياقي داخل السيرة.
 * يبحث في ثلاث طبقات:
 *   1) قيم الحقول (المحتوى الفعلي)
 *   2) أسماء الحقول وأدوارها ومرادفاتها (يعمل حتى لو كانت القيمة فارغة)
 *   3) أسماء الأقسام ومرادفاتها بعدة لغات
 */
import { normalizeText } from "./cvIndex";

const snippet = (value, query) => {
  const text = String(value || "");
  const i = normalizeText(text).indexOf(normalizeText(query));
  if (i === -1) return text.slice(0, 120);
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + text.slice(start, i + query.length + 60) + (text.length > i + query.length + 60 ? "…" : "");
};

const TITLE_ROLES = ["job_title", "company", "degree", "school", "skill", "language", "full_name", "headline"];

const aliasHit = (aliases, q) => {
  for (const a of aliases || []) {
    const n = normalizeText(a);
    if (!n) continue;
    if (n === q) return 100;
    if (q.includes(n) || n.includes(q)) return 70;
  }
  return 0;
};

/**
 * يبحث عن كلمة/اسم/جزء نص/اسم حقل/اسم قسم داخل السيرة.
 * @returns {Array<{ref, itemRef, section, field, role, matchType, snippet, score, isEmpty}>}
 */
export function searchCV(index, query, { sections } = {}) {
  const q = normalizeText(query);
  if (!q) return [];
  const results = [];

  for (const sec of index.sections) {
    if (sections && !sections.includes(sec.section)) continue;

    // طبقة الأقسام
    const secScore = aliasHit([sec.section, sec.label, sec.labelAr, ...(sec.aliases || [])], q);
    if (secScore) {
      results.push({
        ref: sec.section,
        itemRef: sec.items[0]?.id || null,
        section: sec.section,
        sectionLabel: sec.label,
        field: null,
        role: null,
        itemLabel: sec.label,
        matchType: "section",
        snippet: sec.labelAr,
        isEmpty: sec.isEmpty,
        score: secScore + 20
      });
    }

    for (const item of sec.items) {
      for (const f of item.fields) {
        const val = normalizeText(f.value);
        // طبقة القيم
        if (val && val.includes(q)) {
          const exact = val === q;
          results.push({
            ref: f.id,
            itemRef: item.id,
            section: sec.section,
            sectionLabel: sec.label,
            field: f.field,
            role: f.role,
            itemLabel: item.label,
            matchType: "value",
            snippet: snippet(f.value, query),
            isEmpty: false,
            score: (exact ? 100 : 50) + (TITLE_ROLES.includes(f.role) ? 30 : 0) + Math.max(0, 20 - Math.abs(val.length - q.length) / 10)
          });
          continue;
        }
        // طبقة أسماء الحقول/الأدوار/المرادفات — تعمل أيضًا على الحقول الفارغة
        const fScore = aliasHit(f.aliases, q);
        if (fScore) {
          results.push({
            ref: f.id,
            itemRef: item.id,
            section: sec.section,
            sectionLabel: sec.label,
            field: f.field,
            role: f.role,
            itemLabel: item.label,
            matchType: "field_name",
            snippet: f.isEmpty ? "(tomt)" : snippet(f.value, f.value),
            isEmpty: f.isEmpty,
            // الأقسام ذات العنصر الواحد (kontakt/header/profil) أدق هدفًا من حقول القوائم المتكررة
            score: fScore + (sec.kind === "list" ? -15 : 10)
          });
        }
      }
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

/** أفضل عنصر مطابق (على مستوى العنصر لا الحقل) مع كشف الغموض */
export function resolveItemByText(index, query) {
  const hits = searchCV(index, query).filter((h) => h.itemRef);
  if (hits.length === 0) return { status: "not_found", query };
  const uniq = [];
  for (const h of hits) if (!uniq.some((u) => u.itemRef === h.itemRef)) uniq.push(h);
  if (uniq.length === 1) return { status: "resolved", match: uniq[0] };
  const top = uniq[0];
  const close = uniq.filter((u) => top.score - u.score < 25);
  if (close.length > 1) return { status: "ambiguous", candidates: close.slice(0, 5) };
  return { status: "resolved", match: top };
}

/**
 * أفضل هدف مطابق بأي مستوى: قسم | عنصر | حقل.
 * يستخدمه understandCommand لتثبيت هدف مثل contact_main.telefon أو kontakt.
 */
export function resolveTargetByText(index, query) {
  const hits = searchCV(index, query);
  if (hits.length === 0) return { status: "not_found", query };
  const top = hits[0];
  const close = hits.filter((h) => top.score - h.score < 15 && h.ref !== top.ref);
  // نتائج قريبة داخل نفس العنصر ليست غموضًا حقيقيًا
  const conflicting = close.filter((h) => h.itemRef !== top.itemRef);
  if (conflicting.length > 0) return { status: "ambiguous", candidates: [top, ...conflicting].slice(0, 5) };
  return {
    status: "resolved",
    match: top,
    type: top.matchType === "section" ? "section" : top.field ? "field" : "item"
  };
}