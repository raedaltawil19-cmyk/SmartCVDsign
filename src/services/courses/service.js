import { base44 } from "@/api/base44Client";

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
export function createCoursesService({ notifications }) {
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
          if (notifications) {
            await notifications.create({
              type: "course_found",
              title: "وجدنا لك دورة جديدة",
              message: `${created.title} مناسبة لملفك المهني.`,
              targetType: "recommended_courses",
              targetId: created.id,
              metadata: { courseKey: key },
            });
          }
        }
      }

      return results;
    },

    markSeen(id) {
      return base44.entities.RecommendedCourse.update(id, { isNew: false });
    },
  };
}
