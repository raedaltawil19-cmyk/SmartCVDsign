import { base44 } from "@/api/base44Client";

/**
 * InboxRepository — email/reply storage only.
 * It is intentionally independent from Notifications.
 * External email ingestion/delivery is not implemented here yet.
 */
const INTERVIEW_TERMS = ["interview", "intervju", "intervjuinbjudan", "interview invitation", "inbjudan till intervju", "دعوة مقابلة", "دعوة إلى مقابلة", "مقابلة"];
const looksLikeInterview = (subject = "", body = "") => {
  const text = `${subject} ${body}`.toLowerCase();
  return INTERVIEW_TERMS.some((term) => text.includes(term));
};

export function createInboxService({ llm, notifications } = {}) {
  return {
    name: "inbox",

    list(limit = 100) {
      return base44.entities.InboxMessage.list("-created_date", limit);
    },

    thread(threadId) {
      return base44.entities.InboxMessage.filter({ threadId }, "created_date", 200);
    },

    unreadCount() {
      return base44.entities.InboxMessage.filter({ isRead: false }).then((rows) => rows.length);
    },

    markRead(id) {
      return base44.entities.InboxMessage.update(id, { isRead: true });
    },

    async create(payload) {
      const created = await base44.entities.InboxMessage.create({
        threadId: payload.threadId || "",
        direction: payload.direction || "inbound",
        senderName: payload.senderName || "",
        senderEmail: payload.senderEmail || "",
        recipientEmail: payload.recipientEmail || "",
        subject: payload.subject || "",
        body: payload.body || "",
        isRead: payload.isRead ?? false,
        repliedToMessageId: payload.repliedToMessageId || "",
        receivedAt: payload.receivedAt || new Date().toISOString(),
      });
      if (created?.direction === "inbound" && llm && looksLikeInterview(created.subject, created.body)) {
        try {
          const existing = await base44.entities.InterviewPreparation.filter({ sourceMessageId: created.id });
          if (!existing?.length) {
            const cvs = await base44.entities.SavedCV.list("-updated_date", 20);
            const cv = cvs?.[0];
            if (cv?.data) {
              const preparation = await llm.generateInterviewPrep({ cv: cv.data, jobAd: `${created.subject || ""}\n${created.body || ""}`, difficulty: "medium", language: "sv" });
              const prep = await base44.entities.InterviewPreparation.create({ sourceMessageId: created.id, jobApplicationId: payload.jobApplicationId || "", cvId: cv.id || "", subject: created.subject || "", jobTitle: cv.data?.titel || "", preparation: preparation || {}, createdAt: new Date().toISOString() });
              if (notifications) await notifications.create({ type: "interview_invitation", title: "مقابلة جديدة — تم تجهيز التحضير", message: "وصلت رسالة تبدو كدعوة مقابلة. جهّزنا لك أسئلة وتحضيرًا مرتبطًا بها.", targetType: "interview_preparation", targetId: prep.id, metadata: { sourceMessageId: created.id, cvId: cv.id || "" } });
            }
          }
        } catch (_) { /* لا نفشل حفظ البريد إذا فشل التحضير */ }
      }
      return created;
    },
  };
}
