import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, mergeCV } from "./cvModel";

export async function runCVTransform(data, instruction) {
  const prompt = `Du är en CV-redigerare. Här är det aktuella CV:t som JSON:\n${JSON.stringify(data)}\n\nInstruktion: ${instruction}\n\nTillämpa instruktionen. Bevara all annan information oförändrad om instruktionen inte uttryckligen säger annat. SAMMANFATTA INTE och FÖRKORTA INTE — behåll allt innehåll. Returnera hela det uppdaterade CV:t som giltig JSON enligt schemat.`;
  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: CV_SCHEMA
  });
  return mergeCV(res);
}