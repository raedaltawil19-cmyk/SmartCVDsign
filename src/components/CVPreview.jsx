import StockholmTemplate from "@/components/templates/StockholmTemplate";
import ExecutiveTemplate from "@/components/templates/ExecutiveTemplate";
import TechProTemplate from "@/components/templates/TechProTemplate";
import CreativeEdgeTemplate from "@/components/templates/CreativeEdgeTemplate";
import NordicMinimalTemplate from "@/components/templates/NordicMinimalTemplate";

export default function CVPreview({ templateId, data, editable, actions, layout }) {
  const props = { data, editable, actions, layout };
  if (templateId === "executive") return <ExecutiveTemplate {...props} />;
  if (templateId === "techpro") return <TechProTemplate {...props} />;
  if (templateId === "creative") return <CreativeEdgeTemplate {...props} />;
  if (templateId === "nordic") return <NordicMinimalTemplate {...props} />;
  return <StockholmTemplate {...props} />;
}