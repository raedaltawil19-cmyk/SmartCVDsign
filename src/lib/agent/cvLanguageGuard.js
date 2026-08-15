/**
 * cvLanguageGuard — حاجز لغوي fail-closed على **القيمة التي ستُكتب في السيرة** فقط.
 *
 * قواعد معمارية:
 * - دالة نقيّة: لا React، لا base44، لا شبكة، لا كتابة.
 * - لا تصلح النصّ ولا تترجمه ولا تحذف منه: تقبل أو ترفض.
 * - fail-closed: نصّ عربي + لغة سيرة غير عربية (أو غير معروفة) ⇒ رفض.
 *   لغة الواجهة لا تُستشار هنا إطلاقاً — لغة السيرة وحدها تحكم قيمة السيرة.
 */

/** نطاقات الحرف العربي (بلا محارف التشكيل وحدها) */
export const ARABIC_SCRIPT = /[\u0621-\u064A\u066E-\u06D3\u0750-\u077F]/;

/**
 * @param {{value:*, cvLanguage:{code?:string}|null}} p
 * @returns {{ok:true}|{ok:false, error:"VALUE_LANGUAGE_MISMATCH"|"CV_LANGUAGE_UNKNOWN"}}
 */
export function checkValueLanguage({ value, cvLanguage }) {
  const text = String(value ?? "");
  if (!ARABIC_SCRIPT.test(text)) return { ok: true };
  const code = typeof cvLanguage?.code === "string" ? cvLanguage.code.toLowerCase() : null;
  if (code === "ar") return { ok: true };
  if (!code) return { ok: false, error: "CV_LANGUAGE_UNKNOWN" };
  return { ok: false, error: "VALUE_LANGUAGE_MISMATCH" };
}

export default checkValueLanguage;