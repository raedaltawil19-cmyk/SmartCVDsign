/**
 * cv_edit_content — أداة مستقلة تماماً لتعديل محتوى السيرة الذاتية (Pure Function).
 *
 * قواعد معمارية:
 * - مستقلة كلياً عن cv_move_section: لا تستورد cvMoveSectionTool ولا layoutOps ولا templateLayoutSchema.
 * - لا تلمس layout ولا templateId، ولا تعرفهما إطلاقاً (ليسا في المدخلات ولا في المخرجات).
 * - لا تحفظ شيئاً: لا SavedCV، لا cvRepository، لا setData، لا استدعاءات شبكة، ولا LLM.
 * - تستقبل cvData وتعيد نسخة جديدة (newData) فقط، دون تعديل المدخل.
 * - مصدر الحقيقة للحقول والمعرّفات: cvIndex.js + locate.js + validation.js (لا تكرار لمنطقها هنا).
 */
import { buildCVIndex, FIELD_ROLES, SECTION_META } from "@/lib/agent/cvIndex";
import { resolveField, ToolError } from "@/lib/agent/tools/locate";
import { validateCV } from "@/lib/agent/tools/validation";

export const TOOL_NAME = "cv_edit_content";

/** الأقسام القابلة للتعديل عبر هذه الأداة (header/kontakt مستبعدة تماماً) */
export const EDITABLE_SECTIONS = ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"];
/** أقسام القوائم — الوحيدة التي تقبل add_item / remove_item */
export const LIST_SECTIONS = ["erfarenhet", "utbildning", "fardigheter", "sprak"];
/** أقسام محمية لا تُقبل بأي شكل */
export const FORBIDDEN_SECTIONS = ["header", "kontakt"];
export const OPERATIONS = ["replace_field", "add_item", "remove_item"];
/** مستويات اللغة المسموحة (مطابقة لتعليمات cvModel) */
export const SPRAK_LEVELS = ["Modersmål", "Flytande", "Goda kunskaper", "Grundläggande"];

export const CV_EDIT_CONTENT_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["section", "operation"],
  properties: {
    section: { type: "string", enum: EDITABLE_SECTIONS },
    operation: { type: "string", enum: OPERATIONS },
    itemRef: { type: "string", description: "Stable ID صادر عن cvIndex (مثل experience_8f31a أو profile_main)" },
    field: { type: "string", description: "اسم الحقل الفعلي أو دوره الدلالي" },
    value: { type: ["string", "number"] },
    expectedValue: { type: ["string", "number"], description: "القيمة الحالية كما رآها الطالب — إلزامية في replace_field" },
    item: { type: "object", description: "عنصر جديد بحقول القسم المعروفة فقط (add_item)" },
    index: { type: "integer", minimum: 0 }
  }
};

const ALLOWED_INPUT_KEYS = Object.keys(CV_EDIT_CONTENT_INPUT_SCHEMA.properties);
const PROFIL_ITEM_REF = "profile_main";

/** المفاتيح المسموحة لكل عملية — صرامة كاملة، لا تجاهل صامت */
export const OPERATION_KEYS = {
  replace_field: ["section", "operation", "itemRef", "field", "value", "expectedValue"],
  add_item: ["section", "operation", "item", "index"],
  remove_item: ["section", "operation", "itemRef"]
};

/** حقول الهوية التي تدخل في Stable ID ويجب ألا تكون فارغة عند إنشاء عنصر */
const IDENTITY_FIELDS = {
  erfarenhet: ["roll", "foretag", "period"],
  utbildning: ["examen", "skola", "period"],
  fardigheter: ["namn"],
  sprak: ["sprak"]
};

/** الحقول الفعلية لكل قسم — مشتقة من FIELD_ROLES وليست مكتوبة يدوياً */
export const sectionFields = (section) => Object.keys(FIELD_ROLES[section] || {});

const snap = (v) => JSON.stringify(v === undefined ? null : v);
const deepClone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

const fail = (errorCode, message, section, operation) => ({
  success: false,
  operation: operation || TOOL_NAME,
  section: section ?? null,
  errorCode,
  message
});

/** فرض النوع حسب القسم والحقل */
function checkValueType(section, field, value) {
  if (section === "fardigheter" && field === "niva") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "مستوى المهارة يجب أن يكون رقماً.";
    if (value < 0 || value > 100) return "مستوى المهارة يجب أن يكون بين 0 و100.";
    return null;
  }
  if (section === "sprak" && field === "niva") {
    if (typeof value !== "string") return "مستوى اللغة يجب أن يكون نصاً.";
    if (!SPRAK_LEVELS.includes(value)) return `مستوى اللغة يجب أن يكون أحد: ${SPRAK_LEVELS.join(" / ")}.`;
    return null;
  }
  if (typeof value !== "string") return `الحقل «${field}» يجب أن يكون نصاً.`;
  return null;
}

