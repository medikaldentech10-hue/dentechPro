import "server-only";

import path from "node:path";

import PDFDocument from "pdfkit";

import {
  paymentMethodLabel,
  requestSourceLabel,
  requestStatusLabel,
  type AdminRequestDetail,
  type AdminRequestLine,
} from "@/lib/admin-requests";

const PAGE_MARGIN = 42;
const FONT_PATH = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "compiled",
  "@vercel",
  "og",
  "Geist-Regular.ttf"
);

export async function createAdminRequestQuotePdf(
  request: AdminRequestDetail
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      bufferPages: true,
      font: FONT_PATH,
      margin: PAGE_MARGIN,
      size: "A4",
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    drawQuote(doc, request);
    addPageFooters(doc);
    doc.end();
  });
}

function drawQuote(doc: PDFKit.PDFDocument, request: AdminRequestDetail) {
  drawHeader(doc, request);
  drawParties(doc, request);
  drawLines(doc, request);
  drawTotals(doc, request);
  drawPaymentInfo(doc, request);
}

function drawHeader(doc: PDFKit.PDFDocument, request: AdminRequestDetail) {
  doc
    .fillColor("#111827")
    .fontSize(22)
    .text("DENTech Medikal", PAGE_MARGIN, PAGE_MARGIN)
    .fillColor("#0f766e")
    .fontSize(12)
    .text("Dentech Pro Teklif Formu", PAGE_MARGIN, PAGE_MARGIN + 28);

  const rightX = 350;
  doc
    .fillColor("#6b7280")
    .fontSize(9)
    .text("Talep No", rightX, PAGE_MARGIN, { align: "right", width: 200 })
    .fillColor("#111827")
    .fontSize(10)
    .text(request.id, rightX, PAGE_MARGIN + 14, { align: "right", width: 200 })
    .fillColor("#6b7280")
    .fontSize(9)
    .text("Durum", rightX, PAGE_MARGIN + 36, { align: "right", width: 200 })
    .fillColor("#111827")
    .fontSize(10)
    .text(requestStatusLabel(request.status), rightX, PAGE_MARGIN + 50, {
      align: "right",
      width: 200,
    });

  doc
    .moveTo(PAGE_MARGIN, PAGE_MARGIN + 82)
    .lineTo(553, PAGE_MARGIN + 82)
    .strokeColor("#d1d5db")
    .stroke();
}

function drawParties(doc: PDFKit.PDFDocument, request: AdminRequestDetail) {
  const y = PAGE_MARGIN + 106;
  drawInfoBox(doc, "Müşteri Bilgileri", [
    ["Firma / Klinik", request.customer?.company_name],
    ["Ad / Ünvan", request.customer?.name],
    ["Telefon", request.customer?.phone],
    ["E-posta", request.customer?.email],
    [
      "Konum",
      [request.customer?.city, request.customer?.district].filter(Boolean).join(" / "),
    ],
  ], PAGE_MARGIN, y, 245);

  drawInfoBox(doc, "Talep Bilgileri", [
    ["Kaynak", requestSourceLabel(request.source)],
    ["Oluşturan", request.requester?.full_name],
    ["Oluşturan E-posta", request.requester?.email],
    ["Saha Temsilcisi", request.salesRep?.full_name],
    ["Oluşturma", formatDate(request.created_at)],
  ], 308, y, 245);
}

function drawInfoBox(
  doc: PDFKit.PDFDocument,
  title: string,
  rows: Array<[string, string | null | undefined]>,
  x: number,
  y: number,
  width: number
) {
  doc
    .roundedRect(x, y, width, 128, 10)
    .fillAndStroke("#f9fafb", "#e5e7eb")
    .fillColor("#111827")
    .fontSize(11)
    .text(title, x + 14, y + 12, { width: width - 28 });

  let rowY = y + 34;
  for (const [label, value] of rows) {
    doc
      .fillColor("#6b7280")
      .fontSize(8)
      .text(label, x + 14, rowY, { continued: false, width: 78 })
      .fillColor("#111827")
      .fontSize(8.5)
      .text(value || "-", x + 96, rowY, { width: width - 110 });
    rowY += 17;
  }
}

