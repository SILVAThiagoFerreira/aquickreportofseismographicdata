import {
  CHANNEL_LABELS,
  CHANNEL_ORDER,
  anyRecordHasVibrationAlert,
  buildEventSlug,
  buildReportFilename,
  formatCharge,
  formatDateBr,
  formatDateTimeBr,
  formatDecimal,
  formatDistance,
  formatFrequency,
  formatMicrophoneFrequency,
  formatMmS,
  formatPspl,
  formatRecordCompliance,
  getDateRange,
  getPrimaryClient,
  recordHasVibrationAlert,
  recordOverallCompliant,
} from "./utils.js";

import { jsPDF } from "./vendor/jspdf/jspdf.es.min.js";
import { applyPlugin } from "./vendor/jspdf-autotable/jspdf.plugin.autotable.mjs";

applyPlugin(jsPDF);

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 14;
const CONTENT_W = PAGE_W - (MARGIN_X * 2);

const COLORS = {
  red: [229, 35, 27],
  redSoft: [245, 208, 205],
  dark: [67, 76, 91],
  green: [123, 197, 28],
  greenSoft: [220, 243, 196],
  light: [241, 241, 241],
  navy: [28, 34, 64],
  text: [24, 32, 42],
  muted: [102, 116, 135],
  line: [220, 224, 232],
  softPaper: [248, 250, 252],
};

function rgb(color) {
  return color;
}

function jsPdf() {
  return jsPDF;
}

function ensureAutoTable(doc) {
  if (typeof doc.autoTable !== "function") {
    throw new Error("O plugin AutoTable nao foi carregado.");
  }
}

function drawBackground(doc, accent = COLORS.red) {
  doc.setFillColor(...rgb(COLORS.softPaper));
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  doc.setFillColor(...rgb(COLORS.navy));
  doc.rect(0, 0, PAGE_W, 38, "F");
  doc.setFillColor(...rgb(accent));
  doc.rect(0, 0, PAGE_W, 3, "F");
}

function drawHeader(doc, title, subtitle, logoDataUrl, accentLabel, accentTone = COLORS.red) {
  drawBackground(doc, accentTone);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, MARGIN_X, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.4);
  doc.text(subtitle, MARGIN_X, 24, { maxWidth: 118 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  const chipWidth = Math.min(Math.max(doc.getTextWidth(accentLabel) + 8, 46), 92);
  doc.setDrawColor(255, 255, 255);
  doc.roundedRect(MARGIN_X, 28, chipWidth, 7, 2.5, 2.5, "S");
  doc.setTextColor(255, 255, 255);
  doc.text(accentLabel, MARGIN_X + 3, 32.8);

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 166, 8, 30, 18, undefined, "FAST");
    } catch {
      // If the image cannot be embedded, fall back to text-only branding.
    }
  }
}

function drawMetricCard(doc, x, y, w, h, label, value, note, accent = COLORS.red) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...rgb(COLORS.line));
  doc.roundedRect(x, y, w, h, 4, 4, "S");
  doc.setFillColor(...rgb(accent));
  doc.rect(x, y, w, 2.2, "F");

  doc.setTextColor(...rgb(COLORS.muted));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text(label.toUpperCase(), x + 4, y + 8);

  doc.setTextColor(...rgb(COLORS.text));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16.5);
  doc.text(value, x + 4, y + 16, { maxWidth: w - 8 });

  if (note) {
    doc.setTextColor(...rgb(COLORS.muted));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.text(note, x + 4, y + h - 4.5, { maxWidth: w - 8 });
  }
}

function drawStatusChip(doc, x, y, label, tone) {
  const color = tone === "success" ? COLORS.green : tone === "warning" ? [245, 165, 36] : tone === "danger" ? COLORS.red : COLORS.dark;
  doc.setFillColor(...rgb(color));
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  const textWidth = doc.getTextWidth(label) + 8;
  doc.roundedRect(x, y, textWidth, 7.4, 3, 3, "F");
  doc.text(label, x + 4, y + 5.1);
}

function drawFieldCard(doc, x, y, w, h, label, value) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...rgb(COLORS.line));
  doc.roundedRect(x, y, w, h, 3.5, 3.5, "S");

  doc.setTextColor(...rgb(COLORS.muted));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.text(label.toUpperCase(), x + 4, y + 7.3);

  doc.setTextColor(...rgb(COLORS.text));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  const lines = doc.splitTextToSize(String(value ?? "N/D"), w - 8);
  doc.text(lines, x + 4, y + 13);
}

