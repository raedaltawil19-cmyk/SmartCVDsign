/**
 * reviewEvidence — طبقة الأدلّة/التأكيد (Recommendation Evidence Layer).
 *
 * قواعد معمارية (بالتصميم لا بالتعليق):
 * - منطق نقيّ: لا React، لا base44، لا SavedCV، لا cvRepository، لا شبكة، لا بحث خارجي.
 * - لا تكتب شيئاً ولا تنفّذ شيئاً: مخرجها وصف لما يجب سؤال المستخدم عنه، ثم نصّ مؤكَّد.
 *   نقطة التنفيذ الوحيدة تبقى executeAssistantAction عبر Smart CV Assistant.
 * - fail-closed: أي هدف غير موجود في الحالة الحالية ⇒ لا طلب دليل ولا إرسال.
 * - الاقتراحات مرشَّحة فقط (candidate information) ومصدرها **بيانات السيرة نفسها**.
 *   لا يوجد في المشروع مصدر بحث آمن عن المصطلحات (SearchJobs/FetchJobAd تخصّ إعلانات
 *   الوظائف)، فلا نخترع نتائج بحث ولا ننسب للمستخدم دورة أو مهارة لم يؤكّدها.
 */
import { FIELD_ROLES, SECTION_META, buildCVIndex, getByRef, normalizeText } from "@/lib/agent/cvIndex";
import { sanitizeIntentText } from "@/lib/agent/reviewIntent";

/** أقسام يمكن أن يكون وصفها ناقصاً ويحتاج معلومات من المستخدم */
export const EVIDENCE_SECTIONS = ["profil", "erfarenhet", "utbildning"];
const MAX_CANDIDATES = 8;

const descriptionField = (section) => {
  const roles = FIELD_ROLES[section] || {};
  return Object.keys(roles).find((f) => roles[f] === "description") || null;
};

const refOf = (intent) =>
  intent?.target?.itemRef || (intent?.target?.section === "profil" ? "profile_main" : null);

/** هل تحتاج هذه التوصية تأكيد معلومات قبل الإرسال؟ (قرار بنيوي لا تخميني) */
export function needsEvidence(intent) {
  const section = intent?.target?.section;
  if (intent?.type !== "content") return false;
  if (!EVIDENCE_SECTIONS.includes(section)) return false;
  if (!descriptionField(section)) return false;
  return !!refOf(intent);
}

/** مرشَّحات من محتوى السيرة الحالي فقط، وما ورد في الوصف الحالي يُستثنى */
function buildCandidates(index, section, itemRef, currentValue) {
  const current = normalizeText(currentValue);
  const out = [];
  const push = (label, from) => {
    const clean = String(label || "").trim();
    if (!clean) return;
    const norm = normalizeText(clean);
    if (!norm || (current && current.includes(norm))) return;
    if (out.some((c) => normalizeText(c.label) === norm)) return;
    out.push({ id: `cand-${out.length}-${norm.slice(0, 12)}`, label: clean, from });
  };
  for (const sec of index.sections) {
    if (sec.section === "fardigheter") sec.items.forEach((i) => push(i.label, "المهارات المسجّلة في سيرتك"));
    if (sec.section === "sprak") sec.items.forEach((i) => push(i.label, "اللغات المسجّلة في سيرتك"));
    if (sec.section === section && sec.kind === "list") {
      sec.items.forEach((i) => { if (i.id !== itemRef) push(i.label, "عناصر أخرى في نفس القسم"); });
    }
  }
  return out.slice(0, MAX_CANDIDATES);
}

/**
 * يبني طلب تأكيد لتوصية واحدة، بناءً على الحالة الحالية للسيرة.
 * @returns {{ok:true, request:object}|{ok:false, error:string}}
 */
export function buildEvidenceRequest({ intent, data }) {
  const section = intent?.target?.section;
  const field = descriptionField(section);
  if (!field) return { ok: false, error: "NO_DESCRIPTION_FIELD" };
  const itemRef = refOf(intent);
  if (!itemRef) return { ok: false, error: "ITEM_REF_MISSING" };

  const index = buildCVIndex(data);
  const found = getByRef(index, `${itemRef}.${field}`);
  if (!found || found.type !== "field") return { ok: false, error: "TARGET_STALE" };

  const currentValue = String(found.field.value ?? "");
  return {
    ok: true,
    request: {
      recommendationId: intent.recommendationId,
      section,
      itemRef,
      field,
      title: sanitizeIntentText(intent.title),
      question: sanitizeIntentText(intent.recommendation),
      problem: sanitizeIntentText(intent.problem),
      itemLabel: found.item.label || SECTION_META[section]?.labelAr || section,
      sectionLabel: SECTION_META[section]?.labelAr || section,
      currentValue,
      candidates: buildCandidates(index, section, itemRef, currentValue)
    }
  };
}

/** صياغة مبدئية من القيمة الحالية + ما أكّده المستخدم فقط — لا اختراع وقائع */
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
  TARGET_STALE: "تغيّرت السيرة بعد إنشاء هذه التوصية، فلم يُفتح تأكيد المعلومات. أعد المراجعة.",
  ITEM_REF_MISSING: "التوصية لا تشير إلى عنصر محدّد في السيرة، فلا يمكن تأكيد معلوماتها.",
  NO_DESCRIPTION_FIELD: "هذا القسم لا يحتوي وصفاً يمكن إكماله.",
  EMPTY_VALUE: "النصّ فارغ — اكتب الصياغة النهائية قبل التأكيد."
};

export function describeEvidenceError(error) {
  return EVIDENCE_ERROR_MESSAGES[error] || "تعذّر تجهيز تأكيد المعلومات لهذه التوصية.";
}