import { base44 } from "@/api/base44Client";
import { repositioningFingerprint } from "@/lib/repositioning/contract";

function normalizeUrl(url = "") {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return String(url).trim().toLowerCase().replace(/\/$/, "");
  }
}

function courseKey(course) {
  return normalizeUrl(course.url) || `${String(course.provider || "").trim().toLowerCase()}::${String(course.title || "").trim().toLowerCase()}`;
}

/**
 * RecommendedCoursesService — persistent course discovery storage.
 * It intentionally does not run inside Job Tailor; discovery can be triggered
 * independently and new records can create Notifications afterwards.
 */
export function createCoursesService({ notifications, llm, jobs }) {
  return {
    name: "courses",

    list(limit = 100) {
      return base44.entities.RecommendedCourse.list("-created_date", limit);
    },

    async upsertMany(courses = []) {
      const existing = await base44.entities.RecommendedCourse.list("-updated_date", 500);
      const byKey = new Map((existing || []).map((item) => [item.courseKey, item]));
      const results = [];

      for (const raw of courses) {
        if (!raw?.title || !raw?.url) continue;
        const key = courseKey(raw);
        const payload = {
          courseKey: key,
          title: raw.title,
          provider: raw.provider || "",
          url: raw.url,
          type: raw.type || "",
          location: raw.location || "",
          distanceKm: typeof raw.distanceKm === "number" ? raw.distanceKm : undefined,
          durationText: raw.durationText || "",
          durationWeeks: typeof raw.weeks === "number" ? raw.weeks : raw.durationWeeks,
          startDate: raw.startDate || "",
          price: typeof raw.price === "number" ? raw.price : undefined,
          currency: raw.currency || "SEK",
          language: raw.language || "",
          reason: raw.reason || "",
          targetOccupation: raw.targetOccupation || "",
          targetSkills: Array.isArray(raw.targetSkills) ? raw.targetSkills : [],
          source: raw.source || "course_discovery",
          lastVerifiedAt: new Date().toISOString(),
        };

        const previous = byKey.get(key);
        if (previous) {
          const updated = await base44.entities.RecommendedCourse.update(previous.id, payload);
          results.push({ record: updated, isNew: false });
        } else {
          const created = await base44.entities.RecommendedCourse.create({ ...payload, isNew: true });
          byKey.set(key, created);
          results.push({ record: created, isNew: true });
        }
      }

      return results;
    },

    async notifyNewCourses(newRecords = []) {
      if (!notifications || !newRecords.length) return null;
      const count = newRecords.length;
      return notifications.create({
        type: "course_found",
        title: `وجدنا ${count} ${count === 1 ? "دورة إضافية" : "دورات إضافية"} مناسبة لمسارك المهني`,
        message: `اكتشفنا ${count} ${count === 1 ? "دورة إضافية" : "دورات إضافية"} لتطوير مسارك المهني.`,
        targetType: "recommended_courses",
        targetId: newRecords[0]?.record?.id || "",
        metadata: { count, courseIds: newRecords.map((x) => x.record?.id).filter(Boolean) },
      });
    },

    async discoverForCV({ cv, jobTitle, trigger = "auto" } = {}) {
      if (!llm || !jobs || !cv) return { newCourses: [], searched: false };

      const versions = await base44.entities.SavedCV.list("-updated_date", 1000);
      const versionCount = Array.isArray(versions) ? versions.length : 0;
      const explicit = trigger === "manual";
      if (!explicit && versionCount < 20) return { newCourses: [], searched: false, skipped: true, reason: "threshold_not_reached" };

      const cvId = cv.id || cv.cvId || "current";
      const fingerprint = repositioningFingerprint({ approvedCvId: cvId, versions });
      if (!explicit) {
        const autoRuns = await base44.entities.CourseDiscoveryRun.filter({ trigger: "auto_20_versions" }, "-created_date", 10);
        if (Array.isArray(autoRuns) && autoRuns.length) return { newCourses: [], searched: false, skipped: true, reason: "automatic_threshold_already_processed" };
      }
      const existingRuns = await base44.entities.CourseDiscoveryRun.filter({ cvFingerprint: fingerprint }, "-created_date", 10);
      if (existingRuns.some((r) => r.status === "running" || r.status === "ready")) return { newCourses: [], searched: false, skipped: true, reason: "already_analyzed" };
      const run = await base44.entities.CourseDiscoveryRun.create({ cvId, cvFingerprint: fingerprint, versionCount, trigger: explicit ? "manual" : "auto_20_versions", status: "running" });
      const title = jobTitle || cv.titel || "";
      if (!title.trim()) return { newCourses: [], searched: false };
      const search = await jobs.search({ q: title, publishedDays: 21, limit: 18 });
      const list = search?.data?.jobs || [];
      let ranked = list;
      if (list.length) {
        const inputs = list.map((j) => ({ id: j.id, rubrik: j.rubrik, arbetsgivare: j.arbetsgivare, plats: [j.kommun, j.lan].filter(Boolean).join(", "), beskrivning: (j.beskrivning || "").slice(0, 500), krav: j.erfarenhetKrav }));
        const rankRes = await jobs.rank(cv, inputs);
        const byId = Object.fromEntries((rankRes.results || []).map((r) => [r.id, r]));
        ranked = list.map((j) => ({ ...j, matchPercent: byId[j.id]?.matchPercent ?? 0 })).sort((a, b) => (b.matchPercent || 0) - (a.matchPercent || 0));
      }
      const existing = await base44.entities.RecommendedCourse.list("-updated_date", 500);
      const existingKeys = new Set((existing || []).map((x) => x.courseKey));
      const skillText = `${(cv.fardigheter || []).map((s) => s?.namn || "").join(" ")} ${(ranked.slice(0, 6).map((j) => `${j.rubrik || ""} ${j.beskrivning || ""}`).join(" "))}`.toLowerCase();
      const weak = [...new Set(skillText.split(/[^a-zåäö0-9]+/i).filter((x) => x.length > 3))].filter((x) => !((cv.fardigheter || []).some((s) => String(s?.namn || "").toLowerCase().includes(x)))).slice(0, 8);
      const ads = ranked.slice(0, 8).map((j) => ({ rubrik: j.rubrik, arbetsgivare: j.arbetsgivare, plats: [j.kommun, j.lan].filter(Boolean).join(", "), matchPercent: j.matchPercent }));
      const courses = await llm.recommendSwedishCourses({ cv, jobTitle: title, weakSkills: weak, currentMatch: ranked.length ? Math.round(ranked.reduce((s, j) => s + (j.matchPercent || 0), 0) / ranked.length) : null, jobAds: ads });
      const candidates = (Array.isArray(courses) ? courses : []).filter((c) => c?.title && c?.url && !existingKeys.has(courseKey(c)));
      if (!candidates.length) {
        await base44.entities.CourseDiscoveryRun.update(run.id, { status: "no_results" });
        return { newCourses: [], searched: true };
      }
      const saved = await this.upsertMany(candidates);
      const fresh = saved.filter((x) => x.isNew);
      if (fresh.length) await this.notifyNewCourses(fresh);
      await base44.entities.CourseDiscoveryRun.update(run.id, { status: "ready" });
      return { newCourses: fresh, searched: true };
    },

    markSeen(id) {
      return base44.entities.RecommendedCourse.update(id, { isNew: false });
    },
  };
}
