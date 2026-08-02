import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, CV_PROCESS_PROMPT, mergeCV } from "@/lib/cvModel";
import { LLM_INTERFACE, assertImplements } from "@/services/interfaces";

/**
 * LLMService — single point of access to the language model.
 * Owns every CV/LLM prompt so prompts live next to the surface that uses them,
 * and consumers stay declarative. Behind the interface you can swap to a
 * different model/provider without touching any page.
 */
export function createLLMService() {
  const service = {
    name: "llm",

    /** Generic structured completion — used by tools that keep their own prompt. */
    completeJson({ prompt, schema, fileUrls, model, addContext }) {
      return base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema ?? null,
        file_urls: fileUrls || undefined,
        model: model || undefined,
        add_context_from_internet: !!addContext,
      });
    },

    /** Read raw input / uploaded file and build a normalized Swedish CV. */
    async processCV({ text, fileUrl }) {
      const prompt =
        CV_PROCESS_PROMPT +
        "\n\nAnvändarens inmatning (kan vara på valfritt språk, arrangera och översätt till svenska):\n" +
        (text || "(se filen)");
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrl ? [fileUrl] : undefined,
        response_json_schema: CV_SCHEMA,
      });
      return mergeCV(res);
    },

    /** Apply a natural-language instruction to an existing CV, preserving all info. */
    async transformCV(data, instruction) {
      const prompt = `Du är en CV-redigerare. Här är det aktuella CV:t som JSON:\n${JSON.stringify(data)}\n\nInstruktion: ${instruction}\n\nTillämpa instruktionen. Bevara all annan information oförändrad om instruktionen inte uttryckligen säger annat. SAMMANFATTA INTE och FÖRKORTA INTE — behåll allt innehåll. Returnera hela det uppdaterade CV:t som giltig JSON enligt schemat.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: CV_SCHEMA,
      });
      return mergeCV(res);
    },

    /** Refine existing CV text in place (no summarizing). */
    async regenerateCV(data) {
      const prompt =
        "Förbättra och förfina följande befintliga CV-innehåll på svenska. Gör det mer naturligt och konkret, ta bort eventuella klyschor — men SAMMANFATTA INTE och FÖRKORTA INTE: bevara ALL information, alla ansvarsområden och resultat i sin helhet.\n\n" +
        JSON.stringify(data);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: CV_SCHEMA,
      });
      return mergeCV(res);
    },
  };

  assertImplements(service, LLM_INTERFACE);
  return service;
}