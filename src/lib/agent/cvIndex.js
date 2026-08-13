/**
 * CV Understanding Engine — طبقة الفهرسة.
 * تقرأ نموذج السيرة (cvModel) وتحوّله إلى بنية منظمة يفهمها الوكيل.
 * مصدر الحقيقة هو البيانات فقط — لا HTML ولا CSS ولا قوالب.
 */

export function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[éè]/g, "e")
    .replace(/\s+/g, " ")
    .trim();
}

/** وصف الحقول: نوع دلالي لكل حقل في كل قسم */
export const FIELD_ROLES = {
  profil: { profil: "description" },
  erfarenhet: { roll: "job_title", foretag: "company", period: "date", beskrivning: "description" },
  utbildning: { examen: "degree", skola: "school", period: "date", beskrivning: "description" },
  fardigheter: { namn: "skill", niva: "skill_level" },
  sprak: { sprak: "language", niva: "language_level" }
};

export const SECTION_META = {
  profil: { kind: "text", label: "Profil", labelAr: "الملف الشخصي", titleField: null },
  erfarenhet: { kind: "list", label: "Arbetslivserfarenhet", labelAr: "الخبرات", titleField: "roll" },
  utbildning: { kind: "list", label: "Utbildning", labelAr: "التعليم", titleField: "examen" },
  fardigheter: { kind: "list", label: "Färdigheter", labelAr: "المهارات", titleField: "namn" },
  sprak: { kind: "list", label: "Språk", labelAr: "اللغات", titleField: "sprak" }
};

export const SECTION_KEYS = ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"];

const itemLabel = (section, item) => {
  if (section === "erfarenhet") return [item.roll, item.foretag].filter(Boolean).join(" – ");
  if (section === "utbildning") return [item.examen, item.skola].filter(Boolean).join(" – ");
  if (section === "fardigheter") return item.namn || "";
  if (section === "sprak") return item.sprak || "";
  return "";
};

/**
 * يبني فهرسًا كاملًا للسيرة: أقسام → عناصر → حقول، لكل منها معرّف ثابت.
 * معرّفات: "profil" | "erfarenhet[2]" | "erfarenhet[2].beskrivning"
 */
export function buildCVIndex(data) {
  const d = data || {};
  const sections = [];

  sections.push({
    id: "profil",
    section: "profil",
    kind: "text",
    label: SECTION_META.profil.label,
    labelAr: SECTION_META.profil.labelAr,
    isEmpty: !(d.profil || "").trim(),
    items: [
      {
        id: "profil",
        section: "profil",
        index: 0,
        label: "Profil",
        fields: [{ id: "profil", field: "profil", role: "description", value: d.profil || "" }]
      }
    ]
  });

  for (const key of ["erfarenhet", "utbildning", "fardigheter", "sprak"]) {
    const arr = Array.isArray(d[key]) ? d[key] : [];
    const items = arr.map((item, index) => {
      const roles = FIELD_ROLES[key];
      const fields = Object.keys(roles).map((field) => ({
        id: `${key}[${index}].${field}`,
        field,
        role: roles[field],
        value: item?.[field] ?? ""
      }));
      return {
        id: `${key}[${index}]`,
        section: key,
        index,
        label: itemLabel(key, item || {}),
        isEmpty: fields.every((f) => !String(f.value ?? "").trim()),
        fields
      };
    });
    sections.push({
      id: key,
      section: key,
      kind: "list",
      label: SECTION_META[key].label,
      labelAr: SECTION_META[key].labelAr,
      count: items.length,
      isEmpty: items.length === 0 || items.every((i) => i.isEmpty),
      items
    });
  }

  return { sections, sectionKeys: SECTION_KEYS };
}

/** يعيد عنصرًا من الفهرس بمعرّفه (عنصر أو حقل) */
export function getByRef(index, ref) {
  if (!ref) return null;
  const fieldMatch = /^([a-z]+)\[(\d+)\]\.([a-zA-Z]+)$/.exec(ref);
  const itemMatch = /^([a-z]+)\[(\d+)\]$/.exec(ref);
  const target = fieldMatch || itemMatch;
  const sectionKey = target ? target[1] : ref;
  const sec = index.sections.find((s) => s.section === sectionKey);
  if (!sec) return null;
  if (!target) return { type: "section", section: sec };
  const item = sec.items[Number(target[2])];
  if (!item) return null;
  if (itemMatch) return { type: "item", section: sec, item };
  const field = item.fields.find((f) => f.field === fieldMatch[3]);
  return field ? { type: "field", section: sec, item, field } : null;
}

/** ملخّص مضغوط للبنية — يُرسل للوكيل بدل النص الكامل */
export function summarizeIndex(index) {
  return index.sections.map((s) => ({
    section: s.section,
    label: s.label,
    kind: s.kind,
    count: s.kind === "list" ? s.count : undefined,
    items:
      s.kind === "list"
        ? s.items.map((i) => ({ id: i.id, label: i.label || "(tom)" }))
        : undefined
  }));
}