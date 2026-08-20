/**
 * tailorContext — بناء كتلة CV_CONTEXT لسيرة محدّدة في مسار تخصيص الوظيفة.
 *
 * منطق نقيّ للعرض/الإرسال فقط: لا قراءة من مستودع ولا كتابة على أي سيرة.
 * الغرض: أن يصل معرّف السيرة المحدّدة وفهرسها مع **كل** رسالة، لا مع الأولى وحدها،
 * فلا يسأل الوكيل عن معرّف سيرة موجود أصلاً في السياق.
 */
import { buildCVIndex, summarizeIndex } from "@/lib/agent/cvIndex";

/** @returns {string} كتلة السياق، أو "" إن لم تكن هناك سيرة محدّدة */
export function cvContextBlock(record) {
  if (!record?.id) return "";
  return `\n\n<<<CV_CONTEXT\n${JSON.stringify({
    cvId: record.id,
    templateId: record.templateId,
    // المحتوى الفعلي لازم للمطابقة: الفهرس وحده يعطي معرّفات بلا نصوص، فيعود الوكيل بلا توصيات
    CV_DATA: record.data,
    CV_INDEX: summarizeIndex(buildCVIndex(record.data))
  })}\nCV_CONTEXT>>>`;
}

/** السيرة الفعلية لهذه الجلسة: النسخة المخصّصة إن وُجدت، وإلا السيرة المحدّدة في الصفحة */
export const activeTailorCv = (targetCv, selectedCv) => targetCv || selectedCv || null;