/**
 * يحدّد موقع العنصر داخل بيانات القسم عبر Stable ID فقط — بلا أي مطابقة نصية.
 * @returns {{index:number}|{error:string}}
 */
function locateByRef(data, section, itemRef) {
  const index = buildCVIndex(data);
  const secIdx = index.sections.find((s) => s.section === section);
  if (!secIdx) return { error: "ITEM_NOT_FOUND" };
  const matches = secIdx.items.filter((i) => i.id === itemRef);
  if (matches.length === 0) {
    // المرجع موجود لكنه في قسم آخر؟ نميّز الخطأ بوضوح.
    const other = index.sections.find((s) => s.items.some((i) => i.id === itemRef));
    if (other) return { error: FORBIDDEN_SECTIONS.includes(other.section) ? "SECTION_FORBIDDEN" : "ITEM_SECTION_MISMATCH", otherSection: other.section };
    return { error: "ITEM_NOT_FOUND" };
  }
  if (matches.length > 1) return { error: "ITEM_AMBIGUOUS" };
  return { index: matches[0].index };
}

/** يعيد المرجع الثابت للعنصر في موضع معيّن بعد التعديل */
function refAtIndex(data, section, idx) {
  const secIdx = buildCVIndex(data).sections.find((s) => s.section === section);
  const item = secIdx?.items.find((i) => i.index === idx);
  return item ? item.id : null;
}

/**
 * يتحقق أن newData يختلف عن الأصل في المسار المستهدف فقط.
 * @param {string[]} allowedPaths مسارات مثل ["erfarenhet"] — أي فرق خارجها = تغيير غير مقصود.
 */
function onlyChangedIn(original, next, allowedPaths) {
  const keys = new Set([...Object.keys(original || {}), ...Object.keys(next || {})]);
  for (const k of keys) {
    if (allowedPaths.includes(k)) continue;
    if (snap(original?.[k]) !== snap(next?.[k])) return k;
  }
  return null;
}

/**
 * ينفّذ عملية تعديل محتوى واحدة. لا يرمي استثناءات ولا يعدّل أي مدخل.
 * @param {object} input   { section, operation, itemRef?, field?, value?, expectedValue?, item?, index? }
 * @param {object} cvData  نموذج السيرة الحالي (cvModel)
 */
