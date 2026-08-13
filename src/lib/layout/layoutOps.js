/**
 * layoutOps — دوال نقية لإدارة ترتيب الأقسام ومكانها.
 * تعمل على كائن layout فقط: { main: [...], sidebar: [...] }
 * لا تعرف شيئاً عن React أو DOM أو JSX، ولا تلمس بيانات السيرة إطلاقاً.
 * كل دالة تعيد كائناً جديداً — لا تعديل في المكان.
 */
import { getTemplateSchema, getSlot, slotIds, primarySlotId, hasMultipleSlots } from "@/lib/templateLayoutSchema";

export class LayoutError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LayoutError";
    this.code = code;
  }
}

/* ---------- مساعدات ---------- */

const clone = (layout) => {
  const out = {};
  for (const key of Object.keys(layout || {})) out[key] = [...(layout[key] || [])];
  return out;
};

const emptyLayoutFor = (schema) => {
  const out = {};
  for (const id of slotIds(schema)) out[id] = [];
  return out;
};

/** تطبيع نصي بسيط لدعم العربية/السويدية/الإنجليزية في وصف الجهة */
const norm = (v) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .trim();

const SIDE_WORDS = {
  right: ["right", "höger", "hoger", "يمين", "الايمن", "اليمين", "الايمين"],
  left: ["left", "vänster", "vanster", "يسار", "الايسر", "اليسار"],
  center: ["center", "mitten", "وسط", "الوسط", "المنتصف"]
};

const SLOT_WORDS = {
  sidebar: ["sidebar", "sido", "sidokolumn", "جانبي", "الجانبي", "العمود الجانبي", "الشريط الجانبي"],
  main: ["main", "huvud", "huvudkolumn", "رئيسي", "الرئيسي", "العمود الرئيسي", "الاساسي"]
};

/**
 * يترجم وصفاً بشرياً أو معرّفاً إلى slot فعلي في هذا القالب.
 * "العمود الأيمن" → main في Tech Pro، و sidebar في Stockholm.
 */
export function resolveSlot(schema, ref) {
  const n = norm(ref);
  if (!n) throw new LayoutError("SLOT_REQUIRED", "لم يُحدَّد العمود المطلوب.");

  const byId = getSlot(schema, n);
  if (byId) return byId;

  for (const [side, words] of Object.entries(SIDE_WORDS)) {
    if (words.some((w) => n.includes(norm(w)))) {
      const slot = schema.slots.find((s) => s.side === side);
      if (slot) return slot;
      throw new LayoutError(
        "SIDE_NOT_AVAILABLE",
        `قالب ${schema.label} لا يحتوي على عمود في هذه الجهة (${side}).`
      );
    }
  }

  for (const [slotId, words] of Object.entries(SLOT_WORDS)) {
    if (words.some((w) => n.includes(norm(w)))) {
      const slot = getSlot(schema, slotId);
      if (slot) return slot;
      throw new LayoutError("SLOT_NOT_AVAILABLE", `قالب ${schema.label} لا يحتوي على «${ref}».`);
    }
  }

  throw new LayoutError("SLOT_UNKNOWN", `تعذّر تحديد العمود المقصود بـ«${ref}».`);
}

/** السلوت الذي يوجد فيه القسم حالياً */
export function findSectionSlot(layout, section) {
  for (const [slotId, arr] of Object.entries(layout || {})) {
    if ((arr || []).includes(section)) return slotId;
  }
  return null;
}

/* ---------- التطبيع والتحقق ---------- */

/**
 * يعيد layout صالحاً دائماً: بلا تكرار، بلا أقسام مفقودة، بلا سلوتات غير موجودة في القالب.
 * الأقسام التي فقدت مكانها تعود إلى موضعها الافتراضي في القالب.
 */
