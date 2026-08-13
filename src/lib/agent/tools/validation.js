/**
 * التحقق من صلاحية نموذج السيرة بعد كل تنفيذ أداة.
 * لا يُحفظ أي تغيير إذا فشل التحقق.
 */
import { SECTION_KEYS } from "@/lib/agent/cvIndex";

const LIST_SECTIONS = SECTION_KEYS.filter((k) => k !== "profil");

export function validateCV(data) {
  const errors = [];
  if (!data || typeof data !== "object") return { ok: false, errors: ["البيانات غير صالحة."] };
  if (typeof data.namn !== "string") errors.push("الاسم يجب أن يكون نصًا.");
  if (typeof data.profil !== "string") errors.push("الملف الشخصي يجب أن يكون نصًا.");
  if (!data.kontakt || typeof data.kontakt !== "object") errors.push("بيانات التواصل مفقودة.");

  for (const key of LIST_SECTIONS) {
    if (!Array.isArray(data[key])) {
      errors.push(`القسم ${key} يجب أن يكون قائمة.`);
      continue;
    }
    for (const item of data[key]) {
      if (!item || typeof item !== "object") errors.push(`عنصر غير صالح في ${key}.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function validateLayout(layout) {
  if (!layout || !Array.isArray(layout.main) || !Array.isArray(layout.sidebar)) {
    return { ok: false, errors: ["هيكل الأعمدة غير صالح."] };
  }
  return { ok: true, errors: [] };
}