/**
 * CV Understanding Engine — البحث السياقي داخل السيرة.
 * يبحث في القيم فقط (من النموذج) ويعيد المعرّف + الدور الدلالي + السياق.
 */
import { normalizeText } from "./cvIndex";

const snippet = (value, query) => {
  const text = String(value || "");
  const i = normalizeText(text).indexOf(normalizeText(query));
  if (i === -1) return text.slice(0, 120);
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + text.slice(start, i + query.length + 60) + (text.length > i + query.length + 60 ? "…" : "");
};

/**
 * يبحث عن كلمة/اسم/جزء نص داخل السيرة.
 * يعيد قائمة نتائج: { ref, itemRef, section, field, role, itemLabel, snippet, score }
 */
export function searchCV(index, query, { sections } = {}) {
  const q = normalizeText(query);
  if (!q) return [];
  const results = [];
  for (const sec of index.sections) {
    if (sections && !sections.includes(sec.section)) continue;
    for (const item of sec.items) {
      for (const f of item.fields) {
        const val = normalizeText(f.value);
        if (!val || !val.includes(q)) continue;
        const isTitleish = ["job_title", "company", "degree", "school", "skill", "language"].includes(f.role);
        const exact = val === q;
        results.push({
          ref: f.id,
          itemRef: item.id,
          section: sec.section,
          sectionLabel: sec.label,
          field: f.field,
          role: f.role,
          itemLabel: item.label,
          snippet: snippet(f.value, query),
          score: (exact ? 100 : 50) + (isTitleish ? 30 : 0) + Math.max(0, 20 - Math.abs(val.length - q.length) / 10)
        });
      }
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

/** أفضل عنصر مطابق (على مستوى العنصر لا الحقل) مع كشف الغموض */
export function resolveItemByText(index, query) {
  const hits = searchCV(index, query);
  if (hits.length === 0) return { status: "not_found", query };
  const uniq = [];
  for (const h of hits) if (!uniq.some((u) => u.itemRef === h.itemRef)) uniq.push(h);
  if (uniq.length === 1) return { status: "resolved", match: uniq[0] };
  const top = uniq[0];
  const close = uniq.filter((u) => top.score - u.score < 25);
  if (close.length > 1) return { status: "ambiguous", candidates: close.slice(0, 5) };
  return { status: "resolved", match: top };
}