export function normalizeLayout(layout, schema) {
  const movable = new Set(schema.movableSections);
  const ids = slotIds(schema);
  const out = emptyLayoutFor(schema);
  const placed = new Set();

  for (const slotId of ids) {
    for (const section of layout?.[slotId] || []) {
      if (!movable.has(section) || placed.has(section)) continue;
      out[slotId].push(section);
      placed.add(section);
    }
  }

  // أقسام موجودة في سلوت غير معروف (مثل sidebar في قالب بعمود واحد) → إلى موضعها الافتراضي
  const fallback = primarySlotId(schema);
  for (const [slotId, arr] of Object.entries(layout || {})) {
    if (ids.includes(slotId)) continue;
    for (const section of arr || []) {
      if (!movable.has(section) || placed.has(section)) continue;
      out[fallback].push(section);
      placed.add(section);
    }
  }

  // أقسام مفقودة تماماً → افتراضي القالب
  for (const slotId of ids) {
    for (const section of schema.defaultPlacement[slotId] || []) {
      if (movable.has(section) && !placed.has(section)) {
        out[slotId].push(section);
        placed.add(section);
      }
    }
  }
  for (const section of schema.movableSections) {
    if (!placed.has(section)) {
      out[fallback].push(section);
      placed.add(section);
    }
  }

  return out;
}

