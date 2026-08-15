/**
 * authoritySelection — مسار مصغّر مخصّص لحالة واحدة: تحديد **الجهة الرسمية** التي أجرت
 * تقييم/اعتماد شهادة، عندما تكون لغة السيرة سويدية.
 *
 * قواعد معمارية (بالتصميم لا بالتعليق):
 * - منطق نقيّ: لا React، لا base44، لا شبكة، لا بحث، لا كتابة. **لا يستدعي**
 *   ResearchPublicSource ولا يعدّلها: يقرأ نتائجها المجهَّزة مسبقاً فقط.
 * - لا يمسّ عقد CV_REVIEW ولا أي Skill: طبقة عرض/تأكيد فوق ما وصل.
 * - الخيارات تُستخرَج من المصادر المجلوبة حصراً (publisher لمصادر official_authority).
 *   لا اختراع أسماء، ولا اسم جامعة (educational) كخيار جهة.
 * - الجهة لا تصبح قيمة في السيرة لمجرّد ظهورها في البحث: تصبح قيمة فقط بعد اختيار
 *   المستخدم صراحةً، ثم تُصاغ سويدياً وتمرّ بالحاجز اللغوي ومسار التأكيد القائم.
 */
import { checkValueLanguage, ARABIC_SCRIPT } from "@/lib/agent/cvLanguageGuard";

/** السؤال — بلغة السيرة (سويدي) لا بلغة الواجهة */
export const AUTHORITY_QUESTION = "Vilken myndighet genomförde bedömningen?";
/** خيار «جهة أخرى» — يطلب اسماً من المستخدم، ولا يُخترع له اسم */
export const OTHER_AUTHORITY = "Annan myndighet";

const isFilledString = (v) => typeof v === "string" && v.trim() !== "";

/**
 * أسماء الجهات الرسمية كما وردت من ResearchPublicSource — مرتّبة بالأولية أولاً، بلا تكرار.
 * تُستبعَد كل المصادر غير official_authority (تعليمية/ثانوية/غير معروفة).
 */
export function authorityOptions(research) {
  const sources = Array.isArray(research?.sources) ? research.sources : [];
  const seen = new Set();
  const out = [];
  for (const s of sources.filter((x) => x?.isPrimary).concat(sources.filter((x) => !x?.isPrimary))) {
    if (s?.sourceType !== "official_authority") continue;
    const name = isFilledString(s.publisher) ? s.publisher.trim() : "";
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, url: isFilledString(s.url) ? s.url : "" });
  }
  return out;
}

/**
 * هل تُعالَج هذه التوصية بمسار الجهة المصغّر؟
 * شرطان صريحان: لغة السيرة سويدية، ووجود جهة رسمية واحدة على الأقل في البحث المجهَّز.
 */
export function isAuthorityCase(request) {
  const code = typeof request?.cvLanguage?.code === "string" ? request.cvLanguage.code.toLowerCase() : null;
  if (code !== "sv") return false;
  return authorityOptions(request?.research).length > 0;
}

/**
 * صياغة سويدية ثابتة تُبنى من الجهة المختارة + النصّ الحالي للحقل (سياق السيرة القائم).
 * قالب محدَّد لا توليد حرّ: لا يدخلها السؤال، ولا نصوص الأدلّة، ولا محتوى المصادر.
 */
export function composeAuthorityValue({ authorityName, currentValue = "" }) {
  const name = String(authorityName || "").trim();
  if (!name) return "";
  const base = String(currentValue || "").trim();
  const sentence = `Examen bedömd av ${name}.`;
  if (!base) return sentence;
  return `${base.replace(/\s*$/, "")}${/[.!?]$/.test(base) ? "" : "."} ${sentence}`;
}

/**
 * القيمة النهائية للحالة: تُبنى من الاختيار وحده، وتُرفض fail-closed إن كان اسم الجهة
 * عربياً أو خالف الناتج لغة السيرة.
 * @returns {{ok:true, value:string, authorityName:string}|{ok:false, error:string}}
 */
export function buildAuthorityValue({ request, selected, otherName = "" }) {
  const options = authorityOptions(request?.research).map((o) => o.name);
  let name = "";
  if (selected === OTHER_AUTHORITY) name = String(otherName || "").trim();
  else if (options.includes(selected)) name = selected;
  if (!name) return { ok: false, error: "AUTHORITY_NOT_SELECTED" };
  if (ARABIC_SCRIPT.test(name)) return { ok: false, error: "VALUE_LANGUAGE_MISMATCH" };
  const value = composeAuthorityValue({ authorityName: name, currentValue: request?.currentValue });
  const lang = checkValueLanguage({ value, cvLanguage: request?.cvLanguage });
  if (!lang.ok) return { ok: false, error: lang.error };
  return { ok: true, value, authorityName: name };
}

export const AUTHORITY_ERROR_MESSAGES = {
  AUTHORITY_NOT_SELECTED: "اختر الجهة التي أجرت التقييم أولاً — أو اكتب اسمها إن اخترت «Annan myndighet».",
  VALUE_LANGUAGE_MISMATCH: "اسم الجهة يجب أن يكون بلغة سيرتك (سويدي) كما هو رسمياً."
};

export default buildAuthorityValue;