const PDFDocument = require('pdfkit');

function streamReportsPdf(res, rows, { title = 'SmartInfra Report Export', generatedAt = new Date() } = {}) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="smartinfra-reports.pdf"');
  doc.pipe(res);

  doc.fontSize(18).text(title, { align: 'left' });
  doc.fontSize(9).fillColor('#666').text(`Generated ${generatedAt.toLocaleString()} · ${rows.length} report(s)`);
  doc.moveDown(1);
  doc.fillColor('#000');

  const columns = [
    { label: 'ID', width: 40, value: (r) => `#${r.report_id}` },
    { label: 'Category', width: 110, value: (r) => r.category },
    { label: 'Citizen', width: 110, value: (r) => r.citizen_name || '' },
    { label: 'Status', width: 80, value: (r) => r.status },
    { label: 'Location', width: 150, value: (r) => r.location_text || '' },
    { label: 'Submitted', width: 90, value: (r) => new Date(r.date_submitted).toLocaleDateString() },
    { label: 'Assigned to', width: 110, value: (r) => r.assigned_staff_name || 'Unassigned' },
  ];

  const startX = doc.x;
  let y = doc.y;

  function drawRow(cells, isHeader = false) {
    let x = startX;
    doc.fontSize(9).fillColor(isHeader ? '#000' : '#222');
    if (isHeader) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
    cells.forEach((cell, i) => {
      doc.text(String(cell), x, y, { width: columns[i].width, ellipsis: true });
      x += columns[i].width;
    });
    y += 18;
    if (y > doc.page.height - 60) {
      doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
      y = doc.y;
    }
  }

  drawRow(columns.map((c) => c.label), true);
  doc.moveTo(startX, y - 4).lineTo(startX + columns.reduce((s, c) => s + c.width, 0), y - 4).strokeColor('#ccc').stroke();

  rows.forEach((row) => {
    drawRow(columns.map((c) => c.value(row)));
  });

  doc.end();
}

module.exports = { streamReportsPdf };