/** تحقق صريح — يعيد { ok, errors } دون رمي استثناء */
export function validateLayout(layout, schema) {
  const errors = [];
  if (!layout || typeof layout !== "object") return { ok: false, errors: ["هيكل الأعمدة غير صالح."] };

  const ids = slotIds(schema);
  const movable = new Set(schema.movableSections);
  const seen = new Map();

  for (const slotId of Object.keys(layout)) {
    if (!ids.includes(slotId)) {
      // sidebar فارغة في قالب بعمود واحد مقبولة (توافق مع الشكل القديم)
      if ((layout[slotId] || []).length > 0) errors.push(`العمود «${slotId}» غير موجود في قالب ${schema.label}.`);
      continue;
    }
    if (!Array.isArray(layout[slotId])) {
      errors.push(`محتوى العمود «${slotId}» يجب أن يكون قائمة.`);
      continue;
    }
    for (const section of layout[slotId]) {
      if (schema.fixedSections.includes(section)) {
        errors.push(`القسم «${section}» مثبّت في تصميم القالب ولا يُدار عبر الأعمدة.`);
        continue;
      }
      if (!movable.has(section)) errors.push(`القسم «${section}» غير معروف.`);
      if (seen.has(section)) errors.push(`القسم «${section}» مكرر في أكثر من عمود.`);
      else seen.set(section, slotId);
    }
  }

  for (const section of schema.movableSections) {
    if (!seen.has(section)) errors.push(`القسم «${section}» مفقود من كل الأعمدة.`);
  }

  for (const slot of schema.slots) {
    const count = (layout[slot.id] || []).length;
    const min = slot.minItems ?? 0;
    if (count < min) {
      errors.push(`«${slot.label}» في قالب ${schema.label} يجب أن يحتوي على ${min} قسم على الأقل.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/** تحقق داخلي يرمي أول خطأ — يُستخدم قبل إعادة أي نتيجة */
function assertValid(layout, schema, code) {
  const { ok, errors } = validateLayout(layout, schema);
  if (!ok) throw new LayoutError(code, errors[0]);
  return layout;
}

/* ---------- إدراج بموضع ---------- */

function insertAt(arr, section, { before, after, index } = {}) {
  const out = arr.filter((s) => s !== section);
  if (before) {
    const i = out.indexOf(before);
    if (i === -1) throw new LayoutError("ANCHOR_NOT_IN_SLOT", `القسم «${before}» ليس في هذا العمود.`);
    out.splice(i, 0, section);
    return out;
  }
  if (after) {
    const i = out.indexOf(after);
    if (i === -1) throw new LayoutError("ANCHOR_NOT_IN_SLOT", `القسم «${after}» ليس في هذا العمود.`);
    out.splice(i + 1, 0, section);
    return out;
  }
  if (Number.isInteger(index)) {
    out.splice(Math.max(0, Math.min(out.length, index)), 0, section);
    return out;
  }
  out.push(section);
  return out;
}

/* ---------- العمليات العامة ---------- */

/**
 * ينقل قسماً إلى عمود آخر (أو موضع آخر) — دالة نقية.
 * @param {object} layout  { main: [], sidebar: [] }
 * @param {string} section أحد الأقسام القابلة للنقل
 * @param {string} targetSlot معرّف سلوت أو وصف بشري ("العمود الأيمن" / "sidebar" / "höger")
 * @param {object} options { templateId, before, after, index }
 * @returns {object} layout جديد ومُتحقَّق منه
 */
export function moveSection(layout, section, targetSlot, options = {}) {
  const schema = getTemplateSchema(options.templateId);

  if (schema.fixedSections.includes(section)) {
    throw new LayoutError("SECTION_FIXED", `«${section}» جزء ثابت من تصميم القالب ولا يمكن نقله.`);
  }
  if (!schema.movableSections.includes(section)) {
    throw new LayoutError("SECTION_UNKNOWN", `القسم «${section}» غير معروف.`);
  }

  const current = normalizeLayout(layout, schema);
  const slot = resolveSlot(schema, targetSlot);
  const from = findSectionSlot(current, section);

  if (from !== slot.id) {
    if (!hasMultipleSlots(schema) || !schema.canMoveBetweenSlots) {
      throw new LayoutError(
        "MOVE_BETWEEN_SLOTS_NOT_ALLOWED",
        `قالب ${schema.label} بعمود واحد — يمكن إعادة ترتيب الأقسام فقط، لا نقلها بين الأعمدة.`
      );
    }
    const fromSlot = getSlot(schema, from);
    const remaining = current[from].length - 1;
    const min = fromSlot?.minItems ?? 0;
    if (remaining < min) {
      throw new LayoutError(
        "SOURCE_SLOT_MIN_ITEMS",
        `لا يمكن إفراغ «${fromSlot.label}» في قالب ${schema.label} — يجب أن يبقى فيه ${min} قسم على الأقل.`
      );
    }
  }

  const next = clone(current);
  next[from] = next[from].filter((s) => s !== section);
  next[slot.id] = insertAt(next[slot.id], section, options);

  return assertValid(next, schema, "INVALID_RESULT");
}

/**
 * يعيد ترتيب قسم داخل عموده الحالي — دالة نقية.
 * @param {object} options { templateId, before, after, index }
 */
export function reorderSection(layout, section, options = {}) {
  const schema = getTemplateSchema(options.templateId);

  if (schema.fixedSections.includes(section)) {
    throw new LayoutError("SECTION_FIXED", `«${section}» جزء ثابت من تصميم القالب ولا يمكن ترتيبه.`);
  }
  if (!schema.movableSections.includes(section)) {
    throw new LayoutError("SECTION_UNKNOWN", `القسم «${section}» غير معروف.`);
  }

  const current = normalizeLayout(layout, schema);
  const slotId = findSectionSlot(current, section);
  if (!slotId) throw new LayoutError("SECTION_NOT_PLACED", `القسم «${section}» غير موجود في أي عمود.`);

  const next = clone(current);
  next[slotId] = insertAt(next[slotId], section, options);

  return assertValid(next, schema, "INVALID_RESULT");
}

/** وصف قدرات القالب — للاستخدام لاحقاً في الواجهة أو أدوات الوكيل */
export function layoutCapabilities(templateId) {
  const schema = getTemplateSchema(templateId);
  return {
    templateId: schema.id,
    label: schema.label,
    columns: schema.columns,
    canMoveBetweenSlots: schema.canMoveBetweenSlots,
    slots: schema.slots.map((s) => ({ id: s.id, label: s.label, side: s.side, width: s.width, minItems: s.minItems ?? 0 })),
    movableSections: [...schema.movableSections],
    fixedSections: [...schema.fixedSections],
    constraints: { ...schema.constraints }
  };
}