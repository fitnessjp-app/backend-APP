const PDFDocument = require('pdfkit');

const ACCENT = '#ff7a1a';
const DARK = '#0f1522';
const GREY = '#6b7280';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

// Builds a one-page A5 receipt and returns a PDFDocument stream (pipe it to the response).
// NOTE: the built-in PDF font has no rupee glyph, so amounts are written as "Rs."
const generateReceiptPdf = (r) => {
  const doc = new PDFDocument({ size: 'A5', margin: 0, info: { Title: `Receipt ${r.receiptNo}`, Author: r.gymName } });
  const W = doc.page.width; // 419.5
  const M = 32;

  // Header band
  doc.rect(0, 0, W, 92).fill(DARK);
  doc.rect(0, 92, W, 4).fill(ACCENT);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text(r.gymName, M, 26, { width: W - 2 * M });
  doc.font('Helvetica').fontSize(9).fillColor('#cbd5e1');
  if (r.gymAddress) doc.text(r.gymAddress, M, 54, { width: W - 2 * M });
  if (r.gymPhone) doc.text(`Phone: ${r.gymPhone}`, M, r.gymAddress ? 66 : 54, { width: W - 2 * M });

  // Title row
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(15).text('PAYMENT RECEIPT', M, 118);
  doc.font('Helvetica').fontSize(9).fillColor(GREY);
  doc.text(`Receipt No: ${r.receiptNo}`, M, 120, { width: W - 2 * M, align: 'right' });
  doc.text(`Date: ${fmtDate(r.date)}`, M, 132, { width: W - 2 * M, align: 'right' });

  // Type pill
  const pill = r.type === 'renewal' ? 'RENEWAL' : 'NEW ADMISSION';
  doc.roundedRect(M, 142, 92, 18, 9).fill(ACCENT);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8).text(pill, M, 148, { width: 92, align: 'center' });

  // Member box
  let y = 176;
  doc.roundedRect(M, y, W - 2 * M, 54, 8).lineWidth(0.8).strokeColor('#e5e7eb').stroke();
  doc.fillColor(GREY).font('Helvetica').fontSize(8).text('RECEIVED FROM', M + 14, y + 10);
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(13).text(r.memberName || 'Member', M + 14, y + 22, { width: W - 2 * M - 28 });
  if (r.memberPhone) {
    doc.fillColor(GREY).font('Helvetica').fontSize(9).text(`Mobile: ${r.memberPhone}`, M + 14, y + 40);
  }

  // Detail rows
  y += 74;
  const rows = [
    ['Plan', r.planName || '-'],
    ['Duration', r.durationInMonths ? `${r.durationInMonths} month${r.durationInMonths > 1 ? 's' : ''}` : '-'],
    ['Membership valid till', fmtDate(r.expiryDate)],
    ['Payment mode', 'Cash'],
    ['Received by', r.receivedBy || '-'],
  ];
  rows.forEach(([k, v], i) => {
    const ry = y + i * 24;
    if (i % 2 === 0) doc.rect(M, ry - 5, W - 2 * M, 24).fill('#f9fafb');
    doc.fillColor(GREY).font('Helvetica').fontSize(10).text(k, M + 10, ry);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(String(v), M + 10, ry, { width: W - 2 * M - 20, align: 'right' });
  });

  // Amount
  y += rows.length * 24 + 12;
  doc.roundedRect(M, y, W - 2 * M, 46, 8).fill(DARK);
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(10).text('AMOUNT PAID', M + 16, y + 17);
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(20).text(`Rs. ${Number(r.amount || 0).toLocaleString('en-IN')}`, M, y + 12, {
    width: W - 2 * M - 16,
    align: 'right',
  });

  // Footer
  doc.fillColor(GREY).font('Helvetica').fontSize(8)
    .text('This is a computer generated receipt and does not need a signature.', M, doc.page.height - 52, { width: W - 2 * M, align: 'center' });
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9)
    .text(`Thank you for choosing ${r.gymName}!`, M, doc.page.height - 38, { width: W - 2 * M, align: 'center' });

  doc.end();
  return doc;
};

module.exports = generateReceiptPdf;
