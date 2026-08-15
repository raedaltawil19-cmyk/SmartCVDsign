/**
 * reviewEvidence — طبقة الأدلّة/التأكيد (Recommendation Evidence Layer).
 *
 * دورها **تحقّق وعرض فقط**، لا اكتشاف: حزمة الأدلّة (evidencePack) تُجهَّز أثناء
 * مرحلة المراجعة داخل cv_review_coach، وهذه الطبقة:
 *   1) تتحقّق أن الهدف (قسم/عنصر/حقل) ما زال موجوداً في الحالة الحالية للسيرة،
 *   2) تقرأ القيمة الحالية من السيرة نفسها (لا من كلام الوكيل)،
 *   3) تُعيد الحزمة كما جاءت لتُعرض فوراً بلا أي تحليل جديد،
 *   4) تعيد التحقّق قبل التسليم (stale ⇒ لا إرسال).
 *
 * قواعد معمارية:
 * - منطق نقيّ: لا React، لا base44، لا SavedCV، لا cvRepository، لا شبكة، لا بحث خارجي.
 * - لا تكتب شيئاً ولا تنفّذ شيئاً. نقطة التنفيذ الوحيدة تبقى executeAssistantAction.
 * - fail-closed: لا حزمة صالحة أو هدف غير قابل للتحقّق ⇒ لا تأكيد ولا إرسال.
 * - لا تولّد مرشَّحات من عناصر أخرى في السيرة (كان هذا سبب ظهور أدلّة غير مرتبطة).
 */
import { FIELD_ROLES, SECTION_META, buildCVIndex, getByRef } from "@/lib/agent/cvIndex";
import { sanitizeIntentText } from "@/lib/agent/reviewIntent";

/** الحالات التي تستدعي عرض بطاقة تأكيد قبل الإرسال */
const INTERACTIVE_STATUSES = ["ready", "needs_user"];

const descriptionField = (section) => {
  const roles = FIELD_ROLES[section] || {};
  return Object.keys(roles).find((f) => roles[f] === "description") || null;
};

/** الحقل المستهدف: ما حدّده الوكيل، وإلا حقل الوصف في القسم */
const fieldOf = (intent) => {
  const section = intent?.target?.section;
  const roles = FIELD_ROLES[section] || {};
  const f = intent?.target?.field;
  return f && Object.keys(roles).includes(f) ? f : descriptionField(section);
};

const refOf = (intent) =>
  intent?.target?.itemRef || (intent?.target?.section === "profil" ? "profile_main" : null);

/** هل تمرّ هذه التوصية بطبقة التأكيد؟ قرار مبنيّ على الحزمة المجهَّزة لا على تخمين */
export function needsEvidence(intent) {
  const pack = intent?.evidencePack;
  if (!pack || !INTERACTIVE_STATUSES.includes(pack.status)) return false;
  return !!fieldOf(intent) && !!refOf(intent);
}

/** يقرأ الحقل المستهدف من الحالة الحالية — الحقيقة الوحيدة للقيمة الحالية */
export function readTargetValue({ intent, data }) {
  const field = fieldOf(intent);
  const itemRef = refOf(intent);
  if (!field) return { ok: false, error: "NO_TARGET_FIELD" };
  if (!itemRef) return { ok: false, error: "ITEM_REF_MISSING" };
  const found = getByRef(buildCVIndex(data), `${itemRef}.${field}`);
  if (!found || found.type !== "field") return { ok: false, error: "TARGET_STALE" };
  return { ok: true, field, itemRef, value: String(found.field.value ?? ""), itemLabel: found.item.label || "" };
}

/**
 * يبني طلب التأكيد المعروض: الحزمة الجاهزة + القيمة الحالية المقروءة من السيرة.
 * لا تحليل ولا اكتشاف هنا.
 */
