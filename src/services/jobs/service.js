import { base44 } from "@/api/base44Client";
import { JOBS_INTERFACE, assertImplements } from "@/services/interfaces";
import { cacheKey, getCached, setCached } from "@/lib/cache";
import { cvKeywords, localMatchScore } from "@/lib/jobMatcher";

const SEARCH_TTL = 10 * 60 * 1000; // 10 min
const RANK_TTL = 30 * 60 * 1000; // 30 min
const LLM_TOP_N = 8; // only the best N go to the LLM

function distanceKm(a, b) {
  if (![a?.latitude, a?.longitude, b?.latitude, b?.longitude].every(Number.isFinite)) return null;
  const rad = (v) => (v * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function textTokens(text) {
  return new Set(String(text || "").toLowerCase().split(/[^a-zåäö0-9]+/i).filter((x) => x.length > 3));
}

function similarJobScore(source, candidate) {
  const sourceTitle = textTokens(source?.rubrik || source?.jobTitle);
  const candidateTitle = textTokens(candidate?.rubrik || candidate?.jobTitle);
  const sourceBody = textTokens(`${source?.rubrik || ""} ${source?.beskrivning || ""}`);
  const candidateBody = textTokens(`${candidate?.rubrik || ""} ${candidate?.beskrivning || ""}`);
  const titleUnion = new Set([...sourceTitle, ...candidateTitle]);
  const titleOverlap = titleUnion.size ? [...sourceTitle].filter((x) => candidateTitle.has(x)).length / sourceTitle.size : 0;
  const bodyUnion = new Set([...sourceBody, ...candidateBody]);
  const bodyOverlap = bodyUnion.size ? [...sourceBody].filter((x) => candidateBody.has(x)).length / sourceBody.size : 0;
  const sameOccupation = source?.yrkesomrade && candidate?.yrkesomrade && source.yrkesomrade === candidate.yrkesomrade ? 1 : 0;
  return Math.round(Math.min(100, (titleOverlap * 65) + (bodyOverlap * 25) + (sameOccupation * 10)));
}

/**
 * JobsService — Swedish labor-market access.
 * `search` delegates to the SearchJobs backend function (Arbetsförmedlingen JobTech),
 *   cached for a short window so repeated identical queries cost no credits.
 * `rank` pre-scores ads locally (keyword matching), sends only the top N to the LLM
 *   and fills the rest with the local score — cutting LLM calls dramatically.
 * Depends on LLM via constructor injection.
 */
export function createJobsService({ llm }) {
  const service = {
    name: "jobs",

    search({ q, remote, publishedDays, limit, regions, municipalities } = {}) {
      const key = cacheKey("search", q, remote, publishedDays, limit, JSON.stringify(regions || []), JSON.stringify(municipalities || []));
      const cached = getCached(key);
      if (cached) return Promise.resolve(cached);
      return base44.functions
        .invoke("SearchJobs", { q, remote, publishedDays, limit, regions, municipalities })
        .then((res) => {
          setCached(key, res, SEARCH_TTL);
          return res;
        });
    },

    async findSimilar(job, { publishedDays = 30, limit = 8, municipality } = {}) {
      const title = String(job?.rubrik || job?.jobTitle || "").trim();
      if (!title) return { jobs: [] };
      const res = await service.search({ q: title, publishedDays, limit: Math.min(limit + 3, 20), municipalities: municipality ? [municipality] : undefined });
      const sourceId = String(job?.id || "");
      const jobs = (res?.data?.jobs || res?.jobs || [])
        .filter((item) => String(item.id) !== sourceId)
        .map((item) => ({
          ...item,
          distanceKm: distanceKm(job, item),
          similarityPercent: similarJobScore(job, item),
        }))
        .sort((a, b) => {
          const scoreA = a.similarityPercent + (a.distanceKm == null ? 0 : Math.max(0, 20 - Math.min(a.distanceKm, 20)));
          const scoreB = b.similarityPercent + (b.distanceKm == null ? 0 : Math.max(0, 20 - Math.min(b.distanceKm, 20)));
          return scoreB - scoreA;
        })
        .slice(0, limit);
      return { jobs, sourceJob: job };
    },

    async salaryIntelligence({ job, cv } = {}) {
      const jobTitle = String(job?.rubrik || job?.jobTitle || "").trim();
      if (!jobTitle) return null;
      const experience = Array.isArray(cv?.erfarenhet) ? cv.erfarenhet : [];
      const res = await base44.functions.invoke("SalaryIntelligence", { jobTitle, experience });
      return res?.data || res || null;
    },

    async rank(cvData, adsForLLM) {
      // 1. Local pre-scoring (no credits)
      const scored = (adsForLLM || []).map((ad) => ({
        ad,
        local: localMatchScore(cvData, ad),
      }));
      scored.sort((a, b) => b.local - a.local);
      const top = scored.slice(0, LLM_TOP_N);

      // 2. Send only the top N to the LLM (cached by cv+ad ids)
      const cvHash = JSON.stringify(cvKeywords(cvData));
      const rankKey = cacheKey(
        "rank",
        cvHash,
        top.map((t) => t.ad.id).sort().join(",")
      );
      let llmResult = getCached(rankKey);
      if (!llmResult) {
        const prompt = `Här är kandidatens CV som JSON:\n${JSON.stringify(
          cvData
        )}\n\nHär är en lista med svenska jobbannonser:\n${JSON.stringify(
          top.map((t) => t.ad)
        )}\n\nBedöm hur väl kandidatens erfarenheter, färdigheter och profil matchar varje annons. Returnera en JSON-array där varje element har: id (motsvarande annonsens id), matchPercent (0-100), reason (en kort mening på svenska om varför det passar eller vad som saknas). Bevara ordningen för alla id. Returnera endast JSON.`;
        try {
          llmResult = await llm.completeJson({
            prompt,
            schema: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      matchPercent: { type: "number" },
                      reason: { type: "string" },
                    },
                  },
                },
              },
            },
          });
          setCached(rankKey, llmResult, RANK_TTL);
        } catch {
          // Ranking must never make a successful JobTech search disappear.
          // If the LLM is unavailable, the local matcher remains the source of truth.
          llmResult = { results: [] };
        }
      }

      // 3. Merge: LLM score for the top N, local score for the rest
      const byId = {};
      (llmResult?.results || []).forEach((r) => {
        byId[r.id] = r;
      });
      const results = scored.map(({ ad, local }) => {
        if (byId[ad.id]) {
          return byId[ad.id];
        }
        return {
          id: ad.id,
          matchPercent: local,
          reason: "",
        };
      });
      return { results };
    },
  };

  assertImplements(service, JOBS_INTERFACE);
  return service;
}