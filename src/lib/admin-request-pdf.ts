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
import { getRequestDisplayNumber } from "@/lib/request-numbers";

const PAGE_MARGIN = 42;
const CONTENT_WIDTH = 511;
const CONTENT_RIGHT = PAGE_MARGIN + CONTENT_WIDTH;
const FOOTER_Y = 782;
const FOOTER_RESERVED_Y = 760;
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
    .fontSize(19)
    .text("DENTech Medikal", PAGE_MARGIN, PAGE_MARGIN)
    .fillColor("#0f766e")
    .fontSize(10.5)
    .text("Dentech Pro Teklif Formu", PAGE_MARGIN, PAGE_MARGIN + 22);

  const rightX = 350;
  doc
    .fillColor("#6b7280")
    .fontSize(9)
    .text("Talep No", rightX, PAGE_MARGIN, { align: "right", width: 200 })
    .fillColor("#111827")
    .fontSize(10)
    .text(getRequestDisplayNumber(request), rightX, PAGE_MARGIN + 14, {
      align: "right",
      width: 200,
    })
    .fillColor("#6b7280")
    .fontSize(9)
    .text("Durum", rightX, PAGE_MARGIN + 32, { align: "right", width: 200 })
    .fillColor("#111827")
    .fontSize(10)
    .text(requestStatusLabel(request.status), rightX, PAGE_MARGIN + 46, {
      align: "right",
      width: 200,
    });

  doc
    .moveTo(PAGE_MARGIN, PAGE_MARGIN + 68)
    .lineTo(CONTENT_RIGHT, PAGE_MARGIN + 68)
    .strokeColor("#d1d5db")
    .stroke();
}

function drawParties(doc: PDFKit.PDFDocument, request: AdminRequestDetail) {
  const y = PAGE_MARGIN + 84;
  const customerRows: Array<[string, string | null | undefined]> = request.customer
    ? [
        ["Firma / Klinik", request.customer.company_name],
        ["Ad / Ünvan", request.customer.name],
        ["Telefon", request.customer.phone],
        ["E-posta", request.customer.email],
        [
          "Konum",
          [request.customer.city, request.customer.district].filter(Boolean).join(" / "),
        ],
      ]
    : [
        ["Kayıt Tipi", "Kayıtlı uygulama kullanıcısı"],
        ["Ad Soyad", request.requester?.full_name],
        ["Telefon", request.requester?.phone],
        ["E-posta", request.requester?.email],
        ["Rol", request.requester?.role],
      ];
  const requestRowsBase: Array<[string, string | null | undefined]> = [
    ["Kaynak", requestSourceLabel(request.source)],
    ["Oluşturan", request.requester?.full_name],
    ["Oluşturan E-posta", request.requester?.email],
    ["Saha Temsilcisi", request.salesRep?.full_name],
    ["Oluşturma", formatDate(request.created_at)],
  ];
  const requestRows = requestRowsBase.filter((row) => hasMeaningfulValue(row[1]));

  const boxHeight = Math.max(
    getInfoBoxHeight(doc, customerRows, 245),
    getInfoBoxHeight(doc, requestRows, 245)
  );

  drawInfoBox(
    doc,
    request.customer ? "Müşteri Bilgileri" : "Kayıtlı Kullanıcı Bilgisi",
    customerRows,
    PAGE_MARGIN,
    y,
    245,
    boxHeight
  );
  drawInfoBox(doc, "Talep Bilgileri", requestRows, 308, y, 245, boxHeight);

  doc.y = y + boxHeight + 12;
}

function getInfoBoxHeight(
  doc: PDFKit.PDFDocument,
  rows: Array<[string, string | null | undefined]>,
  width: number
) {
  let height = 36;

  for (const [label, value] of rows) {
    const labelHeight = doc.fontSize(8).heightOfString(label, { width: 78 });
    const valueHeight = doc.fontSize(8.5).heightOfString(value ?? "", {
      width: width - 110,
    });
    height += Math.max(labelHeight, valueHeight) + 8;
  }

  return Math.max(102, height + 6);
}

function drawInfoBox(
  doc: PDFKit.PDFDocument,
  title: string,
  rows: Array<[string, string | null | undefined]>,
  x: number,
  y: number,
  width: number,
  height: number
) {
  doc
    .roundedRect(x, y, width, height, 10)
    .fillAndStroke("#f9fafb", "#e5e7eb")
    .fillColor("#111827")
    .fontSize(10.5)
    .text(title, x + 14, y + 12, { width: width - 28 });

  let rowY = y + 30;
  for (const [label, value] of rows) {
    const rowHeight = Math.max(
      doc.fontSize(8).heightOfString(label, { width: 78 }),
      doc.fontSize(8.5).heightOfString(value ?? "", { width: width - 110 })
    );

    doc
      .fillColor("#6b7280")
      .fontSize(8)
      .text(label, x + 14, rowY, { width: 78 })
      .fillColor("#111827")
      .fontSize(8.5)
      .text(value ?? "", x + 96, rowY, { width: width - 110 });

    rowY += rowHeight + 6;
  }
}

function drawLines(doc: PDFKit.PDFDocument, request: AdminRequestDetail) {
  let y = Math.max(doc.y, PAGE_MARGIN + 214);
  doc.fillColor("#111827").fontSize(12).text("Ürün Kalemleri", PAGE_MARGIN, y);
  y += 18;

  drawTableHeader(doc, y);
  y += 20;

  for (const [index, item] of request.items.entries()) {
    const rowHeight = getLineHeight(doc, item);

    if (y + rowHeight > FOOTER_RESERVED_Y) {
      doc.addPage();
      y = PAGE_MARGIN;
      drawTableHeader(doc, y);
      y += 20;
    }

    drawLineRow(doc, item, index + 1, y, rowHeight);
    y += rowHeight;
  }

  doc.y = y + 6;
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
  doc
    .roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 18, 6)
    .fill("#ecfdf5")
    .fillColor("#065f46")
    .fontSize(8)
    .text("Ürün", 52, y + 5, { width: 196 })
    .text("SKU / Varyant", 250, y + 5, { width: 92 })
    .text("Adet", 346, y + 5, { align: "right", width: 36 })
    .text("Birim", 390, y + 5, { align: "right", width: 70 })
    .text("Toplam", 470, y + 5, { align: "right", width: 70 });
}

