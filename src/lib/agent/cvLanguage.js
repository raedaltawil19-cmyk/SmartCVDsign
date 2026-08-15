/**
 * cvLanguage — تحديد **لغة السيرة الذاتية** (لا لغة الواجهة) من محتوى السيرة نفسه.
 *
 * قواعد معمارية:
 * - منطق نقيّ: لا React، لا base44، لا شبكة، لا قراءة من SavedCV.
 * - لا يُستنتج من لغة المحادثة ولا من لغة الواجهة إطلاقاً — المصدر الوحيد هو نصوص CV_DATA.
 * - fail-closed: لا نصّ كافٍ ⇒ "unknown"، ولا تخمين افتراضي.
 */

export const CV_LANGUAGES = ["sv", "en", "ar"];

export const CV_LANGUAGE_LABELS = {
  sv: "Swedish (svenska)",
  en: "English",
  ar: "Arabic (العربية)",
  unknown: "unknown"
};

/** كل النصوص الحرّة في السيرة — بلا حقول نظام وبلا أرقام */
export function collectCVText(data) {
  if (!data || typeof data !== "object") return "";
  const parts = [data.namn, data.titel, data.profil];
  const push = (list, keys) => {
    for (const it of Array.isArray(list) ? list : []) {
      for (const k of keys) parts.push(it?.[k]);
    }
  };
  push(data.erfarenhet, ["roll", "foretag", "beskrivning"]);
  push(data.utbildning, ["examen", "skola", "beskrivning"]);
  push(data.fardigheter, ["namn"]);
  push(data.sprak, ["sprak"]);
  return parts.filter((v) => typeof v === "string" && v.trim()).join(" ");
}

const ARABIC = /[\u0600-\u06FF]/g;
const LATIN = /[A-Za-zÅÄÖåäöÆØæø]/g;

const SV_WORDS = [
  "och", "för", "med", "av", "till", "från", "som", "samt", "inom", "vid",
  "ansvarig", "erfarenhet", "utbildning", "kunskaper", "arbetade", "arbete",
  "utvecklade", "ledde", "genomförde", "kandidat", "examen", "företaget", "kunder"
];
const EN_WORDS = [
  "and", "with", "for", "of", "the", "from", "as", "within", "at",
  "responsible", "experience", "education", "skills", "worked", "work",
  "developed", "led", "managed", "bachelor", "degree", "company", "clients"
];

const countWords = (text, list) => {
  let n = 0;
  for (const w of list) {
    const m = text.match(new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "giu"));
    if (m) n += m.length;
  }
  return n;
};

/**
 * لغة السيرة كما تظهر في محتواها.
 * @returns {{code:"sv"|"en"|"ar"|"unknown", label:string, confident:boolean}}
 */
export function detectCVLanguage(data) {
  const text = collectCVText(data);
  const result = (code, confident) => ({ code, label: CV_LANGUAGE_LABELS[code], confident });
  if (text.trim().length < 12) return result("unknown", false);

  const arabic = (text.match(ARABIC) || []).length;
  const latin = (text.match(LATIN) || []).length;
  if (arabic > latin) return result("ar", true);
  if (latin === 0) return result("unknown", false);

  const lower = text.toLowerCase();
  const sv = countWords(lower, SV_WORDS) + (text.match(/[åäöÅÄÖ]/g) || []).length;
  const en = countWords(lower, EN_WORDS);
  if (sv === 0 && en === 0) return result("unknown", false);
  if (sv === en) return result("unknown", false);
  return result(sv > en ? "sv" : "en", true);
}

/** وسم اللغة الذي يُمرَّر في السياق والـIntent — قيمة صريحة لا استنتاج */
export function cvLanguageTag(data) {
  const { code, label, confident } = detectCVLanguage(data);
  return { code, label, confident, source: "cv_content" };
}

export default detectCVLanguage;