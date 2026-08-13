/**
 * طبقة وسيطة بين Smart CV Assistant (فهم اللغة) وأداة cv_move_section (تنفيذ + تحقق).
 * لا تلمس بيانات السيرة، ولا تعدّل أي مصفوفة layout بنفسها — التنفيذ حصراً عبر runCvMoveSection.
 */
import { runCvMoveSection, TOOL_NAME, CV_MOVE_SECTION_INPUT_SCHEMA } from "@/lib/agent/tools/cvMoveSectionTool";

export const ACTION_OPEN = "<<<CV_ACTION";
export const ACTION_CLOSE = "CV_ACTION>>>";

/** الإجراء الوحيد المسموح في هذه المرحلة */
const ALLOWED_ACTIONS = [TOOL_NAME];
const ALLOWED_ARG_KEYS = Object.keys(CV_MOVE_SECTION_INPUT_SCHEMA.properties);

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
  const unknown = Object.keys(args).filter((k) => !ALLOWED_ARG_KEYS.includes(k));
  if (unknown.length) return { ok: false, message: "معطيات الإجراء تحتوي حقولاً غير مسموحة." };
  if (!args.templateId || args.templateId !== activeTemplateId) {
    return { ok: false, message: "القالب المذكور لا يطابق القالب المعروض حالياً." };
  }
  return { ok: true };
}

/**
 * ينفّذ إجراء الوكيل بشكل ذرّي.
 * @returns {{status:"none"|"invalid"|"failed"|"applied", message?:string, newLayout?:object}}
 */
export function executeAssistantAction({ content, templateId, layout, data }) {
  const action = extractAction(content);
  if (!action) return { status: "none" };

  const shape = validateAction(action, templateId);
  if (!shape.ok) return { status: "invalid", message: shape.message };

  const result = runCvMoveSection(action.arguments, layout, data);
  if (!result || result.success !== true) {
    return { status: "failed", message: result?.message || "تعذّر تنفيذ التغيير." };
  }
  if (!result.newLayout || typeof result.newLayout !== "object") {
    return { status: "failed", message: "تعذّر تنفيذ التغيير." };
  }
  return { status: "applied", message: result.summary, newLayout: result.newLayout };
}