function drawSummaryTable(doc, records, startY, threshold) {
  ensureAutoTable(doc);
  const body = records.map((record) => [
    record.location ?? "N/D",
    getPrimaryClient([record]),
    formatDateBr(record.event_date),
    formatMmS(record.peak_vector_sum_mm_s),
    formatPspl(record.pspl_db_l),
    formatRecordCompliance(record),
  ]);

  doc.autoTable({
    startY,
    head: [["Local", "Cliente", "Data", "PVS (mm/s)", "PSPL (dB(L))", "Situação"]],
    body,
    theme: "grid",
    pageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 7.9,
      cellPadding: 2.4,
      textColor: COLORS.text,
      lineColor: COLORS.line,
      lineWidth: 0.12,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.dark,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [247, 248, 250],
    },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "center" },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 5) {
        const status = String(data.cell.raw || "");
        if (status === "CONFORME") {
          data.cell.styles.textColor = COLORS.green;
          data.cell.styles.fontStyle = "bold";
        } else if (status === "REVISAR") {
          data.cell.styles.textColor = COLORS.red;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const noteY = doc.lastAutoTable.finalY + 7;
  const note = anyRecordHasVibrationAlert(records, threshold)
    ? `Índices de vibração: acima de ${formatDecimal(threshold, 1)} mm/s.`
    : `Índices de vibração: abaixo de ${formatDecimal(threshold, 1)} mm/s.`;
  doc.setTextColor(...rgb(COLORS.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(note, MARGIN_X, noteY);
  return noteY;
}

function drawDetailPage(doc, record, pageIndex, totalDetailPages, logoDataUrl, threshold) {
  const overall = recordOverallCompliant(record);
  const vibrationAlert = recordHasVibrationAlert(record, threshold);
  const accentTone = overall === false ? COLORS.red : vibrationAlert ? [245, 165, 36] : COLORS.green;
  const statusTone = overall == null ? "neutral" : overall ? "success" : "danger";
  const statusLabel = overall == null ? "STATUS N/D" : overall ? "CONFORME" : "REVISAR";

  doc.addPage();
  drawHeader(
    doc,
    `DETALHE DO PONTO ${pageIndex + 1}`,
    `${record.location ?? "N/D"} • ${record.source_pdf ?? "arquivo"}`,
    logoDataUrl,
    `PÁGINA ${pageIndex + 2} DE ${totalDetailPages + 1}`,
    accentTone,
  );

  drawStatusChip(doc, 152, 13, statusLabel, statusTone);

  const fields = [
    ["Cliente", getPrimaryClient([record])],
    ["Data do evento", formatDateBr(record.event_date)],
    ["Número de série", record.serial_number ?? "N/D"],
    ["Bateria", record.battery_level ?? "N/D"],
    ["Calibração", record.unit_calibration ?? "N/D"],
    ["Arquivo interno", record.file_name ?? "N/D"],
    ["Distância escalada", record.scaled_distance == null ? "N/D" : `${formatDistance(record.scaled_distance)} (${record.distance_m == null ? "N/D" : formatDistance(record.distance_m)} m; ${record.charge_kg == null ? "N/D" : formatCharge(record.charge_kg)} kg)`],
    ["PSPL", record.pspl_db_l == null ? "N/D" : `${formatPspl(record.pspl_db_l)} dB(L)`],
    ["PVS", record.peak_vector_sum_mm_s == null ? "N/D" : `${formatMmS(record.peak_vector_sum_mm_s)} mm/s`],
    ["Freq. microfone", formatMicrophoneFrequency(record.microphone_zc_freq_hz)],
  ];

  const startX = MARGIN_X;
  const startY = 46;
  const cardW = 86;
  const cardH = 20.5;
  const colGap = 8;
  const rowGap = 8;

  fields.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = startX + (col * (cardW + colGap));
    const y = startY + (row * (cardH + rowGap));
    drawFieldCard(doc, x, y, cardW, cardH, label, value);
  });

  const channelStartY = startY + (5 * (cardH + rowGap)) + 2;
  doc.setTextColor(...rgb(COLORS.text));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text("Canais monitorados", MARGIN_X, channelStartY);

  ensureAutoTable(doc);
  const body = CHANNEL_ORDER.map((axis) => {
    const channel = record.channels?.[axis] ?? { axis };
    return [
      CHANNEL_LABELS[axis] ?? axis,
      formatMmS(channel.ppv_mm_s),
      formatFrequency(channel.zc_freq_hz),
      formatFrequency(channel.sensor_frequency_hz),
      channel.overswing_ratio == null ? "N/D" : formatDecimal(channel.overswing_ratio, 3),
      channel.reference_limit_mm_s == null ? "N/D" : formatMmS(channel.reference_limit_mm_s),
      channel.compliant == null ? "N/D" : channel.compliant ? "SIM" : "NÃO",
    ];
  });

  doc.autoTable({
    startY: channelStartY + 4,
    head: [["Eixo", "PPV (mm/s)", "Freq. ZC (Hz)", "Freq. sensor (Hz)", "Overswing", "Limite (mm/s)", "Conforme"]],
    body,
    theme: "grid",
    pageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 7.7,
      cellPadding: 2.4,
      textColor: COLORS.text,
      lineColor: COLORS.line,
      lineWidth: 0.12,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.dark,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [247, 248, 250],
    },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "center" },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 6) {
        const status = String(data.cell.raw || "");
        if (status === "SIM") {
          data.cell.styles.textColor = COLORS.green;
          data.cell.styles.fontStyle = "bold";
        } else if (status === "NÃO") {
          data.cell.styles.textColor = COLORS.red;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const footerY = doc.lastAutoTable.finalY + 8;
  doc.setTextColor(...rgb(COLORS.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Conformidade geral: ${formatRecordCompliance(record)} | Vibração: ${vibrationAlert ? `acima` : `abaixo`} de ${formatDecimal(threshold, 1)} mm/s`, MARGIN_X, footerY, { maxWidth: CONTENT_W });
  doc.text("Valores ausentes aparecem como N/D.", MARGIN_X, footerY + 5.2);
}

function drawFooter(doc, pageNumber, totalPages, generatedAt) {
  doc.setDrawColor(...rgb(COLORS.line));
  doc.line(MARGIN_X, PAGE_H - 12, PAGE_W - MARGIN_X, PAGE_H - 12);
  doc.setTextColor(...rgb(COLORS.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text(`Gerado em ${formatDateTimeBr(generatedAt)}`, MARGIN_X, PAGE_H - 6.5);
  doc.text(`Página ${pageNumber} de ${totalPages}`, PAGE_W - MARGIN_X, PAGE_H - 6.5, { align: "right" });
}

export async function buildReportBlob(records, config, logoDataUrl) {
  const generatedAt = new Date();
  const threshold = config?.report?.vibration_alert_threshold_mm_s ?? 0.8;
  const summaryLimit = config?.report?.summary_record_limit ?? 3;
  const client = getPrimaryClient(records);
  const dateRange = getDateRange(records);
  const filename = buildReportFilename(records, generatedAt);
  const vibrationAlert = anyRecordHasVibrationAlert(records, threshold);
  const vibrationLevelLabel = vibrationAlert ? "ACIMA" : "ABAIXO";

  const PDF = jsPdf();
  const doc = new PDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setProperties({
    title: "Relatório OnePage de Monitoramento Sismográfico - Enaex",
    subject: "Sismogramas processados no navegador",
    author: "Report Sismografia Enaex",
    creator: "GitHub Pages",
  });

  const summaryRecords = records.slice(0, summaryLimit);
  const extraRecords = records.slice(summaryLimit);

  drawHeader(
    doc,
    "MONITORAMENTO SISMOGRÁFICO",
    `Processamento local no navegador • ${client} • ${dateRange}`,
    logoDataUrl,
    `VIBRAÇÃO ${vibrationLevelLabel}`,
    vibrationAlert ? [245, 165, 36] : COLORS.green,
  );

  const metricY = 46;
  const metricW = (CONTENT_W - 10.5) / 4;
  const metrics = [
    {
      label: "PDFs",
      value: String(records.length),
      note: `Resumo com até ${summaryLimit} registros.`,
      accent: COLORS.red,
    },
    {
      label: "Conformes",
      value: String(records.filter((record) => recordOverallCompliant(record) === true).length),
      note: "Conformidade NBR 9653:2018.",
      accent: COLORS.green,
    },
    {
      label: "PVS máximo",
      value: records.length ? `${formatMmS(Math.max(...records.map((record) => record.peak_vector_sum_mm_s ?? 0)))} mm/s` : "N/D",
      note: "Maior pico vetorial detectado.",
      accent: COLORS.navy,
    },
    {
      label: "Vibração",
      value: vibrationLevelLabel,
      note: `Limite configurado em ${formatDecimal(threshold, 1)} mm/s.`,
      accent: vibrationAlert ? [245, 165, 36] : COLORS.green,
    },
  ];

  metrics.forEach((metric, index) => {
    const x = MARGIN_X + (index * (metricW + 3.5));
    drawMetricCard(doc, x, metricY, metricW, 24, metric.label, metric.value, metric.note, metric.accent);
  });

  const summaryTextY = 79;
  doc.setTextColor(...rgb(COLORS.text));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.8);
  doc.text("Resumo executivo", MARGIN_X, summaryTextY);

  doc.setTextColor(...rgb(COLORS.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  const summaryWord = summaryRecords.length === 1 ? "registro" : "registros";
  const extraWord = extraRecords.length === 1 ? "registro complementar" : "registros complementares";
  doc.text(
    extraRecords.length
      ? `Os ${summaryRecords.length} primeiros ${summaryWord} aparecem na primeira página; ${extraRecords.length} ${extraWord} seguem em páginas complementares.`
      : "Todos os registros cabem na primeira página.",
    MARGIN_X,
    summaryTextY + 5.2,
    { maxWidth: CONTENT_W },
  );

  const tableEndY = drawSummaryTable(doc, summaryRecords, 90, threshold);

  if (extraRecords.length) {
    doc.setTextColor(...rgb(COLORS.muted));
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.1);
    doc.text(`+ ${extraRecords.length} ${extraWord} nas páginas seguintes.`, MARGIN_X, tableEndY + 7);
  }

  extraRecords.forEach((record, index) => {
    drawDetailPage(doc, record, index, extraRecords.length, logoDataUrl, threshold);
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, totalPages, generatedAt);
  }

  return {
    blob: doc.output("blob"),
    filename,
    generatedAt,
    eventSlug: buildEventSlug(records, generatedAt),
  };
}