export function runCvEditContent(input, cvData) {
  const inp = input || {};
  const section = inp.section;
  const operation = inp.operation;

  // 1) مدخلات صارمة
  const unknown = Object.keys(inp).filter((k) => !ALLOWED_INPUT_KEYS.includes(k));
  if (unknown.length) return fail("INPUT_UNKNOWN_KEYS", `مدخلات غير معروفة: ${unknown.join(", ")}.`, section, operation);
  if (!cvData || typeof cvData !== "object" || Array.isArray(cvData)) {
    return fail("CV_DATA_REQUIRED", "لم تُمرَّر بيانات السيرة.", section, operation);
  }
  if (!section) return fail("SECTION_REQUIRED", "لم يُحدَّد القسم.", section, operation);
  if (FORBIDDEN_SECTIONS.includes(section) || !EDITABLE_SECTIONS.includes(section)) {
    return fail("SECTION_FORBIDDEN", `القسم «${section}» غير قابل للتعديل عبر هذه الأداة.`, section, operation);
  }
  if (!OPERATIONS.includes(operation)) return fail("OPERATION_INVALID", "العملية المطلوبة غير مدعومة.", section, operation);
  const opKeys = OPERATION_KEYS[operation];
  const irrelevant = Object.keys(inp).filter((k) => !opKeys.includes(k));
  if (irrelevant.length) {
    return fail("INPUT_UNKNOWN_KEYS", `مفاتيح لا تُستخدم في هذه العملية: ${irrelevant.join(", ")}.`, section, operation);
  }

  const before = snap(cvData);
  const draft = deepClone(cvData);
  const allowedFields = sectionFields(section);

  let result;
  try {
    if (operation === "replace_field") {
      if (!inp.itemRef) return fail("ITEM_REF_REQUIRED", "لم يُحدَّد العنصر المستهدف.", section, operation);
      if (inp.field === undefined || inp.field === null || inp.field === "") {
        return fail("FIELD_REQUIRED", "لم يُحدَّد الحقل المستهدف.", section, operation);
      }
      if (inp.value === undefined) return fail("VALUE_REQUIRED", "لم تُحدَّد القيمة الجديدة.", section, operation);
      if (inp.expectedValue === undefined) {
        return fail("EXPECTED_VALUE_REQUIRED", "القيمة الحالية (expectedValue) إلزامية قبل أي تعديل.", section, operation);
      }

      let field;
      try {
        field = resolveField(section, inp.field);
      } catch (e) {
        if (e instanceof ToolError) return fail("FIELD_NOT_FOUND", e.message, section, operation);
        throw e;
      }
      if (!allowedFields.includes(field)) return fail("FIELD_NOT_FOUND", `الحقل «${inp.field}» غير موجود في القسم.`, section, operation);

      const typeError = checkValueType(section, field, inp.value);
      if (typeError) return fail("VALUE_TYPE_INVALID", typeError, section, operation);
      if (typeof inp.value === "string" && inp.value.trim() === "") {
        return fail("VALUE_EMPTY", "لا يمكن تفريغ الحقل بقيمة نصية فارغة.", section, operation);
      }

      if (section === "profil") {
        if (inp.itemRef !== PROFIL_ITEM_REF) return fail("ITEM_NOT_FOUND", `المرجع «${inp.itemRef}» غير موجود في قسم الملف الشخصي.`, section, operation);
        const current = draft.profil ?? "";
        if (current !== inp.expectedValue) return fail("STALE_VALUE", "القيمة الحالية للحقل تختلف عمّا استُند إليه — أعد قراءة السيرة.", section, operation);
        draft.profil = inp.value;
        const mutated = onlyChangedIn(cvData, draft, ["profil"]);
        if (mutated) return fail("UNEXPECTED_MUTATION", `تغيّر غير مقصود في «${mutated}».`, section, operation);
        result = {
          section,
          itemRef: PROFIL_ITEM_REF,
          field,
          previousValue: current,
          newValue: inp.value,
          newItemRef: PROFIL_ITEM_REF,
          summary: "تم تحديث نص الملف الشخصي."
        };
      } else {
        const loc = locateByRef(draft, section, inp.itemRef);
        if (loc.error) return fail(loc.error, loc.error === "ITEM_AMBIGUOUS" ? "المرجع يطابق أكثر من عنصر — حدِّد العنصر بدقة." : `لم أجد العنصر (${inp.itemRef}) في القسم.`, section, operation);
        const arr = draft[section];
        if (!Array.isArray(arr) || !arr[loc.index]) return fail("ITEM_NOT_FOUND", `لم أجد العنصر (${inp.itemRef}).`, section, operation);
        const current = arr[loc.index][field] ?? "";
        if (current !== inp.expectedValue) return fail("STALE_VALUE", "القيمة الحالية للحقل تختلف عمّا استُند إليه — أعد قراءة السيرة.", section, operation);
        arr[loc.index] = { ...arr[loc.index], [field]: inp.value };
        const mutated = onlyChangedIn(cvData, draft, [section]);
        if (mutated) return fail("UNEXPECTED_MUTATION", `تغيّر غير مقصود في «${mutated}».`, section, operation);
        const otherChanged = (cvData[section] || []).some((it, i) => i !== loc.index && snap(it) !== snap(arr[i]));
        if (otherChanged || arr.length !== (cvData[section] || []).length) {
          return fail("UNEXPECTED_MUTATION", "تغيّر غير مقصود في عناصر أخرى داخل القسم.", section, operation);
        }
        result = {
          section,
          itemRef: inp.itemRef,
          field,
          previousValue: current,
          newValue: inp.value,
          newItemRef: refAtIndex(draft, section, loc.index),
          summary: `تم تحديث «${field}» في ${SECTION_META[section]?.labelAr || section}.`
        };
      }
    }

    if (operation === "add_item") {
      if (!LIST_SECTIONS.includes(section)) return fail("OPERATION_NOT_ALLOWED_FOR_SECTION", `لا يمكن إضافة عنصر إلى ${SECTION_META[section]?.labelAr || section}.`, section, operation);
      if (!inp.item || typeof inp.item !== "object" || Array.isArray(inp.item)) {
        return fail("ITEM_REQUIRED", "لم تُمرَّر بيانات العنصر الجديد.", section, operation);
      }
      const extra = Object.keys(inp.item).filter((k) => !allowedFields.includes(k));
      if (extra.length) return fail("INPUT_UNKNOWN_KEYS", `حقول غير معروفة في العنصر: ${extra.join(", ")}.`, section, operation);
      const missing = allowedFields.filter((f) => inp.item[f] === undefined);
      if (missing.length) {
        return fail("ITEM_REQUIRED_FIELDS", `حقول مطلوبة ناقصة: ${missing.join(", ")}.`, section, operation);
      }
      for (const f of allowedFields) {
        const err = checkValueType(section, f, inp.item[f]);
        if (err) return fail("VALUE_TYPE_INVALID", err, section, operation);
      }
      const emptyIdentity = (IDENTITY_FIELDS[section] || []).filter((f) => String(inp.item[f] ?? "").trim() === "");
      if (emptyIdentity.length) {
        return fail("ITEM_IDENTITY_REQUIRED", `حقول الهوية لا يجوز أن تكون فارغة: ${emptyIdentity.join(", ")}.`, section, operation);
      }
      const arr = Array.isArray(draft[section]) ? draft[section] : [];
      let at = arr.length;
      if (inp.index !== undefined) {
        if (!Number.isInteger(inp.index) || inp.index < 0 || inp.index > arr.length) {
          return fail("INDEX_INVALID", "الموضع المطلوب خارج النطاق.", section, operation);
        }
        at = inp.index;
      }
      const newItem = {};
      for (const f of allowedFields) newItem[f] = inp.item[f];
      arr.splice(at, 0, newItem);
      draft[section] = arr;
      const mutated = onlyChangedIn(cvData, draft, [section]);
      if (mutated) return fail("UNEXPECTED_MUTATION", `تغيّر غير مقصود في «${mutated}».`, section, operation);
      result = {
        section,
        itemRef: null,
        field: null,
        previousValue: null,
        newValue: newItem,
        newItemRef: refAtIndex(draft, section, at),
        summary: `تمت إضافة عنصر جديد إلى ${SECTION_META[section]?.labelAr || section}.`
      };
    }

    if (operation === "remove_item") {
      if (!LIST_SECTIONS.includes(section)) return fail("OPERATION_NOT_ALLOWED_FOR_SECTION", `لا يمكن حذف عنصر من ${SECTION_META[section]?.labelAr || section}.`, section, operation);
      if (!inp.itemRef) return fail("ITEM_REF_REQUIRED", "لم يُحدَّد العنصر المطلوب حذفه.", section, operation);
      const loc = locateByRef(draft, section, inp.itemRef);
      if (loc.error) return fail(loc.error, loc.error === "ITEM_AMBIGUOUS" ? "المرجع يطابق أكثر من عنصر — حدِّد العنصر بدقة." : `لم أجد العنصر (${inp.itemRef}) في القسم.`, section, operation);
      const arr = draft[section];
      if ((arr || []).length <= 1) {
        return fail("SECTION_WOULD_BE_EMPTY", `${SECTION_META[section]?.labelAr || section} يجب أن يبقى فيه عنصر واحد على الأقل.`, section, operation);
      }
      const removed = arr[loc.index];
      arr.splice(loc.index, 1);
      const mutated = onlyChangedIn(cvData, draft, [section]);
      if (mutated) return fail("UNEXPECTED_MUTATION", `تغيّر غير مقصود في «${mutated}».`, section, operation);
      if (arr.length !== (cvData[section] || []).length - 1) {
        return fail("UNEXPECTED_MUTATION", "عدد العناصر بعد الحذف غير متوقع.", section, operation);
      }
      result = {
        section,
        itemRef: inp.itemRef,
        field: null,
        previousValue: removed,
        newValue: null,
        newItemRef: null,
        summary: `تم حذف عنصر من ${SECTION_META[section]?.labelAr || section}.`
      };
    }

    if (!result) return fail("OPERATION_INVALID", "العملية المطلوبة غير مدعومة.", section, operation);

    // تحقق نهائي: صلاحية النموذج + عدم تغيّر المدخل الأصلي
    const v = validateCV(draft);
    if (!v.ok) return fail("INVALID_RESULT", v.errors[0], section, operation);
    if (snap(cvData) !== before) return fail("UNEXPECTED_MUTATION", "بيانات السيرة الأصلية تغيّرت أثناء التنفيذ.", section, operation);

    return { success: true, operation, ...result, newData: draft };
  } catch (e) {
    if (e instanceof ToolError) return fail(e.code || "UNEXPECTED_ERROR", e.message, section, operation);
    return fail("UNEXPECTED_ERROR", "تعذّر تنفيذ التعديل.", section, operation);
  }
}

export default runCvEditContent;