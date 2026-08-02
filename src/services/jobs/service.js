import { base44 } from "@/api/base44Client";
import { JOBS_INTERFACE, assertImplements } from "@/services/interfaces";
import { cacheKey, getCached, setCached } from "@/lib/cache";
import { cvKeywords, localMatchScore } from "@/lib/jobMatcher";

const SEARCH_TTL = 10 * 60 * 1000; // 10 min
const RANK_TTL = 30 * 60 * 1000; // 30 min
const LLM_TOP_N = 8; // only the best N go to the LLM

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

    search({ q, remote, publishedDays, limit } = {}) {
      const key = cacheKey("search", q, remote, publishedDays, limit);
      const cached = getCached(key);
      if (cached) return Promise.resolve(cached);
      return base44.functions
        .invoke("SearchJobs", { q, remote, publishedDays, limit })
        .then((res) => {
          setCached(key, res, SEARCH_TTL);
          return res;
        });
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