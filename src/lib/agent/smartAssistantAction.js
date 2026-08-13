/**
 * طبقة وسيطة بين Smart CV Assistant (فهم اللغة) وأدوات التنفيذ:
 *   - cv_move_section  → تعديل الـlayout فقط
 *   - cv_edit_content  → تعديل محتوى السيرة فقط
 * لا تلمس هذه الطبقة بيانات السيرة ولا مصفوفات layout بنفسها — التنفيذ حصراً داخل الأداتين.
 */
import { runCvMoveSection, TOOL_NAME as MOVE_TOOL, CV_MOVE_SECTION_INPUT_SCHEMA } from "@/lib/agent/tools/cvMoveSectionTool";
import { runCvEditContent, TOOL_NAME as EDIT_TOOL, CV_EDIT_CONTENT_INPUT_SCHEMA } from "@/lib/agent/tools/cvEditContentTool";

export const ACTION_OPEN = "<<<CV_ACTION";
export const ACTION_CLOSE = "CV_ACTION>>>";

/** الإجراءان الوحيدان المسموحان — لا إجراء ثالث */
const ALLOWED_ARG_KEYS = {
  [MOVE_TOOL]: Object.keys(CV_MOVE_SECTION_INPUT_SCHEMA.properties),
  [EDIT_TOOL]: Object.keys(CV_EDIT_CONTENT_INPUT_SCHEMA.properties)
};
const ALLOWED_ACTIONS = Object.keys(ALLOWED_ARG_KEYS);

/** يستخرج كتلة الإجراء من نص رسالة الوكيل، أو null إن لم توجد */
export function extractAction(content) {
  const text = String(content || "");
  const start = text.indexOf(ACTION_OPEN);
  if (start === -1) return null;
  const end = text.indexOf(ACTION_CLOSE, start);
  if (end === -1) return null;
  const raw = text.slice(start + ACTION_OPEN.length, end).trim();
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** يحذف كتلة الإجراء من النص المعروض للمستخدم */
export function stripAction(content) {
  const text = String(content || "");
  const start = text.indexOf(ACTION_OPEN);
  if (start === -1) return text;
  const end = text.indexOf(ACTION_CLOSE, start);
  if (end === -1) return text.slice(0, start).trim();
  return (text.slice(0, start) + text.slice(end + ACTION_CLOSE.length)).trim();
}

/** تحقق شكلي صارم قبل أي تنفيذ */
export function validateAction(action, activeTemplateId) {
  if (!action || typeof action !== "object") return { ok: false, message: "الإجراء غير مقروء." };
  if (!ALLOWED_ACTIONS.includes(action.action)) return { ok: false, message: "هذا الإجراء غير مدعوم." };
  const args = action.arguments;
  if (!args || typeof args !== "object" || Array.isArray(args)) return { ok: false, message: "معطيات الإجراء غير صالحة." };
  const unknown = Object.keys(args).filter((k) => !ALLOWED_ARG_KEYS[action.action].includes(k));
  if (unknown.length) return { ok: false, message: "معطيات الإجراء تحتوي حقولاً غير مسموحة." };
  if (action.action === MOVE_TOOL && (!args.templateId || args.templateId !== activeTemplateId)) {
    return { ok: false, message: "القالب المذكور لا يطابق القالب المعروض حالياً." };
  }
  return { ok: true };
}

/** رسائل بشرية لأكواد فشل تعديل المحتوى — بلا أي إعادة محاولة تلقائية */
const EDIT_ERROR_MESSAGES = {
  STALE_VALUE: "تغيّرت قيمة الحقل بعد قراءتها، فلم يُنفَّذ التعديل. أعد الطلب ليُقرأ النص الحالي من جديد.",
  FIELD_NOT_FOUND: "هذا الحقل غير موجود في هذا القسم من السيرة.",
  ITEM_NOT_FOUND: "لم أتعرّف على العنصر المقصود في السيرة — وضّح أي عنصر تريد تعديله.",
  ITEM_AMBIGUOUS: "أكثر من عنصر يطابق الوصف — حدِّد العنصر بدقة.",
  VALUE_TYPE_INVALID: "القيمة الجديدة غير مقبولة لهذا الحقل.",
  VALUE_EMPTY: "لا يمكن تفريغ هذا الحقل.",
  VALUE_FORMAT_INVALID: "صيغة القيمة الجديدة غير صحيحة.",
  ITEM_REQUIRED_FIELDS: "بيانات العنصر الجديد ناقصة.",
  ITEM_IDENTITY_REQUIRED: "بيانات العنصر الجديد الأساسية ناقصة.",
  SECTION_WOULD_BE_EMPTY: "لا يمكن حذف العنصر الأخير في هذا القسم."
};

/**
 * ينفّذ إجراء الوكيل بشكل ذرّي — إمّا layout وإمّا content، وليس الاثنين.
 * @returns {{status:"none"|"invalid"|"failed"|"applied", kind?:"layout"|"content", message?:string, newLayout?:object, newData?:object}}
 */
export function executeAssistantAction({ content, templateId, layout, data }) {
  const action = extractAction(content);
  if (!action) return { status: "none" };

  const shape = validateAction(action, templateId);
  if (!shape.ok) return { status: "invalid", message: shape.message };

  if (action.action === MOVE_TOOL) {
    const result = runCvMoveSection(action.arguments, layout, data);
    if (!result || result.success !== true || !result.newLayout || typeof result.newLayout !== "object") {
      return { status: "failed", kind: "layout", message: result?.message || "تعذّر تنفيذ التغيير." };
    }
    return { status: "applied", kind: "layout", message: result.summary, newLayout: result.newLayout };
  }

  const result = runCvEditContent(action.arguments, data);
  if (!result || result.success !== true || !result.newData || typeof result.newData !== "object") {
    const msg = EDIT_ERROR_MESSAGES[result?.errorCode] || result?.message || "تعذّر تنفيذ التعديل.";
    return { status: "failed", kind: "content", message: msg };
  }
  return { status: "applied", kind: "content", message: result.summary, newData: result.newData };
}