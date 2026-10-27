export interface PdfSection {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

/** Descarga una tabla como CSV (compatible con Excel, con BOM UTF-8). */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const content = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Genera y descarga un PDF con varias secciones (una tabla por página). */
export async function downloadPdf(
  filename: string,
  title: string,
  subtitle: string,
  sections: PdfSection[],
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.text(subtitle, 14, 25);

  let first = true;
  for (const section of sections) {
    if (!first) doc.addPage();
    first = false;
    doc.setFontSize(12);
    doc.text(section.title, 14, 34);
    autoTable(doc, {
      startY: 38,
      head: [section.headers],
      body: section.rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [231, 84, 128] },
    });
  }

  doc.save(filename);
}
