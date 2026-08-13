/**
 * تحديد موقع عنصر داخل بيانات السيرة عبر معرّفه الثابت.
 * الفهرس (index) وسيط للقراءة فقط — التعديل يحدث على البيانات نفسها.
 */
import { buildCVIndex, getByRef, FIELD_ROLES } from "@/lib/agent/cvIndex";

export class ToolError extends Error {
  constructor(message, code = "tool_error") {
    super(message);
    this.code = code;
  }
}

/** يعيد { section, index, item, fields } لعنصر بمعرّف ثابت */
export function locateItem(data, targetId) {
  const idx = buildCVIndex(data);
  const base = String(targetId || "").split(".")[0];
  const found = getByRef(idx, base);
  // هدف على مستوى القسم: نستخدم عنصره الوحيد (kontakt / header / profil)
  if (found?.type === "section" && found.section.kind !== "list" && found.section.items[0]) {
    return {
      section: found.section.section,
      sectionLabel: found.section.label,
      index: 0,
      label: found.section.items[0].label,
      item: found.section.items[0]
    };
  }
  if (!found || !found.item) throw new ToolError(`لم أجد العنصر (${targetId}).`, "target_not_found");
  return {
    section: found.section.section,
    sectionLabel: found.section.label,
    index: found.item.index,
    label: found.item.label,
    item: found.item
  };
}

/** يتحقق أن الحقل موجود في القسم ويعيد اسم الحقل الحقيقي في cvModel */
export function resolveField(section, field) {
  const roles = FIELD_ROLES[section] || {};
  if (field && roles[field]) return field;
  // يقبل أيضًا الدور الدلالي (description, company, ...)
  const byRole = Object.keys(roles).find((k) => roles[k] === field);
  if (byRole) return byRole;
  throw new ToolError(`الحقل "${field}" غير موجود في قسم ${section}.`, "field_not_found");
}

export const isListSection = (section) => !["profil", "kontakt", "header"].includes(section);