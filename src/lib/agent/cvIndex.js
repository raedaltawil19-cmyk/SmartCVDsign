/**
 * CV Understanding Engine — طبقة الفهرسة.
 * تقرأ نموذج السيرة (cvModel) وتحوّله إلى بنية منظمة يفهمها الوكيل.
 * مصدر الحقيقة هو البيانات فقط — لا HTML ولا CSS ولا قوالب.
 *
 * المعرّفات ثابتة (Stable IDs) ومشتقة من هوية العنصر نفسه، مثل:
 *   experience_8f31a  /  education_2c04b  /  skill_ab19f
 * لذلك لا تتأثر بإعادة الترتيب أو النقل بين الأعمدة.
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
  profil: { kind: "text", label: "Profil", labelAr: "الملف الشخصي", prefix: "profile", titleField: null },
  erfarenhet: { kind: "list", label: "Arbetslivserfarenhet", labelAr: "الخبرات", prefix: "experience", titleField: "roll" },
  utbildning: { kind: "list", label: "Utbildning", labelAr: "التعليم", prefix: "education", titleField: "examen" },
  fardigheter: { kind: "list", label: "Färdigheter", labelAr: "المهارات", prefix: "skill", titleField: "namn" },
  sprak: { kind: "list", label: "Språk", labelAr: "اللغات", prefix: "language", titleField: "sprak" }
};

export const SECTION_KEYS = ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"];

/** هوية العنصر: الحقول التي تُشتق منها البصمة الثابتة */
const IDENTITY_FIELDS = {
  erfarenhet: ["roll", "foretag", "period"],
  utbildning: ["examen", "skola", "period"],
  fardigheter: ["namn"],
  sprak: ["sprak"]
};

function hash5(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0").slice(0, 5);
}

/**
 * معرّف ثابت للعنصر. يحترم item._uid إن وُجد (للتوسّع لاحقًا)،
 * وإلا يُشتق من بصمة محتوى الهوية — ثابت مهما تغيّر الترتيب.
 */
export function stableItemId(section, item, index = 0) {
  const prefix = SECTION_META[section]?.prefix || section;
  if (item?._uid) return `${prefix}_${item._uid}`;
  const identity = (IDENTITY_FIELDS[section] || [])
    .map((f) => normalizeText(item?.[f]))
    .join("|");
  const seed = identity.replace(/\|+$/g, "") || `empty#${index}`;
  return `${prefix}_${hash5(seed)}`;
}

const itemLabel = (section, item) => {
  if (section === "erfarenhet") return [item.roll, item.foretag].filter(Boolean).join(" – ");
  if (section === "utbildning") return [item.examen, item.skola].filter(Boolean).join(" – ");
  if (section === "fardigheter") return item.namn || "";
  if (section === "sprak") return item.sprak || "";
  return "";
};

/**
 * يبني فهرسًا كاملًا للسيرة: أقسام → عناصر → حقول، بمعرّفات ثابتة.
 * معرّفات: "profil" | "experience_8f31a" | "experience_8f31a.beskrivning"
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
        id: "profile_main",
        section: "profil",
        index: 0,
        label: "Profil",
        fields: [{ id: "profile_main.profil", field: "profil", role: "description", value: d.profil || "" }]
      }
    ]
  });

  for (const key of ["erfarenhet", "utbildning", "fardigheter", "sprak"]) {
    const arr = Array.isArray(d[key]) ? d[key] : [];
    const used = new Map();
    const items = arr.map((item, index) => {
      let id = stableItemId(key, item || {}, index);
      // تفادي التعارض عند تشابه عنصرين تمامًا
      const n = (used.get(id) || 0) + 1;
      used.set(id, n);
      if (n > 1) id = `${id}${n}`;

      const roles = FIELD_ROLES[key];
      const fields = Object.keys(roles).map((field) => ({
        id: `${id}.${field}`,
        field,
        role: roles[field],
        value: item?.[field] ?? ""
      }));
      return {
        id,
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

/**
 * يعيد عنصرًا من الفهرس بمعرّفه الثابت (قسم أو عنصر أو حقل).
 * أمثلة: "erfarenhet" | "experience_8f31a" | "experience_8f31a.beskrivning"
 */
export function getByRef(index, ref) {
  if (!ref || !index) return null;
  const [itemId, fieldName] = String(ref).split(".");
  const asSection = index.sections.find((s) => s.section === itemId);
  if (asSection && !fieldName) return { type: "section", section: asSection };
  for (const sec of index.sections) {
    const item = sec.items.find((i) => i.id === itemId);
    if (!item) continue;
    if (!fieldName) return { type: "item", section: sec, item };
    const field = item.fields.find((f) => f.field === fieldName);
    return field ? { type: "field", section: sec, item, field } : null;
  }
  return null;
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
        : [{ id: s.items[0].id, label: "Profil" }]
  }));
}