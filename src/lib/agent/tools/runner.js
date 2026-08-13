/**
 * منفّذ الأدوات: تنفيذ → تحقق → تسجيل العملية.
 * إذا فشل التحقق تُرفض النتيجة وتبقى الحالة السابقة كما هي (لا حفظ).
 */
import { TOOLS } from "./registry";
import { ToolError } from "./locate";
import { validateCV, validateLayout } from "./validation";
import { recordOperation } from "./operationHistory";

/**
 * @param {string} toolName
 * @param {object} args
 * @param {{data: object, layout: object}} state
 * @returns {{ ok: boolean, state?: object, operation?: object, message: string, code?: string }}
 */
export function runTool(toolName, args, state) {
  const tool = TOOLS[toolName];
  if (!tool) return { ok: false, message: `الأداة "${toolName}" غير متاحة.`, code: "unknown_tool" };

  let result;
  try {
    result = tool.run(state, args || {});
  } catch (e) {
    if (e instanceof ToolError) return { ok: false, message: e.message, code: e.code };
    return { ok: false, message: "تعذّر تنفيذ العملية.", code: "execution_failed" };
  }

  const cv = validateCV(result.state.data);
  const lay = validateLayout(result.state.layout);
  if (!cv.ok || !lay.ok) {
    return { ok: false, message: `تم إلغاء التعديل: ${[...cv.errors, ...lay.errors].join(" ")}`, code: "validation_failed" };
  }

  const operation = recordOperation({
    tool: toolName,
    targetId: result.operation.targetId,
    field: result.operation.field,
    before: result.operation.before,
    after: result.operation.after,
    meta: result.operation.meta,
    summary: result.summary
  });

  return { ok: true, state: result.state, operation, message: result.summary };
}