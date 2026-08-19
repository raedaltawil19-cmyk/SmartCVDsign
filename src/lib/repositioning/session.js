import { base44 } from "@/api/base44Client";

const AGENT = "career_repositioning_agent";
const MARK = "<<<REPOSITIONING_INPUT";

/** إنشاء محادثة خلفية للوكيل — تفشل بهدوء */
export async function createRepositioningConversation() {
  try {
    return await base44.agents.createConversation({
      agent_name: AGENT,
      metadata: { name: "Career Repositioning", description: "Background career repositioning analysis" }
    });
  } catch {
    return null;
  }
}

/** إرسال كتلة الإدخال (نسخ السيرة المعتمدة + الموقع) */
export async function sendRepositioningInput(conversation, { approvedCvId, versions, startLocation, uiLanguage }) {
  const payload = {
    approvedCvId,
    startLocation: startLocation || "",
    uiLanguage: uiLanguage || "ar",
    cvVersions: (versions || []).map((v) => ({
      cvId: v.id,
      titel: v.titel || "",
      templateId: v.templateId || "",
      updatedAt: v.updated_date || "",
      data: v.data || {}
    }))
  };
  const content = `ابدأ تحليل إعادة التموضع المهني لهذا المستخدم بناءً على نسخ سيرته المعتمدة.\n\n${MARK}\n${JSON.stringify(payload)}\nREPOSITIONING_INPUT>>>`;
  try {
    await base44.agents.addMessage(conversation, { role: "user", content });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/** استخلاص الموقع من بيانات السيرة (عنوان جهة الاتصال) */
export function locationFromCV(data) {
  return String(data?.kontakt?.adress || "").trim();
}