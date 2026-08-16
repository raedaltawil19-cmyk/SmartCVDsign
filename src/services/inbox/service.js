import { base44 } from "@/api/base44Client";

/**
 * InboxRepository — email/reply storage only.
 * It is intentionally independent from Notifications.
 * External email ingestion/delivery is not implemented here yet.
 */
export function createInboxService() {
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

    create(payload) {
      return base44.entities.InboxMessage.create({
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
    },
  };
}