function drawLineRow(
  doc: PDFKit.PDFDocument,
  item: AdminRequestLine,
  index: number,
  y: number,
  rowHeight: number
) {
  doc
    .rect(PAGE_MARGIN, y, CONTENT_WIDTH, rowHeight)
    .fillAndStroke(index % 2 ? "#ffffff" : "#f9fafb", "#e5e7eb");

  doc
    .fillColor("#111827")
    .fontSize(8.5)
    .text(`${index}. ${item.product?.product_name ?? "Ürün"}`, 52, y + 6, {
      width: 190,
    })
    .fillColor("#6b7280")
    .fontSize(7.5)
    .text(cleanCode(item.product?.product_group_code) ?? "", 52, y + 22, {
      width: 190,
    })
    .fillColor("#111827")
    .fontSize(8)
    .text(getVariantCode(item), 250, y + 6, { width: 90 })
    .text(String(item.quantity), 346, y + 6, { align: "right", width: 36 })
    .text(formatPrice(item.unit_price), 390, y + 6, { align: "right", width: 70 })
    .text(formatPrice(item.line_total), 470, y + 6, { align: "right", width: 70 });
}

function getLineHeight(doc: PDFKit.PDFDocument, item: AdminRequestLine) {
  const productHeight = doc.heightOfString(item.product?.product_name ?? "Ürün", {
    width: 190,
  });

  return Math.max(34, productHeight + 20);
}

function drawTotals(doc: PDFKit.PDFDocument, request: AdminRequestDetail) {
  const totalsHeight = 68;
  let y = Math.max(doc.y + 4, PAGE_MARGIN);

  if (y + totalsHeight > FOOTER_RESERVED_Y) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  const x = 348;
  drawAmountRow(doc, "Ara Toplam", request.subtotal, x, y);
  drawAmountRow(doc, "İndirim", request.discount_total, x, y + 16);

  doc
    .roundedRect(x, y + 34, 205, 28, 8)
    .fill("#0f766e")
    .fillColor("#ffffff")
    .fontSize(10.5)
    .text("Genel Toplam", x + 12, y + 44, { width: 82 })
    .text(formatPrice(request.total), x + 96, y + 44, {
      align: "right",
      width: 96,
    });

  doc.y = y + totalsHeight;
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
  const rows = getPaymentRows(request);

  if (!rows.length) {
    return;
  }

  let y = Math.max(doc.y + 6, PAGE_MARGIN);
  const estimatedSectionHeight =
    16 +
    rows.reduce(
      (total, [label, value]) =>
        total + getPaymentRowHeight(doc, label, value, CONTENT_WIDTH) + 4,
      0
    );

  const startSection = (titleY: number) => {
    doc.fillColor("#111827").fontSize(11).text("Ödeme Bilgisi", PAGE_MARGIN, titleY);
    return titleY + 16;
  };

  if (y + estimatedSectionHeight > FOOTER_RESERVED_Y) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  y = startSection(y);

  for (const [label, value] of rows) {
    const rowHeight = getPaymentRowHeight(doc, label, value, CONTENT_WIDTH);

    if (y + rowHeight > FOOTER_RESERVED_Y) {
      doc.addPage();
      y = startSection(PAGE_MARGIN);
    }

    drawPaymentRow(doc, label, value, PAGE_MARGIN, y, CONTENT_WIDTH, rowHeight);
    y += rowHeight + 4;
  }

  doc.y = y;
}

function getPaymentRowHeight(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  width: number
) {
  const labelHeight = doc.fontSize(8).heightOfString(label, { width: 86 });
  const valueHeight = doc.fontSize(8.5).heightOfString(value, {
    width: width - 118,
  });

  return Math.max(30, Math.max(labelHeight, valueHeight) + 14);
}

function drawPaymentRow(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  doc
    .roundedRect(x, y, width, height, 8)
    .fillAndStroke("#f9fafb", "#e5e7eb")
    .fillColor("#6b7280")
    .fontSize(8)
    .text(label, x + 12, y + 10, { width: 86 })
    .fillColor("#111827")
    .fontSize(8.5)
    .text(value, x + 102, y + 10, { width: width - 116 });
}

function addPageFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc
      .fillColor("#6b7280")
      .fontSize(8)
      .text("Bu belge Dentech Pro üzerinden oluşturulmuştur.", PAGE_MARGIN, FOOTER_Y, {
        align: "center",
        width: CONTENT_WIDTH,
      });
  }
}

function getPaymentRows(request: AdminRequestDetail): Array<[string, string]> {
  const rows: Array<[string, string | null | undefined]> = [];

  if (request.paymentInfo.method) {
    rows.push(["Ödeme yöntemi", paymentMethodLabel(request.paymentInfo.method)]);
  }

  rows.push(
    ["Referans", request.paymentInfo.reference],
    ["Ödeme notu", request.paymentInfo.note],
    ["Talep notu", request.requestNote]
  );

  return rows.filter(
    (row): row is [string, string] => hasMeaningfulValue(row[1])
  );
}

function hasMeaningfulValue(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return false;
  }

  return normalized !== "-" && normalized !== "Belirtilmedi";
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
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value ?? 0)} TL`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
