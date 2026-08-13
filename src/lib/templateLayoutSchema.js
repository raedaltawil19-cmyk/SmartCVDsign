/**
 * Template Layout Schema — بيانات فقط (لا React، لا JSX، لا DOM).
 * تصف قدرات كل قالب: ما هي السلوتات، على أي جهة، وما المسموح نقله.
 * القوالب نفسها لا تُعدَّل — هذه الطبقة تصفها فقط كما هي اليوم.
 */

/** الأقسام القابلة للنقل في كل القوالب (مطابقة لـ SECTIONS في cvModel) */
export const MOVABLE_SECTIONS = ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"];

/** عناصر مثبّتة داخل تصميم القالب — لا يجوز نقلها أو حذفها عبر أوامر الـlayout */
export const FIXED_SECTIONS = ["header", "kontakt"];

const SIDES = { LEFT: "left", RIGHT: "right", CENTER: "center" };

export const TEMPLATE_LAYOUT_SCHEMAS = {
  stockholm: {
    id: "stockholm",
    label: "Stockholm",
    columns: 2,
    canMoveBetweenSlots: true,
    movableSections: MOVABLE_SECTIONS,
    fixedSections: FIXED_SECTIONS,
    slots: [
      { id: "sidebar", label: "العمود الجانبي", side: SIDES.LEFT, width: "34%", minItems: 1, primary: false },
      { id: "main", label: "العمود الرئيسي", side: SIDES.RIGHT, width: "66%", minItems: 1, primary: true }
    ],
    defaultPlacement: { main: ["profil", "erfarenhet", "utbildning"], sidebar: ["fardigheter", "sprak"] },
    constraints: {
      // العمود الجانبي يُرسم دائماً لأن Kontakt مثبّت داخله، لذلك تفريغه يترك عموداً شبه فارغ.
      sidebarAlwaysRendered: true
    }
  },

  techpro: {
    id: "techpro",
    label: "Tech Pro",
    columns: 2,
    canMoveBetweenSlots: true,
    movableSections: MOVABLE_SECTIONS,
    fixedSections: FIXED_SECTIONS,
    slots: [
      { id: "main", label: "العمود الرئيسي", side: SIDES.LEFT, width: "65%", minItems: 1, primary: true },
      { id: "sidebar", label: "العمود الجانبي", side: SIDES.RIGHT, width: "35%", minItems: 0, primary: false }
    ],
    defaultPlacement: { main: ["profil", "erfarenhet", "utbildning"], sidebar: ["fardigheter", "sprak"] },
    constraints: {
      // القالب يخفي العمود الجانبي تلقائياً عندما يصبح فارغاً.
      sidebarAlwaysRendered: false,
      // تصميم تفضيلي فقط (أشرطة المستوى مناسبة للعمود الضيق) — لا يمنع النقل.
      preferredSlots: { fardigheter: "sidebar" }
    }
  },

  creative: {
    id: "creative",
    label: "Creative Edge",
    columns: 2,
    canMoveBetweenSlots: true,
    movableSections: MOVABLE_SECTIONS,
    fixedSections: FIXED_SECTIONS,
    slots: [
      { id: "main", label: "العمود الرئيسي", side: SIDES.LEFT, width: "66%", minItems: 1, primary: true },
      { id: "sidebar", label: "العمود الجانبي", side: SIDES.RIGHT, width: "34%", minItems: 0, primary: false }
    ],
    defaultPlacement: { main: ["profil", "erfarenhet", "utbildning"], sidebar: ["fardigheter", "sprak"] },
    constraints: { sidebarAlwaysRendered: false }
  },

  executive: {
    id: "executive",
    label: "Executive",
    columns: 1,
    canMoveBetweenSlots: false,
    movableSections: MOVABLE_SECTIONS,
    fixedSections: FIXED_SECTIONS,
    slots: [
      { id: "main", label: "العمود الوحيد", side: SIDES.CENTER, width: "620px", minItems: 1, primary: true }
    ],
    defaultPlacement: { main: MOVABLE_SECTIONS, sidebar: [] },
    constraints: {
      // كل الأقسام مصممة بمحاذاة وسطية — لا يوجد سلوت ثانٍ في التصميم.
      centeredContent: true,
      reorderOnly: true
    }
  },

  nordic: {
    id: "nordic",
    label: "Nordic Minimal",
    columns: 1,
    canMoveBetweenSlots: false,
    movableSections: MOVABLE_SECTIONS,
    fixedSections: FIXED_SECTIONS,
    slots: [
      { id: "main", label: "العمود الوحيد", side: SIDES.CENTER, width: "640px", minItems: 1, primary: true }
    ],
    defaultPlacement: { main: MOVABLE_SECTIONS, sidebar: [] },
    constraints: { reorderOnly: true }
  }
};

export const DEFAULT_TEMPLATE_ID = "stockholm";

/** يعيد schema القالب (أو Stockholm كافتراضي آمن) */
export function getTemplateSchema(templateId) {
  return TEMPLATE_LAYOUT_SCHEMAS[templateId] || TEMPLATE_LAYOUT_SCHEMAS[DEFAULT_TEMPLATE_ID];
}

export function getSlot(schema, slotId) {
  return schema.slots.find((s) => s.id === slotId) || null;
}

export function slotIds(schema) {
  return schema.slots.map((s) => s.id);
}

export function primarySlotId(schema) {
  return (schema.slots.find((s) => s.primary) || schema.slots[0]).id;
}

export function hasMultipleSlots(schema) {
  return schema.slots.length > 1;
}

export { SIDES };