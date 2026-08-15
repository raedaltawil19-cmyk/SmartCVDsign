/**
 * changeSummary — صياغة وصف بشري لكل تعديل **من نتيجة أداة التنفيذ الفعلية**،
 * لا من كلام الوكيل. منطق نقيّ: لا React، لا شبكة، لا كتابة، ولا تعديل للمدخلات.
 */
import { buildCVIndex, SECTION_META, FIELD_ROLES } from "@/lib/agent/cvIndex";

const FIELD_LABELS_AR = {
  namn: "الاسم", titel: "المسمى", telefon: "الهاتف", epost: "البريد", adress: "العنوان",
  linkedin: "لينكدإن", profil: "النبذة", roll: "المسمى الوظيفي", foretag: "جهة العمل",
  period: "الفترة", beskrivning: "الوصف", sprak: "اللغة", examen: "الشهادة", skola: "المدرسة",
  niva: "المستوى"
};

const fieldLabel = (section, field) => {
  if (!field) return "";
  if (section === "fardigheter" && field === "namn") return "المهارة";
  return FIELD_LABELS_AR[field] || field;
};

/** اسم العنصر كما يراه المستخدم، بعد التنفيذ (من الفهرس الفعلي للبيانات الجديدة) */
export function itemLabelOf(newData, section, itemRef) {
  if (!itemRef) return "";
  const sec = buildCVIndex(newData).sections.find((s) => s.section === section);
  const item = sec?.items.find((i) => i.id === itemRef);
  const label = item?.label || "";
  return label === "Kontaktuppgifter" || label === "Profil" ? "" : label;
}

/**
 * وصف سطر واحد لتعديل ناجح.
 * @param {object} res نتيجة runCvEditContent الناجحة
 * @param {object} newData البيانات بعد التطبيق
 */
export function describeEdit(res, newData) {
  const section = res?.section;
  const sectionAr = SECTION_META[section]?.labelAr || section || "";
  if (res?.operation === "add_item") {
    const name = itemLabelOf(newData, section, res.newItemRef);
    return `${sectionAr}: إضافة${name ? ` «${name}»` : ""}`;
  }
  if (res?.operation === "remove_item") return `${sectionAr}: حذف عنصر`;
  const item = itemLabelOf(newData, section, res?.newItemRef || res?.itemRef);
  const fl = fieldLabel(section, res?.field);
  const value = typeof res?.newValue === "object" ? "" : String(res?.newValue ?? "");
  const head = item ? `${sectionAr} — ${item}` : sectionAr;
  return `${head}: ${fl}${value ? ` ← ${value}` : ""}`;
}

/** وصف سطر واحد لتعديل لم يُنفَّذ */
export function describeFailedEdit(args, message) {
  const section = args?.section;
  const sectionAr = SECTION_META[section]?.labelAr || section || "تعديل";
  const fl = args && FIELD_ROLES[section] ? fieldLabel(section, args.field) : "";
  return `${sectionAr}${fl ? ` — ${fl}` : ""}: ${message}`;
}

/** نصّ ملخّص كامل للسجل (ActionLogPanel) — يبقى متاحاً بعد إغلاق لوحة المساعد */
export function summaryText(results) {
  const ok = (results || []).filter((r) => r.ok).map((r) => `✓ ${r.label}`);
  const bad = (results || []).filter((r) => !r.ok).map((r) => `✗ ${r.label}`);
  return [...ok, ...bad].join(" | ");
}