import StockholmTemplate from "@/components/templates/StockholmTemplate";
import ExecutiveTemplate from "@/components/templates/ExecutiveTemplate";
import TechProTemplate from "@/components/templates/TechProTemplate";

export default function CVPreview({ templateId, data, editable, actions }) {
  const props = { data, editable, actions };
  if (templateId === "executive") return <ExecutiveTemplate {...props} />;
  if (templateId === "techpro") return <TechProTemplate {...props} />;
  return <StockholmTemplate {...props} />;
}