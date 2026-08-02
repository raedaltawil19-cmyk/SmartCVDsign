import CVPreview from "./CVPreview";

export default function CVPages({ templateId, data, editable, actions, layout }) {
  return (
    <div className="cv-print-area bg-white shadow-2xl" style={{ width: 794 }}>
      <CVPreview templateId={templateId} data={data} editable={editable} actions={actions} layout={layout} />
    </div>
  );
}