import html2canvas from "html2canvas";

export async function exportCVPNG(filename = "cv.png") {
  const el = document.querySelector(".cv-print-area");
  if (!el) return;
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}