/**
 * أداة move_section — تنقل قسماً بين أعمدة القالب أو داخل عموده.
 * لا تعيد تنفيذ أي منطق نقل: كل الحساب في layoutOps.moveSection().
 * لا تلمس بيانات السيرة (state.data يمرّ كما هو) ولا القالب نفسه.
 */
import {
  moveSection as moveSectionOp,
  normalizeLayout,
  validateLayout as validateTemplateLayout,
  findSectionSlot,
  LayoutError
} from "@/lib/layout/layoutOps";
import { getTemplateSchema, getSlot } from "@/lib/templateLayoutSchema";
import { ToolError } from "./locate";
import { SECTION_META } from "@/lib/agent/cvIndex";

const label = (section) => SECTION_META?.[section]?.labelAr || section;

/** رسائل مفهومة للمستخدم بدل أكواد الأخطاء الخام */
const friendly = (err, schema, section) => {
  switch (err.code) {
    case "MOVE_BETWEEN_SLOTS_NOT_ALLOWED":
    case "SIDE_NOT_AVAILABLE":
    case "SLOT_NOT_AVAILABLE":
      if (schema.slots.length === 1) {
        return `هذا القالب (${schema.label}) يحتوي على عمود واحد فقط، لذلك لا يمكن نقل القسم إلى عمود آخر. أستطيع إعادة ترتيب ${label(section)} داخل العمود الحالي.`;
      }
      return err.message;
    default:
      return err.message;
  }
};

export const moveSectionTool = {
  description:
    "Flytta en sektion till en annan kolumn eller till en ny position: section + targetSlot (id ELLER användarens ord, t.ex. 'العمود الأيمن' / 'höger') + valfritt before | after | index.",
  args: ["section", "targetSlot", "before", "after", "index", "templateId"],

  run(state, { section, targetSlot, before, after, index, templateId }) {
    const tid = templateId || state.templateId;
    const schema = getTemplateSchema(tid);

    // 1) القسم موجود ومعروف وقابل للنقل
    if (!section) throw new ToolError("لم يتضح القسم المطلوب نقله.", "missing_section");
    if (schema.fixedSections.includes(section)) {
      throw new ToolError(`«${label(section)}» جزء ثابت من تصميم القالب ولا يمكن نقله.`, "section_fixed");
    }
    if (!schema.movableSections.includes(section)) {
      throw new ToolError(`القسم «${section}» غير موجود في السيرة.`, "unknown_section");
    }

    // 2) الحالة الحالية بعد التطبيع + العمود الحالي للقسم
    const previousLayout = normalizeLayout(state.layout, schema);
    const fromSlotId = findSectionSlot(previousLayout, section);
    // بلا targetSlot = إعادة موضع داخل نفس العمود (أوامر سياقية مثل «خليه قبل اللغات»)
    const slotRef = targetSlot || fromSlotId;

    // 3–6) كل التحقق (وجود السلوت، السماح بالنقل، minItems، التكرار) داخل layoutOps
    let newLayout;
    try {
      newLayout = moveSectionOp(previousLayout, section, slotRef, { templateId: tid, before, after, index });
    } catch (e) {
      if (e instanceof LayoutError) throw new ToolError(friendly(e, schema, section), e.code);
      throw e;
    }

    // 7–8) تحقق نهائي بمقاييس القالب قبل أي حفظ
    const v = validateTemplateLayout(newLayout, schema);
    if (!v.ok) throw new ToolError(`تم إلغاء النقل: ${v.errors[0]}`, "layout_invalid");

    const toSlotId = findSectionSlot(newLayout, section);
    const toLabel = getSlot(schema, toSlotId)?.label || toSlotId;
    const anchor = before || after;
    const where = before ? `فوق ${label(before)}` : after ? `تحت ${label(after)}` : "";
    const summary =
      fromSlotId === toSlotId
        ? `تم تغيير موضع ${label(section)} داخل ${toLabel}${where ? ` (${where})` : ""}.`
        : `تم نقل ${label(section)} إلى ${toLabel}${where ? ` ${where}` : ""}.`;

    return {
      // لا تغيير على data — النقل يمسّ الـlayout فقط
      state: { ...state, layout: { main: [], sidebar: [], ...newLayout } },
      operation: {
        targetId: section,
        field: null,
        before: previousLayout,
        after: newLayout,
        meta: { templateId: schema.id, section, anchor: anchor || null, previousLayout, newLayout }
      },
      summary
    };
  }
};