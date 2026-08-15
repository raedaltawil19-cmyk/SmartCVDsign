/**
 * workflowRoutes — نقطة القرار بين مسارَي العمل بعد وجود سيرة واختيار قالب:
 *   1) تحسين عام  → CV Review Coach (تحليل وتوصيات فقط)
 *   2) تخصيص لوظيفة → مسار الوظيفة (Fast Matching → master → نسخة tailored مستقلة)
 *
 * قواعد معمارية (بالتصميم لا بالتعليق):
 * - منطق نقيّ: لا base44، لا React، لا cvRepository، لا setData/setLayout، ولا أدوات تعديل.
 * - المسارين **متعارضان**: قرار واحد يفعّل مساراً واحداً فقط، فلا يشتغل الآخر تلقائياً.
 * - لا كاتب جديد: هذه الوحدة لا تكتب شيئاً؛ التنفيذ يبقى حصراً عبر Smart CV Assistant
 *   → executeAssistantAction، وإنشاء النسخة المخصّصة يبقى create-only عبر cvProfiles.
 */

export const WORKFLOW_GENERAL = "general";
export const WORKFLOW_TAILOR = "tailor";
export const WORKFLOW_CHOICES = [WORKFLOW_GENERAL, WORKFLOW_TAILOR];

/** نقطة الاختيار لا تظهر إلا بعد وجود سيرة محفوظة وانتهاء مراجعة القالب */
export function isWorkflowChoiceReady({ cvId, templateId, templateReviewStatus, processing } = {}) {
  if (processing) return false;
  if (typeof cvId !== "string" || !cvId) return false;
  if (typeof templateId !== "string" || !templateId) return false;
  return templateReviewStatus !== "pending";
}

/**
 * ترجمة قرار المستخدم إلى إجراءين متعارضين — أحدهما فقط true دائماً.
 * @returns {{runGeneralReview:boolean, startJobTailoring:boolean, error?:string}}
 */
export function resolveWorkflowActions(choice) {
  if (choice === WORKFLOW_GENERAL) return { runGeneralReview: true, startJobTailoring: false };
  if (choice === WORKFLOW_TAILOR) return { runGeneralReview: false, startJobTailoring: true };
  return { runGeneralReview: false, startJobTailoring: false, error: "WORKFLOW_CHOICE_INVALID" };
}

/** التحسين العام لا يغيّر نوع السيرة — تبقى كما هي (master يبقى master) */
export const generalImprovementKeepsType = () => true;