export function buildEvidenceRequest({ intent, data }) {
  const pack = intent?.evidencePack;
  if (!pack || !INTERACTIVE_STATUSES.includes(pack?.status)) return { ok: false, error: "NO_EVIDENCE_PACK" };
  const target = readTargetValue({ intent, data });
  if (!target.ok) return { ok: false, error: target.error };

  const section = intent.target.section;
  const clean = (list) => (Array.isArray(list) ? list.map((v) => sanitizeIntentText(v)).filter(Boolean) : []);

  return {
    ok: true,
    request: {
      recommendationId: intent.recommendationId,
      status: pack.status,
      section,
      itemRef: target.itemRef,
      field: target.field,
      sectionLabel: SECTION_META[section]?.labelAr || section,
      itemLabel: target.itemLabel || SECTION_META[section]?.labelAr || section,
      currentValue: target.value,
      title: sanitizeIntentText(intent.title),
      problem: sanitizeIntentText(intent.problem),
      why: sanitizeIntentText(intent.why),
      question: sanitizeIntentText(intent.recommendation),
      reason: sanitizeIntentText(pack.assessment?.reason),
      confidence: pack.assessment?.confidence || "",
      existing: clean(pack.existing),
      relevant: clean(pack.relevant),
      missing: clean(pack.missing),
      confirmationRequired: clean(pack.userConfirmationRequired),
      draft: pack.draft ? sanitizeIntentText(pack.draft) : ""
    }
  };
}

/**
 * إعادة تحقّق قبل التسليم: تغيّرت السيرة بعد المراجعة ⇒ الحزمة قديمة ولا تُرسَل.
 */
export function verifyEvidenceStillValid({ intent, data, request }) {
  const target = readTargetValue({ intent, data });
  if (!target.ok) return { ok: false, error: target.error };
  if (target.field !== request.field || target.itemRef !== request.itemRef) return { ok: false, error: "TARGET_STALE" };
  if (target.value !== request.currentValue) return { ok: false, error: "VALUE_CHANGED" };
  return { ok: true };
}

/** صياغة مبدئية من القيمة الحالية + ما أكّده المستخدم فقط — تُستخدم فقط إن لم يوجد draft */
export function composeDraft({ currentValue, confirmed = [], userText = "" }) {
  const base = String(currentValue || "").trim().replace(/[.،,]\s*$/, "");
  const items = confirmed.map((c) => String(c).trim()).filter(Boolean);
  const extra = String(userText || "").trim();
  const list =
    items.length > 1 ? `${items.slice(0, -1).join(", ")} och ${items[items.length - 1]}` : items[0] || "";
  const parts = [];
  if (base && list) parts.push(`${base} inom ${list}`);
  else if (base) parts.push(base);
  else if (list) parts.push(list);
  if (extra) parts.push(extra);
  return parts.join(". ").replace(/\.\.+/g, ".").trim();
}

/** ما يُسلَّم مع الـIntent — كله مؤكَّد من المستخدم صراحةً */
export function buildConfirmedEvidence({ request, confirmed = [], userText = "", finalText }) {
  const value = String(finalText || "").trim();
  if (!value) return { ok: false, error: "EMPTY_VALUE" };
  return {
    ok: true,
    evidence: {
      confirmedByUser: true,
      section: request.section,
      itemRef: request.itemRef,
      field: request.field,
      currentValue: request.currentValue,
      confirmedFacts: confirmed.map((c) => sanitizeIntentText(c)).filter(Boolean),
      userNote: sanitizeIntentText(userText),
      confirmedValue: sanitizeIntentText(value)
    }
  };
}

export const EVIDENCE_ERROR_MESSAGES = {
  TARGET_STALE: "تغيّرت السيرة بعد إنشاء هذه التوصية، فلم تُرسَل. أعد المراجعة لتُبنى على الحالة الحالية.",
  VALUE_CHANGED: "تغيّر نصّ هذا العنصر بعد المراجعة، فلم تُرسَل التوصية. أعد المراجعة أولاً.",
  ITEM_REF_MISSING: "التوصية لا تشير إلى عنصر محدّد في السيرة، فلا يمكن تأكيد معلوماتها.",
  NO_TARGET_FIELD: "التوصية لا تحدّد حقلاً قابلاً للتعديل في هذا القسم.",
  NO_EVIDENCE_PACK: "لم تُجهَّز أدلّة لهذه التوصية في المراجعة.",
  EMPTY_VALUE: "النصّ فارغ — اكتب الصياغة النهائية قبل التأكيد."
};

export function describeEvidenceError(error) {
  return EVIDENCE_ERROR_MESSAGES[error] || "تعذّر تجهيز تأكيد المعلومات لهذه التوصية.";
}