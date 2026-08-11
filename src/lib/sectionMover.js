import { SECTIONS } from "./cvModel";

const SECTION_ALIASES = {
  profil: ["profil", "profile", "الملف الشخصي", "الملف", "التعريف", "personal profile"],
  erfarenhet: ["erfarenhet", "arbetslivserfarenhet", "experience", "الخبرة", "الخبرات", "الخبرة المهنية", "العمل", "الخبرات العملية"],
  utbildning: ["utbildning", "education", "التعليم", "الدراسة", "الدراسات", "المؤهل", "المؤهلات", "الشهادات", "الدورات", "دورات", "دورة", "الدورة", "تدريب", "التدريب", "kurs", "kurser", "course", "courses", "training"],
  fardigheter: ["fardigheter", "skills", "المهارات", "المهارة", "الكفاءات", "competencies", "القدرات"],
  sprak: ["sprak", "languages", "اللغات", "اللغة", "language", "اللغوية"]
};

const ABOVE_WORDS = ["فوق", "أعلى", "أعلاه", "قبل", "أمام", "ovanför", "över", "uppe", "före", "before", "above", "أول"];
const BELOW_WORDS = ["تحت", "أسفل", "أسفله", "بعد", "خلف", "under", "nedanför", "efter", "after", "below", "آخر"];

const MOVE_WORDS = ["انقل", "نقل", "حرك", "ضع", "move", "flytta", "ordna", "رتّب", "رتب", "غيّر الترتيب", "غير الترتيب", "أعد ترتيب", "اعيد ترتيب"];

const RIGHT_WORDS = ["يمين", "ايمن", "اليمين", "الايمن", "العمود الايمن", "العمود اليمين", "höger", "hoger", "right", "sidebar", "sidospalt"];
const LEFT_WORDS = ["يسار", "ايسر", "اليسار", "الايسر", "العمود الايسر", "العمود اليسار", "vänster", "vanster", "left", "main", "huvudkolumn"];

const ADD_WORDS = ["أضف", "اضف", "ضيف", "اضيف", "اضافة", "إضافة", "زيادة", "أضيف", "lägg till", "lägg", "tillägg", "add", "new", "جديد", "أضيف"];

const SECTION_AR = {
  profil: "الملف الشخصي",
  erfarenhet: "الخبرات",
  utbildning: "التعليم",
  fardigheter: "المهارات",
  sprak: "اللغات"
};

function norm(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/é/g, "e")
    .replace(/\s+/g, " ")
    .trim();
}

function findSection(text) {
  const n = norm(text);
  if (!n) return null;
  // أطول تطابق أولاً لتجنب "الملف" داخل "الملف الشخصي"
  const entries = Object.entries(SECTION_ALIASES).sort((a, b) =>
    Math.max(...b[1].map((x) => x.length)) - Math.max(...a[1].map((x) => x.length))
  );
  for (const [key, aliases] of entries) {
    for (const alias of aliases) {
      if (n.includes(norm(alias))) return key;
    }
  }
  return null;
}

function findDirWord(text) {
  const n = norm(text);
  for (const w of ABOVE_WORDS) if (n.includes(norm(w))) return { dir: "before", word: w };
  for (const w of BELOW_WORDS) if (n.includes(norm(w))) return { dir: "after", word: w };
  return null;
}

/**
 * يفسّر أمرًا نصيًا كعملية إعادة ترتيب أقسام.
 * يعيد { source, target, direction } أو null.
 */
export function parseReorderCommand(text) {
  if (!text) return null;
  const n = norm(text);
  const isMove = MOVE_WORDS.some((w) => n.includes(norm(w)));
  if (!isMove) return null;
  const d = findDirWord(text);
  if (!d) return null;
  const parts = n.split(norm(d.word));
  if (parts.length < 2) return null;
  const source = findSection(parts[0]);
  const target = findSection(parts[1]);
  if (!source || !target || source === target) return null;
  return { source, target, direction: d.dir };
}

/**
 * يفسّر أمر "انقل القسم إلى العمود الأيمن/الأيسر".
 * يعيد { source, column: "main"|"sidebar" } أو null.
 */
export function parseMoveColumnCommand(text) {
  if (!text) return null;
  const n = norm(text);
  const isMove = MOVE_WORDS.some((w) => n.includes(norm(w)));
  if (!isMove) return null;
  const toRight = RIGHT_WORDS.some((w) => n.includes(norm(w)));
  const toLeft = LEFT_WORDS.some((w) => n.includes(norm(w)));
  if (!toRight && !toLeft) return null;
  const section = findSection(text);
  if (!section) return null;
  return { source: section, column: toRight ? "sidebar" : "main" };
}

