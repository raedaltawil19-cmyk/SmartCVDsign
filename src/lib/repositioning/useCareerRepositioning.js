/**
 * useCareerRepositioning — تشغيل خلفي لوكيل إعادة التموضع المهني بعد اعتماد نسخة سيرة.
 *
 * قواعد معمارية:
 * - لا يُشغَّل عند رفع CV ولا عند كل تعديل — فقط عند إشارة اعتماد صريحة (حفظ/طباعة/إنهاء جلسة بنسخة محفوظة).
 * - لا يعدّل السيرة ولا يحفظها ولا يفتح أي واجهة؛ لا يعرض أخطاءً للمستخدم.
 * - فشل آمن تماماً: أي خطأ يُسجَّل في السجل ولا يعطّل Builder أو Job Tailor أو أي مسار آخر.
 */
import { useCallback, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { createRepositioningConversation, sendRepositioningInput, locationFromCV } from "@/lib/repositioning/session";
import { parseRepositioningResult, repositioningFingerprint, isUsefulResult } from "@/lib/repositioning/contract";

const POLLS = [4000, 10000, 20000, 32000, 45000, 60000, 78000, 95000, 115000, 135000];

export default function useCareerRepositioning({ cvId, data, isAuthenticated, uiLanguage }) {
  const runningRef = useRef(false);
  const doneFingerprintsRef = useRef(new Set());
  const timersRef = useRef([]);
  const unsubRef = useRef(null);
  const stateRef = useRef({ cvId, data, isAuthenticated, uiLanguage });
  stateRef.current = { cvId, data, isAuthenticated, uiLanguage };

  const cleanup = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  /** إشارة الاعتماد — trigger: save | print | session_end */
  const approve = useCallback(async (trigger, overrideCvId) => {
    const s = { ...stateRef.current, cvId: overrideCvId || stateRef.current.cvId };
    if (!s.isAuthenticated || !s.cvId || runningRef.current) return;
    runningRef.current = true;
    let record = null;
    try {
      const versions = await base44.entities.SavedCV.list("-updated_date", 20);
      const fingerprint = repositioningFingerprint({ approvedCvId: s.cvId, versions });
      if (doneFingerprintsRef.current.has(fingerprint)) { runningRef.current = false; return; }

      const existing = await base44.entities.RepositioningAnalysis.filter({ cvFingerprint: fingerprint });
      if (existing.some((r) => r.status === "ready" || r.status === "running")) {
        doneFingerprintsRef.current.add(fingerprint);
        runningRef.current = false;
        return;
      }

      const startLocation = locationFromCV(s.data);
      record = await base44.entities.RepositioningAnalysis.create({
        cvId: s.cvId,
        cvFingerprint: fingerprint,
        status: "running",
        trigger: trigger || "save",
        startLocation
      });
      doneFingerprintsRef.current.add(fingerprint);

      const conversation = await createRepositioningConversation();
      if (!conversation) throw new Error("AGENT_START_FAILED");

      let settled = false;
      const finish = async (result) => {
        if (settled) return;
        settled = true;
        cleanup();
        runningRef.current = false;
        const useful = isUsefulResult(result);
        await base44.entities.RepositioningAnalysis.update(record.id, {
          status: result.analysisStatus === "ready" && useful ? "ready" : "no_results",
          result,
          pathCount: result.paths.length,
          jobCount: result.opportunities.length
        });
        if (!useful) return;
        await base44.entities.Notification.create({
          type: "career_repositioning",
          title: "اكتشفنا مسارات وفرصاً مهنية جديدة",
          message: `بناءً على سيرتك المعتمدة، وجدنا ${result.paths.length} مساراً مهنياً و${result.opportunities.length} فرصة حقيقية.`,
          isRead: false,
          targetType: "career_paths",
          targetId: record.id,
          metadata: { cvId: s.cvId }
        });
      };

      const handle = (messages) => {
        if (settled) return;
        for (const m of Array.isArray(messages) ? messages : []) {
          if (m?.role !== "assistant") continue;
          const res = parseRepositioningResult(m.content);
          if (res.ready) { finish(res.result).catch(() => {}); return; }
        }
      };

      unsubRef.current = base44.agents.subscribeToConversation(conversation.id, (p) => handle(p?.messages));
      const sent = await sendRepositioningInput(conversation, {
        approvedCvId: s.cvId,
        versions,
        startLocation,
        uiLanguage: s.uiLanguage
      });
      if (!sent.ok) throw new Error("AGENT_SEND_FAILED");

      const poll = async () => {
        if (settled) return;
        try {
          const conv = await base44.agents.getConversation(conversation.id);
          handle(conv?.messages);
        } catch { /* الاشتراك يبقى المصدر */ }
      };
      timersRef.current = POLLS.map((ms) => setTimeout(poll, ms));
      // مهلة نهائية: لا نترك السجل معلّقاً على "running" للأبد
      timersRef.current.push(setTimeout(async () => {
        if (settled) return;
        settled = true;
        cleanup();
        runningRef.current = false;
        try { await base44.entities.RepositioningAnalysis.update(record.id, { status: "failed", error: "TIMEOUT" }); } catch {}
      }, 180000));
    } catch (e) {
      cleanup();
      runningRef.current = false;
      if (record) {
        try { await base44.entities.RepositioningAnalysis.update(record.id, { status: "failed", error: String(e?.message || e) }); } catch {}
      }
    }
  }, [cleanup]);

  return { approve };
}