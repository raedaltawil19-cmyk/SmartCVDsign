/**
 * Career Repositioning trigger/orchestration.
 * Input policy: analyze all saved CV versions up to a maximum window of 20.
 * With 1–20 versions, analyze all available versions. With more than 20,
 * analyze only the latest 20. The 20-version number is NOT a minimum threshold.
 * After an automatic analysis, repeated ordinary saves do not trigger another run;
 * an explicit manual request can start a new analysis when appropriate.
 */
import { useCallback, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { createRepositioningConversation, sendRepositioningInput, locationFromCV } from "@/lib/repositioning/session";
import { parseRepositioningResult, repositioningFingerprint, isUsefulResult } from "@/lib/repositioning/contract";

const AUTO_THRESHOLD = 20;
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

  const run = useCallback(async (trigger = "manual", overrideCvId = null) => {
    const s = { ...stateRef.current, cvId: overrideCvId || stateRef.current.cvId };
    if (!s.isAuthenticated || !s.cvId || runningRef.current) return { ok: false, skipped: true };
    runningRef.current = true;

    let record = null;
    try {
      // The analysis window is capped at 20 versions, not gated by 20 versions.
      // 1–20 versions => analyze all. More than 20 => analyze the latest 20.
      const allVersions = await base44.entities.SavedCV.list("-updated_date", 1000);
      const versionCount = Array.isArray(allVersions) ? allVersions.length : 0;
      const versions = Array.isArray(allVersions) ? allVersions.slice(0, AUTO_THRESHOLD) : [];
      const explicit = trigger === "manual";

      if (!explicit && versionCount >= AUTO_THRESHOLD) {
        const autoRuns = await base44.entities.RepositioningAnalysis.filter({ trigger: "auto_20_versions" }, "-created_date", 10);
        if (Array.isArray(autoRuns) && autoRuns.length) {
          runningRef.current = false;
          return { ok: true, skipped: true, reason: "automatic_analysis_already_processed" };
        }
      }

      const fingerprint = repositioningFingerprint({ approvedCvId: s.cvId, versions });
      const existing = await base44.entities.RepositioningAnalysis.filter({ cvFingerprint: fingerprint }, "-created_date", 20);
      if (existing.some((r) => r.status === "running")) {
        doneFingerprintsRef.current.add(fingerprint);
        runningRef.current = false;
        return { ok: true, skipped: true, reason: "already_running" };
      }
      if (!explicit && existing.some((r) => r.status === "ready" || r.status === "no_results")) {
        doneFingerprintsRef.current.add(fingerprint);
        runningRef.current = false;
        return { ok: true, skipped: true, reason: "already_analyzed" };
      }

      const startLocation = locationFromCV(s.data);
      record = await base44.entities.RepositioningAnalysis.create({
        cvId: s.cvId,
        cvFingerprint: fingerprint,
        status: "running",
        trigger: explicit ? "manual" : "auto_20_versions",
        startLocation,
        pathCount: 0,
        jobCount: 0
      });
      doneFingerprintsRef.current.add(fingerprint);

      const conversation = await createRepositioningConversation();
      if (!conversation) throw new Error("AGENT_START_FAILED");

      let settled = false;
      const finish = async (parsed) => {
        if (settled) return;
        settled = true;
        cleanup();
        runningRef.current = false;
        const useful = isUsefulResult(parsed);
        await base44.entities.RepositioningAnalysis.update(record.id, {
          status: parsed.analysisStatus === "ready" && useful ? "ready" : "no_results",
          result: parsed,
          pathCount: parsed.paths.length,
          jobCount: parsed.opportunities.length
        });
        if (!useful) return;
        await base44.entities.Notification.create({
          type: "career_repositioning",
          title: "اكتشفنا مسارات وفرصاً مهنية جديدة",
          message: `بناءً على سيرتك المعتمدة، وجدنا ${parsed.paths.length} مساراً مهنياً و${parsed.opportunities.length} فرصة حقيقية.`,
          isRead: false,
          targetType: "career_paths",
          targetId: record.id,
          metadata: { cvId: s.cvId, analysisId: record.id }
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
        } catch {}
      };
      timersRef.current = POLLS.map((ms) => setTimeout(poll, ms));
      timersRef.current.push(setTimeout(async () => {
        if (settled) return;
        settled = true;
        cleanup();
        runningRef.current = false;
        try { await base44.entities.RepositioningAnalysis.update(record.id, { status: "failed", error: "TIMEOUT" }); } catch {}
      }, 180000));

      return { ok: true, analysisId: record.id, versionCount };
    } catch (e) {
      cleanup();
      runningRef.current = false;
      if (record) {
        try { await base44.entities.RepositioningAnalysis.update(record.id, { status: "failed", error: String(e?.message || e) }); } catch {}
      }
      return { ok: false, error: String(e?.message || e) };
    }
  }, [cleanup]);

  const approve = useCallback((trigger = "manual", overrideCvId = null) => run(trigger, overrideCvId), [run]);
  const runManual = useCallback(() => run("manual"), [run]);

  return { approve, runManual };
}