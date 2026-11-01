export function pdfFixture(count = 2) {
  const objects = [], fontId = 3 + count * 2;
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = Array.from({ length: count }, (_, i) => (3 + i * 2) + ' 0 R').join(' ');
  objects.push('<< /Type /Pages /Kids [' + kids + '] /Count ' + count + ' >>');
  for (let i = 0; i < count; i++) {
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Resources << /Font << /F1 ' + fontId + ' 0 R >> >> /Contents ' + (4 + i * 2) + ' 0 R >>');
    const content = (i % 2 ? '0.06 0.24 0.24' : '0.12 0.08 0.22') + ' rg 0 0 960 540 re f\n0.8 0.7 1 rg BT /F1 42 Tf 65 350 Td (Uma aula trazida de PDF) Tj ET\n1 1 1 rg BT /F1 24 Tf 65 280 Td (Pagina ' + (i + 1) + ' - explorar e descobrir) Tj ET';
    objects.push('<< /Length ' + Buffer.byteLength(content) + ' >>\nstream\n' + content + '\nendstream');
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let result = '%PDF-1.4\n', offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(result)); result += (i + 1) + ' 0 obj\n' + object + '\nendobj\n'; });
  const xref = Buffer.byteLength(result);
  result += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('');
  result += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(result);
}
export async function pptxFixture() {
  const pptx = await import('@office-kit/pptx');
  const presentation = pptx.createPresentation();
  for (const [i, title] of ['Professor por um dia', 'HDD e SSD'].entries()) {
    const slide = pptx.addBlankSlide(presentation);
    pptx.setSlideBackground(slide, i ? '#133D3A' : '#201737');
    const text = pptx.addSlideTextBox(slide, { x: pptx.inches(.8), y: pptx.inches(1), w: pptx.inches(10), h: pptx.inches(1.3), text: title });
    pptx.setShapeTextFormat(text, { font: 'Arial', size: 40, color: '#E0C5FF', bold: true });
    const body = pptx.addSlideTextBox(slide, { x: pptx.inches(.8), y: pptx.inches(2.7), w: pptx.inches(10), h: pptx.inches(1.7), text: i ? 'Dados guardados. Ideias conectadas.' : 'Uma aula importada do PowerPoint.' });
    pptx.setShapeTextFormat(body, { font: 'Arial', size: 26, color: '#FFFFFF' });
  }
  return Buffer.from(await pptx.savePresentation(presentation));
}