/**
 * ينقل قسمًا إلى عمود محدد (main أو sidebar) بشكل حتمي.
 */
export function applyMoveColumn(layout, { source, column }) {
  const base = layout || { main: [], sidebar: [] };
  const next = {
    main: base.main.filter((k) => k !== source),
    sidebar: base.sidebar.filter((k) => k !== source)
  };
  if (!next[column].includes(source)) next[column] = [...next[column], source];
  return next;
}

/**
 * يفسّر أمر "أضف عنصرًا إلى قسم" ويستخرج الاسم/العنوان المطلوب.
 * يعيد { section, namn } أو null.
 */
export function parseAddCommand(text) {
  if (!text) return null;
  const n = norm(text);
  const isAdd = ADD_WORDS.some((w) => n.includes(norm(w)));
  if (!isAdd) return null;
  const section = findSection(text);
  if (!section || section === "profil") return null;

  // كلمات إيقاف تشير إلى القسم المستهدف
  const stopRegex = /\s+(?:في|بقسم|تحت|قسم|بند|under|in)\s+/i;
  const cutAtSection = (rest) => {
    const m = rest.match(stopRegex);
    if (m) rest = rest.slice(0, m.index);
    return rest;
  };
  // كلمات إرشادية يجب ألا تظهر في العنوان النهائي
  const stripGuideWords = (s) =>
    s
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/\b(?:عنوان|فرعي|subheading|subtitle|heading)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  let namn = "";
  // 1) الاسم بعد "باسم"، "اسم"، "rubrik"، إلخ.
  const nameRegex = /(?:باسم|اسم|يدعى|يدعي|نسمى|نسمي|rubrik|titel|named|called)\s+(.+)/i;
  const match = text.match(nameRegex);
  if (match) {
    namn = stripGuideWords(cutAtSection(match[1].trim()));
  }
  // 2) إن لم يُعثر، جرّب بعد "عنوان فرعي" أو "عنوان"
  if (!namn) {
    const subRegex = /(?:عنوان\s+فرعي|عنوان|rubrik|titel)\s+(.+)/i;
    const subMatch = text.match(subRegex);
    if (subMatch) {
      namn = stripGuideWords(cutAtSection(subMatch[1].trim()));
    }
  }

  return { section, namn };
}

const TITLE_FIELDS = {
  erfarenhet: "roll",
  utbildning: "examen",
  fardigheter: "namn",
  sprak: "sprak"
};

/**
 * يضيف عنصرًا جديدًا إلى قسم في بيانات السيرة، مع وضع الاسم في حقل العنوان إن وُجد.
 */
export function applyAdd(data, { section, namn, namnList }) {
  const emptyItems = {
    erfarenhet: { roll: "", foretag: "", period: "", beskrivning: "" },
    utbildning: { examen: "", skola: "", period: "", beskrivning: "" },
    fardigheter: { namn: "", niva: 80 },
    sprak: { sprak: "", niva: "" }
  };
  const tpl = emptyItems[section];
  if (!tpl) return data;
  const titleField = TITLE_FIELDS[section];
  const names = (namnList && namnList.length)
    ? namnList.map(n => (n || "").trim()).filter(Boolean)
    : (namn ? [namn] : []);
  if (names.length === 0) {
    return { ...data, [section]: [...(data[section] || []), { ...tpl }] };
  }
  const newItems = names.map(n => {
    const item = { ...tpl };
    if (titleField) item[titleField] = n;
    return item;
  });
  return { ...data, [section]: [...(data[section] || []), ...newItems] };
}

export function sectionLabelAr(key) {
  return SECTION_AR[key] || key;
}

/**
 * يطبّق عملية إعادة الترتيب على الـ layout بشكل حتمي (بدون LLM).
 */
export function applyReorder(layout, { source, target, direction }) {
  const base = layout || { main: [], sidebar: [] };
  const next = {
    main: base.main.filter((k) => k !== source),
    sidebar: base.sidebar.filter((k) => k !== source)
  };
  let col = "main";
  let idx = next.main.indexOf(target);
  if (idx === -1) {
    col = "sidebar";
    idx = next.sidebar.indexOf(target);
  }
  if (idx === -1) return base; // الهدف غير موجود — لا تغيير
  const insertAt = direction === "before" ? idx : idx + 1;
  next[col] = [...next[col]];
  next[col].splice(insertAt, 0, source);
  return next;
}