function drawLines(doc: PDFKit.PDFDocument, request: AdminRequestDetail) {
  let y = PAGE_MARGIN + 260;
  doc.fillColor("#111827").fontSize(13).text("Ürün Kalemleri", PAGE_MARGIN, y);
  y += 24;

  drawTableHeader(doc, y);
  y += 24;

  for (const [index, item] of request.items.entries()) {
    const rowHeight = getLineHeight(doc, item);

    if (y + rowHeight > 720) {
      doc.addPage();
      y = PAGE_MARGIN;
      drawTableHeader(doc, y);
      y += 24;
    }

    drawLineRow(doc, item, index + 1, y, rowHeight);
    y += rowHeight;
  }

  doc.y = y + 10;
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
  doc
    .roundedRect(PAGE_MARGIN, y, 511, 22, 6)
    .fill("#ecfdf5")
    .fillColor("#065f46")
    .fontSize(8)
    .text("Ürün", 52, y + 7, { width: 196 })
    .text("SKU / Varyant", 250, y + 7, { width: 92 })
    .text("Adet", 346, y + 7, { align: "right", width: 36 })
    .text("Birim", 390, y + 7, { align: "right", width: 70 })
    .text("Toplam", 470, y + 7, { align: "right", width: 70 });
}

function drawLineRow(
  doc: PDFKit.PDFDocument,
  item: AdminRequestLine,
  index: number,
  y: number,
  rowHeight: number
) {
  doc
    .rect(PAGE_MARGIN, y, 511, rowHeight)
    .fillAndStroke(index % 2 ? "#ffffff" : "#f9fafb", "#e5e7eb");

  doc
    .fillColor("#111827")
    .fontSize(8.5)
    .text(`${index}. ${item.product?.product_name ?? "Ürün"}`, 52, y + 8, {
      width: 190,
    })
    .fillColor("#6b7280")
    .fontSize(7.5)
    .text(cleanCode(item.product?.product_group_code) ?? "-", 52, y + 28, {
      width: 190,
    })
    .fillColor("#111827")
    .fontSize(8)
    .text(getVariantCode(item), 250, y + 8, { width: 90 })
    .text(String(item.quantity), 346, y + 8, { align: "right", width: 36 })
    .text(formatPrice(item.unit_price), 390, y + 8, { align: "right", width: 70 })
    .text(formatPrice(item.line_total), 470, y + 8, { align: "right", width: 70 });
}

function getLineHeight(doc: PDFKit.PDFDocument, item: AdminRequestLine) {
  const productHeight = doc.heightOfString(item.product?.product_name ?? "Ürün", {
    width: 190,
  });

  return Math.max(44, productHeight + 30);
}

function drawTotals(doc: PDFKit.PDFDocument, request: AdminRequestDetail) {
  let y = Math.max(doc.y, 570);

  if (y > 690) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  const x = 348;
  drawAmountRow(doc, "Ara Toplam", request.subtotal, x, y);
  drawAmountRow(doc, "İndirim", request.discount_total, x, y + 20);

  doc
    .roundedRect(x, y + 46, 205, 30, 8)
    .fill("#0f766e")
    .fillColor("#ffffff")
    .fontSize(11)
    .text("Genel Toplam", x + 12, y + 56, { width: 82 })
    .text(formatPrice(request.total), x + 96, y + 56, {
      align: "right",
      width: 96,
    });

  doc.y = y + 96;
}

function drawAmountRow(
  doc: PDFKit.PDFDocument,
  label: string,
  value: number | null,
  x: number,
  y: number
) {
  doc
    .fillColor("#6b7280")
    .fontSize(9)
    .text(label, x, y, { width: 88 })
    .fillColor("#111827")
    .text(formatPrice(value), x + 88, y, { align: "right", width: 116 });
}

function drawPaymentInfo(doc: PDFKit.PDFDocument, request: AdminRequestDetail) {
  const rows = [
    `Ödeme yöntemi: ${paymentMethodLabel(request.paymentInfo.method)}`,
    `Referans: ${request.paymentInfo.reference || "-"}`,
    `Ödeme notu: ${request.paymentInfo.note || "-"}`,
  ];

  if (doc.y > 700) {
    doc.addPage();
  }

  doc
    .roundedRect(PAGE_MARGIN, doc.y, 511, 80, 10)
    .fillAndStroke("#f9fafb", "#e5e7eb")
    .fillColor("#111827")
    .fontSize(11)
    .text("Ödeme Bilgisi", PAGE_MARGIN + 14, doc.y + 12)
    .fillColor("#4b5563")
    .fontSize(8.5)
    .text(rows.join("\n"), PAGE_MARGIN + 14, doc.y + 30, {
      lineGap: 4,
      width: 483,
    });
}

function addPageFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc
      .fillColor("#6b7280")
      .fontSize(8)
      .text(
        "Bu belge Dentech Pro üzerinden oluşturulmuştur.",
        PAGE_MARGIN,
        796,
        { align: "center", width: 511 }
      );
  }
}

function getVariantCode(item: AdminRequestLine) {
  return (
    cleanCode(item.variant?.manufacturer_ref) ??
    cleanCode(item.variant?.variant_code) ??
    "-"
  );
}

function cleanCode(value: string | null | undefined) {
  if (!value || isUuid(value)) {
    return null;
  }

  return value;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatPrice(value: number | null) {
  return new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    style: "currency",
  }).format(value ?? 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
