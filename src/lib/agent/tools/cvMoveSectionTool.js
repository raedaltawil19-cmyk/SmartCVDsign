/**
 * cv_move_section — أداة جديدة معزولة تماماً لنقل/إعادة ترتيب أقسام السيرة.
 *
 * قواعد معمارية:
 * - لا تستورد ولا تستدعي الأداة القديمة src/lib/agent/tools/moveSection.js.
 * - لا ترتبط بأي وكيل، ولا بسجل العمليات القديم، ولا بأي واجهة.
 * - تعمل على كائن layout فقط. لا تلمس بيانات السيرة إطلاقاً.
 * - مصدر الحقيقة للقواعد: templateLayoutSchema.js + layoutOps.js (لا تكرار للقواعد هنا).
 */
import { TEMPLATE_LAYOUT_SCHEMAS, getTemplateSchema, FIXED_SECTIONS } from "@/lib/templateLayoutSchema";
import {
  moveSection as pureMoveSection,
  reorderSection as pureReorderSection,
  normalizeLayout,
  validateLayout,
  resolveSlot,
  findSectionSlot,
  LayoutError
} from "@/lib/layout/layoutOps";

export const TOOL_NAME = "cv_move_section";

/** مخطط المدخلات الصريح — لا مفاتيح أخرى مقبولة */
export const CV_MOVE_SECTION_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["templateId", "section"],
  properties: {
    templateId: { type: "string", enum: Object.keys(TEMPLATE_LAYOUT_SCHEMAS) },
    section: { type: "string", enum: ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"] },
    targetSlot: { type: "string", description: "معرّف سلوت أو وصف بشري (sidebar / main / يمين / left / höger ...)" },
    before: { type: "string", enum: ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"] },
    after: { type: "string", enum: ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"] },
    index: { type: "integer", minimum: 0 }
  }
};

const ALLOWED_SECTIONS = CV_MOVE_SECTION_INPUT_SCHEMA.properties.section.enum;
const ALLOWED_KEYS = Object.keys(CV_MOVE_SECTION_INPUT_SCHEMA.properties);

const snapshot = (v) => JSON.stringify(v === undefined ? null : v);
const cloneLayout = (l) => {
  const out = {};
  for (const k of Object.keys(l || {})) out[k] = [...(l[k] || [])];
  return out;
};

const fail = (errorCode, message) => ({ success: false, operation: TOOL_NAME, errorCode, message });

const SLOT_LABEL = (schema, slotId) => (schema.slots.find((s) => s.id === slotId) || {}).label || slotId;

function buildSummary(schema, section, fromSlot, toSlot, { before, after, index }) {
  const where = before ? ` قبل «${before}»` : after ? ` بعد «${after}»` : Number.isInteger(index) ? ` في الموضع ${index + 1}` : "";
  if (fromSlot === toSlot) return `تمت إعادة ترتيب قسم «${section}» داخل ${SLOT_LABEL(schema, toSlot)}${where}.`;
  return `تم نقل قسم «${section}» إلى ${SLOT_LABEL(schema, toSlot)}${where}.`;
}

/**
 * ينفّذ العملية ويعيد نتيجة مهيكلة. لا يرمي استثناءات، ولا يعدّل أي مدخل.
 * @param {object} input  { templateId, section, targetSlot?, before?, after?, index? }
 * @param {object} layout الـlayout الحالي { main: [], sidebar: [] }
 * @param {object} [cvData] اختياري — يُستخدم فقط للتحقق من عدم تغيّر بيانات السيرة
 */
export function runCvMoveSection(input, layout, cvData) {
  const inp = input || {};

  // 0) مدخلات صارمة
  const unknownKeys = Object.keys(inp).filter((k) => !ALLOWED_KEYS.includes(k));
  if (unknownKeys.length) return fail("INPUT_UNKNOWN_KEYS", `مدخلات غير معروفة: ${unknownKeys.join(", ")}.`);
  if (!layout || typeof layout !== "object") return fail("LAYOUT_REQUIRED", "لم يُمرَّر هيكل الأعمدة الحالي.");

  // 1) القالب موجود (لا اعتماد على أي سلوك احتياطي)
  if (!inp.templateId || !TEMPLATE_LAYOUT_SCHEMAS[inp.templateId]) {
    return fail("TEMPLATE_UNKNOWN", `القالب «${inp.templateId ?? ""}» غير معروف.`);
  }
  const schema = getTemplateSchema(inp.templateId);

  // 2–4) القسم مسموح وغير ثابت
  if (!inp.section) return fail("SECTION_REQUIRED", "لم يُحدَّد القسم المطلوب.");
  if (FIXED_SECTIONS.includes(inp.section)) {
    return fail("SECTION_FIXED", `«${inp.section}» جزء ثابت من تصميم القالب ولا يمكن نقله.`);
  }
  if (!ALLOWED_SECTIONS.includes(inp.section)) {
    return fail("SECTION_NOT_ALLOWED", `القسم «${inp.section}» غير قابل للنقل.`);
  }
  for (const anchorKey of ["before", "after"]) {
    const a = inp[anchorKey];
    if (a === undefined || a === null) continue;
    if (FIXED_SECTIONS.includes(a)) return fail("ANCHOR_FIXED", `«${a}» قسم ثابت ولا يصح استخدامه كمرجع ترتيب.`);
    if (!ALLOWED_SECTIONS.includes(a)) return fail("ANCHOR_NOT_ALLOWED", `المرجع «${a}» غير معروف.`);
    if (a === inp.section) return fail("ANCHOR_IS_SECTION", "لا يمكن ترتيب القسم بالنسبة إلى نفسه.");
  }
  if (inp.before && inp.after) return fail("ANCHOR_CONFLICT", "حدِّد «قبل» أو «بعد»، لا كليهما.");
  if (inp.index !== undefined && (!Number.isInteger(inp.index) || inp.index < 0)) {
    return fail("INDEX_INVALID", "الموضع الرقمي غير صالح.");
  }

  const cvSnapshot = snapshot(cvData);
  const layoutSnapshot = snapshot(layout);
  const current = normalizeLayout(cloneLayout(layout), schema);
  const fromSlot = findSectionSlot(current, inp.section);
  const options = { templateId: inp.templateId, before: inp.before, after: inp.after, index: inp.index };

  try {
    // 5–7) السلوت الهدف موجود ومتاح في هذا القالب، والنقل بين السلوتات مسموح
    let next;
    let toSlot = fromSlot;
    if (inp.targetSlot !== undefined && inp.targetSlot !== null && String(inp.targetSlot).trim() !== "") {
      const slot = resolveSlot(schema, inp.targetSlot);
      toSlot = slot.id;
      next = pureMoveSection(current, inp.section, slot.id, options);
    } else {
      next = pureReorderSection(current, inp.section, options);
    }

    // 13–15) تحقق نهائي صريح على النتيجة
    const v = validateLayout(next, schema);
    if (!v.ok) return fail("INVALID_RESULT", v.errors[0]);

    // 16–17) بيانات السيرة والـlayout الأصلي بلا أي تغيير
    if (snapshot(cvData) !== cvSnapshot) return fail("CV_DATA_MUTATED", "تعذّر إتمام العملية: بيانات السيرة تغيّرت.");
    if (snapshot(layout) !== layoutSnapshot) return fail("LAYOUT_MUTATED", "تعذّر إتمام العملية: هيكل الأعمدة الأصلي تغيّر.");

    return {
      success: true,
      operation: TOOL_NAME,
      templateId: schema.id,
      section: inp.section,
      fromSlot,
      toSlot,
      previousLayout: cloneLayout(current),
      newLayout: cloneLayout(next),
      summary: buildSummary(schema, inp.section, fromSlot, toSlot, options)
    };
  } catch (e) {
    if (e instanceof LayoutError) return fail(e.code, e.message);
    return fail("UNEXPECTED_ERROR", "تعذّر تنفيذ العملية على هيكل الأعمدة.");
  }
}

export default runCvMoveSection;