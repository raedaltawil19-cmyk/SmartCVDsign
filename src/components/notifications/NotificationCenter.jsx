import { useEffect, useState } from "react";
import { Bell, CheckCheck, BookOpen, Briefcase, CalendarDays, Sparkles, X } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useNavigate } from "react-router-dom";

const iconFor = (type) => {
  if (type === "course_found") return BookOpen;
  if (type === "job_match") return Briefcase;
  if (type === "interview_invitation") return CalendarDays;
  return Sparkles;
};

export default function NotificationCenter() {
  const { notifications } = useServices();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const refresh = async () => {
    try {
      const [list, count] = await Promise.all([notifications.list(50), notifications.unreadCount()]);
      setItems(list || []);
      setUnread(count || 0);
    } catch (_) {}
  };

  useEffect(() => { refresh(); }, []);

  const openNotification = async (item) => {
    if (!item.isRead) {
      await notifications.markRead(item.id);
      setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, isRead: true } : n));
      setUnread((n) => Math.max(0, n - 1));
    }
    if (item.targetType === "recommended_courses") {
      navigate("/courses");
    } else if (item.targetType === "applications") {
      navigate("/applications");
    }
    setOpen(false);
  };

  const markAll = async () => {
    await notifications.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen((v) => !v); if (!open) refresh(); }} className="relative w-9 h-9 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-600" aria-label="Notifications">
        <Bell className="w-4 h-4" />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#D9E830] text-[9px] font-bold text-black grid place-items-center">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="absolute top-11 right-0 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-[#000066]" /><span className="font-semibold text-sm">الإشعارات</span></div>
              <div className="flex items-center gap-2">
                {unread > 0 && <button onClick={markAll} className="text-[11px] text-[#000066] hover:underline inline-flex items-center gap-1"><CheckCheck className="w-3 h-3" />تحديد الكل كمقروء</button>}
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">لا توجد إشعارات حالياً.</div>
              ) : items.map((item) => {
                const Icon = iconFor(item.type);
                return <button key={item.id} onClick={() => openNotification(item)} className={`w-full text-right px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${item.isRead ? "bg-white" : "bg-[#F1F6DF]/60"}`}>
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-[#F1F6DF] grid place-items-center"><Icon className="w-4 h-4 text-[#526B35]" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{item.title}</span>{!item.isRead && <span className="mt-1 w-2 h-2 rounded-full bg-[#A8C957] shrink-0" />}</div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.message}</p>
                      <time className="text-[10px] text-slate-400 mt-1 block">{item.created_date ? new Date(item.created_date).toLocaleString() : ""}</time>
                    </div>
                  </div>
                </button>;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}