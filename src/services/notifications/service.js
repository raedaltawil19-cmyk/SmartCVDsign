import { base44 } from "@/api/base44Client";

/**
 * NotificationsRepository — UI-neutral access to the notification center.
 * Notifications are deliberately separate from Inbox messages.
 */
export function createNotificationsService() {
  return {
    name: "notifications",

    list(limit = 50) {
      return base44.entities.Notification.list("-created_date", limit);
    },

    unreadCount() {
      return base44.entities.Notification.filter({ isRead: false }).then((rows) => rows.length);
    },

    create(payload) {
      return base44.entities.Notification.create({
        type: payload.type,
        title: payload.title,
        message: payload.message,
        isRead: false,
        targetType: payload.targetType || "",
        targetId: payload.targetId || "",
        metadata: payload.metadata || {},
      });
    },

    markRead(id) {
      return base44.entities.Notification.update(id, { isRead: true });
    },

    markAllRead() {
      return base44.entities.Notification.filter({ isRead: false }).then((rows) =>
        Promise.all(rows.map((row) => base44.entities.Notification.update(row.id, { isRead: true })))
      );
    },
  };
}
