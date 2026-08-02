import { base44 } from "@/api/base44Client";
import { JOBS_INTERFACE, assertImplements } from "@/services/interfaces";

/**
 * JobsService — Swedish labor-market access.
 * `search` delegates to the SearchJobs backend function (Arbetsförmedlingen JobTech).
 * `rank` asks the LLM to score ads against a CV. Depends on LLM via constructor injection.
 */
export function createJobsService({ llm }) {
  const service = {
    name: "jobs",

    search({ q, remote, publishedDays, limit } = {}) {
      return base44.functions.invoke("SearchJobs", {
        q,
        remote,
        publishedDays,
        limit,
      });
    },

    rank(cvData, adsForLLM) {
      const prompt = `Här är kandidatens CV som JSON:\n${JSON.stringify(cvData)}\n\nHär är en lista med svenska jobbannonser:\n${JSON.stringify(adsForLLM)}\n\nBedöm hur väl kandidatens erfarenheter, färdigheter och profil matchar varje annons. Returnera en JSON-array där varje element har: id (motsvarande annonsens id), matchPercent (0-100), reason (en kort mening på svenska om varför det passar eller vad som saknas). Bevara ordningen för alla id. Returnera endast JSON.`;
      return llm.completeJson({
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
    },
  };

  assertImplements(service, JOBS_INTERFACE);
  return service;
}