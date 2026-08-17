/**
 * CV Understanding Engine — طبقة الفهرسة الشاملة.
 * تقرأ نموذج السيرة (cvModel) وتحوّله إلى بنية: CV → Section → Item → Field → Value.
 * مصدر الحقيقة هو البيانات فقط — لا HTML ولا CSS ولا قوالب.
 *
 * كل قسم وعنصر وحقل له معرّف ثابت (Stable ID) لا يعتمد على الفهرس:
 *   header_main.namn / contact_main.telefon / experience_8f31a.beskrivning
 */

export function normalizeText(text) {
  // ملاحظة: بعض القيم أرقام (مثل fardigheter.niva) — لذلك التحويل إلى نص إلزامي.
  return String(text ?? "")
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

/** الدور الدلالي لكل حقل في كل قسم (مصدر الفهم بدل مطابقة كلمات مكتوبة يدويًا) */
export const FIELD_ROLES = {
  header: { namn: "full_name", titel: "headline" },
  kontakt: { telefon: "phone", epost: "email", adress: "address", linkedin: "link" },
  profil: { profil: "description" },
  erfarenhet: { roll: "job_title", foretag: "company", period: "date", beskrivning: "description" },
  utbildning: { examen: "degree", skola: "school", period: "date", beskrivning: "description" },
  fardigheter: { namn: "skill", niva: "skill_level" },
  sprak: { sprak: "language", niva: "language_level" },
  references: { namn: "reference_name", relation: "reference_relation", kontakt: "reference_contact" }
};

/** مرادفات الأدوار بعدة لغات — metadata للفهم، لا شروط خاصة في المنطق */
export const ROLE_ALIASES = {
  full_name: ["namn", "name", "fullständigt namn", "الاسم", "اسمي"],
  headline: ["titel", "title", "headline", "yrkestitel", "المسمى", "المسمى الوظيفي", "اللقب"],
  phone: ["telefon", "telefonnummer", "mobil", "phone", "phone number", "رقم", "الهاتف", "التلفون", "الجوال", "الموبايل", "رقم التلفون"],
  email: ["epost", "e-post", "mail", "email", "e-mail", "الايميل", "البريد", "البريد الالكتروني"],
  address: ["adress", "address", "ort", "bostadsort", "العنوان", "السكن", "المدينة"],
  link: ["linkedin", "länk", "link", "profil-länk", "الرابط", "لينكدان", "لينكدين"],
  description: ["beskrivning", "description", "text", "profil", "profile", "summary", "الوصف", "النبذة", "الملف الشخصي", "الشرح"],
  job_title: ["roll", "befattning", "job title", "position", "role", "المسمى", "الوظيفة", "الدور"],
  company: ["foretag", "företag", "arbetsgivare", "company", "employer", "الشركة", "جهة العمل", "الشغل"],
  date: ["period", "datum", "date", "dates", "tid", "الفترة", "التاريخ", "المدة"],
  degree: ["examen", "degree", "program", "utbildningsnamn", "الشهادة", "الدرجة", "التخصص"],
  school: ["skola", "school", "universitet", "university", "lärosäte", "المدرسة", "الجامعة", "المعهد"],
  skill: ["namn", "färdighet", "skill", "kompetens", "المهارة"],
  skill_level: ["niva", "nivå", "level", "المستوى", "الدرجة"],
  language: ["sprak", "språk", "language", "اللغة"],
  language_level: ["niva", "nivå", "level", "المستوى"],
  reference_name: ["namn", "name", "referens", "reference", "الاسم", "المرجع"],
  reference_relation: ["relation", "relationship", "title", "المسمى", "العلاقة", "الصفة"],
  reference_contact: ["kontakt", "contact", "telefon", "email", "التواصل", "الاتصال"]
};

export const SECTION_META = {
  header: {
    kind: "object",
    label: "Namn & titel",
    labelAr: "الاسم والمسمى",
    prefix: "header",
    aliases: ["namn", "titel", "header", "rubrik", "name", "title", "الاسم", "المسمى", "الترويسة"],
    inLayout: false
  },
  kontakt: {
    kind: "object",
    label: "Kontakt",
    labelAr: "معلومات الاتصال",
    prefix: "contact",
    aliases: ["kontakt", "kontaktuppgifter", "contact", "contact info", "الاتصال", "التواصل", "معلومات الاتصال", "بيانات الاتصال"],
    inLayout: false
  },
  profil: {
    kind: "text",
    label: "Profil",
    labelAr: "الملف الشخصي",
    prefix: "profile",
    aliases: ["profil", "profile", "sammanfattning", "summary", "om mig", "النبذة", "الملف الشخصي", "المقدمة"],
    inLayout: true
  },
  erfarenhet: {
    kind: "list",
    label: "Arbetslivserfarenhet",
    labelAr: "الخبرات",
    prefix: "experience",
    titleField: "roll",
    aliases: ["erfarenhet", "arbetslivserfarenhet", "arbete", "experience", "work experience", "الخبرات", "الخبرة", "العمل"],
    inLayout: true
  },
  utbildning: {
    kind: "list",
    label: "Utbildning",
    labelAr: "التعليم",
    prefix: "education",
    titleField: "examen",
    aliases: ["utbildning", "education", "studier", "التعليم", "الدراسة", "المؤهلات"],
    inLayout: true
  },
  fardigheter: {
    kind: "list",
    label: "Färdigheter",
    labelAr: "المهارات",
    prefix: "skill",
    titleField: "namn",
    aliases: ["fardigheter", "färdigheter", "kompetenser", "skills", "المهارات", "الكفاءات"],
    inLayout: true
  },
  sprak: {
    kind: "list",
    label: "Språk",
    labelAr: "اللغات",
    prefix: "language",
    titleField: "sprak",
    aliases: ["sprak", "språk", "languages", "language", "اللغات", "اللغة"],
    inLayout: true
  },
  references: {
    kind: "list",
    label: "Referenser",
    labelAr: "المراجع",
    prefix: "reference",
    titleField: "namn",
    aliases: ["referenser", "referens", "references", "reference", "المراجع", "المرجع"],
    inLayout: true
  }
};

/** الأقسام التي تظهر في هيكل الأعمدة (تستخدمها الأدوات و LayoutEditor) */
export const SECTION_KEYS = ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"];
/** كل أقسام السيرة التي يراها المستخدم فعليًا */
export const ALL_SECTION_KEYS = ["header", "kontakt", ...SECTION_KEYS, "references"]; 

/** الأقسام ذات العنصر الواحد ومعرّفاتها الثابتة */
const SINGLE_ITEM_IDS = { header: "header_main", kontakt: "contact_main", profil: "profile_main" };

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
 * معرّف ثابت للعنصر. يحترم item._uid إن وُجد،
 * وإلا يُشتق من بصمة محتوى الهوية — ثابت مهما تغيّر الترتيب.
 */
export function stableItemId(section, item, index = 0) {
  if (SINGLE_ITEM_IDS[section]) return SINGLE_ITEM_IDS[section];
  const prefix = SECTION_META[section]?.prefix || section;
  if (item?._uid) return `${prefix}_${item._uid}`;
  const identity = (IDENTITY_FIELDS[section] || []).map((f) => normalizeText(item?.[f])).join("|");
  const seed = identity.replace(/\|+$/g, "") || `empty#${index}`;
  return `${prefix}_${hash5(seed)}`;
}

const itemLabel = (section, item) => {
  if (section === "header") return [item.namn, item.titel].filter(Boolean).join(" – ") || "Namn & titel";
  if (section === "kontakt") return "Kontaktuppgifter";
  if (section === "profil") return "Profil";
  if (section === "erfarenhet") return [item.roll, item.foretag].filter(Boolean).join(" – ");
  if (section === "utbildning") return [item.examen, item.skola].filter(Boolean).join(" – ");
  if (section === "fardigheter") return item.namn || "";
  if (section === "sprak") return item.sprak || "";
  if (section === "references") return item.namn || "";
  return "";
};

const fieldAliases = (field, role) => {
  const set = new Set([field, role, ...(ROLE_ALIASES[role] || [])]);
  return [...set].filter(Boolean);
};

const buildFields = (section, itemId, source) => {
  const roles = FIELD_ROLES[section] || {};
  return Object.keys(roles).map((field) => {
    const value = source?.[field] ?? "";
    return {
      id: `${itemId}.${field}`,
      field,
      role: roles[field],
      aliases: fieldAliases(field, roles[field]),
      value,
      isEmpty: !String(value ?? "").trim()
    };
  });
};

const makeSection = (key, items) => {
  const meta = SECTION_META[key];
  return {
    id: key,
    section: key,
    kind: meta.kind,
    label: meta.label,
    labelAr: meta.labelAr,
    aliases: meta.aliases,
    inLayout: meta.inLayout,
    count: items.length,
    isEmpty: items.length === 0 || items.every((i) => i.isEmpty),
    items
  };
};

const singleItem = (key, source) => {
  const id = SINGLE_ITEM_IDS[key];
  const fields = buildFields(key, id, source || {});
  return {
    id,
    section: key,
    index: 0,
    label: itemLabel(key, source || {}),
    isEmpty: fields.every((f) => f.isEmpty),
    fields
  };
};

/**
 * يبني فهرسًا كاملًا للسيرة: أقسام → عناصر → حقول، بمعرّفات ثابتة.
 */
export function buildCVIndex(data) {
  const d = data || {};
  const sections = [];

  sections.push(makeSection("header", [singleItem("header", { namn: d.namn || "", titel: d.titel || "" })]));
  sections.push(makeSection("kontakt", [singleItem("kontakt", d.kontakt || {})]));
  sections.push(makeSection("profil", [singleItem("profil", { profil: d.profil || "" })]));

  for (const key of ["erfarenhet", "utbildning", "fardigheter", "sprak", "references"]) {
    const arr = Array.isArray(d[key]) ? d[key] : [];
    const used = new Map();
    const items = arr.map((item, index) => {
      let id = stableItemId(key, item || {}, index);
      // تفادي التعارض عند تشابه عنصرين تمامًا
      const n = (used.get(id) || 0) + 1;
      used.set(id, n);
      if (n > 1) id = `${id}${n}`;
      const fields = buildFields(key, id, item || {});
      return {
        id,
        section: key,
        index,
        label: itemLabel(key, item || {}),
        isEmpty: fields.every((f) => f.isEmpty),
        fields
      };
    });
    sections.push(makeSection(key, items));
  }

  return { sections, sectionKeys: ALL_SECTION_KEYS };
}

/**
 * يعيد عنصرًا من الفهرس بمعرّفه الثابت (قسم أو عنصر أو حقل).
 * أمثلة: "kontakt" | "contact_main" | "contact_main.telefon" | "experience_8f31a.beskrivning"
 */
export function getByRef(index, ref) {
  if (!ref || !index) return null;
  const [itemId, fieldName] = String(ref).split(".");
  const asSection = index.sections.find((s) => s.section === itemId);
  if (asSection && !fieldName) return { type: "section", section: asSection };
  if (asSection && fieldName) {
    const item = asSection.items[0];
    const field = item?.fields.find((f) => f.field === fieldName || f.role === fieldName);
    return field ? { type: "field", section: asSection, item, field } : null;
  }
  for (const sec of index.sections) {
    const item = sec.items.find((i) => i.id === itemId);
    if (!item) continue;
    if (!fieldName) return { type: "item", section: sec, item };
    const field = item.fields.find((f) => f.field === fieldName || f.role === fieldName);
    return field ? { type: "field", section: sec, item, field } : null;
  }
  return null;
}

/**
 * ملخّص مضغوط للبنية — يُرسل للوكيل بدل النص الكامل.
 * يتضمّن حقول كل عنصر (مع علامة الفراغ) حتى يستطيع المستخدم الإشارة إلى حقل ناقص.
 */
export function summarizeIndex(index) {
  return index.sections.map((s) => ({
    section: s.section,
    label: s.label,
    labelAr: s.labelAr,
    aliases: s.aliases,
    kind: s.kind,
    count: s.kind === "list" ? s.count : undefined,
    items: s.items.map((i) => ({
      id: i.id,
      label: i.label || "(tom)",
      fields: i.fields.map((f) => ({ ref: f.id, field: f.field, role: f.role, empty: f.isEmpty }))
    }))
  }));
}

/** عرض مسطّح لكل الحقول — للتشخيص وللبحث */
export function flattenIndex(index) {
  const rows = [];
  for (const sec of index.sections) {
    for (const item of sec.items) {
      for (const f of item.fields) {
        rows.push({
          section: sec.section,
          sectionLabel: sec.label,
          itemId: item.id,
          itemLabel: item.label,
          ref: f.id,
          field: f.field,
          role: f.role,
          value: f.value,
          isEmpty: f.isEmpty
        });
      }
    }
  }
  return rows;
}