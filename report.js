import {
  anyRecordHasVibrationAlert,
  buildEventSlug,
  buildReportFilename,
  formatCharge,
  formatDateBr,
  formatDecimal,
  formatDistance,
  formatFrequency,
  formatMicrophoneFrequency,
  formatMmS,
  formatPspl,
  getDateRange,
  getPrimaryClient,
  recordOverallCompliant,
  CHANNEL_ORDER,
} from "./utils.js";

import "./vendor/jspdf/jspdf.umd.min.js";

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const CONTENT_X_MM = 10;
const CONTENT_W_MM = 190;
const COVER_TITLE_TOP_MM = 29;
const COVER_SUMMARY_HEADING_TOP_MM = 62;
const COVER_SCOPE_TOP_MM = 70;
const COVER_CONCLUSION_TOP_MM = 97;
const COVER_CHARTS_TOP_MM = 123;
const COVER_RECORDS_HEADING_TOP_MM = 194;
const COVER_ROW_BASE_TOP_MM = 204.7;
const APPENDIX_TITLE_TOP_MM = 25;
const APPENDIX_META_ONE_TOP_MM = 30;
const APPENDIX_META_TWO_TOP_MM = 34;
const APPENDIX_HEADER_X_MM = 43;
const APPENDIX_ROW_BASE_TOP_MM = 45;
const ROW_HEIGHT_MM = 19.8;
const ROW_GAP_MM = 3.9;
const ROW_STEP_MM = ROW_HEIGHT_MM + ROW_GAP_MM;
const APPENDIX_ROWS_PER_PAGE = Math.max(1, Math.floor((((PAGE_H_MM - 47) - 12) + ROW_GAP_MM) / ROW_STEP_MM));
const CHART_SVG_W = 360;
const CHART_SVG_H = 210;

const COLORS = {
  red: "#E5231B",
  redSoft: "#F5D0CD",
  dark: "#434C5B",
  green: "#7BC51C",
  greenSoft: "#DCF3C4",
  light: "#F1F1F1",
  navy: "#1C2240",
  text: "#18202A",
  muted: "#667487",
  line: "#C9D1DA",
  softPaper: "#F8FAFC",
  chartGrid: "#D7D7D7",
  chartAxis: "#2E2E2E",
  chartWhite: "#FFFFFF",
  chartBlue: "#2E86AB",
  chartBrown: "#434C5B",
  chartGuide: "#E5231B",
};

const REPORT_STYLES = `
.report-render-root {
  position: fixed;
  left: -12000px;
  top: 0;
  width: ${PAGE_W_MM}mm;
  pointer-events: none;
  user-select: none;
}

.report-page,
.report-page * {
  box-sizing: border-box;
}

.report-page {
  position: relative;
  width: ${PAGE_W_MM}mm;
  height: ${PAGE_H_MM}mm;
  overflow: hidden;
  background: ${COLORS.light};
  color: ${COLORS.text};
  font-family: Helvetica, Arial, sans-serif;
  font-size: 2.5mm;
  line-height: 1.2;
  text-rendering: geometricPrecision;
  letter-spacing: 0.001em;
  word-spacing: 0.001em;
}

.report-topline {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 1.8mm;
  background: ${COLORS.red};
}

.report-logo {
  position: absolute;
  left: 8mm;
  top: 18mm;
  width: 30mm;
  height: 9.7mm;
  object-fit: contain;
  z-index: 2;
}

.report-corner {
  position: absolute;
  width: 16mm;
  height: 16mm;
  opacity: 0.95;
}

.report-corner--topright {
  right: 7mm;
  top: 8mm;
}

.report-corner--bottomleft {
  left: 6mm;
  bottom: 6mm;
}

.report-dna-badge {
  position: absolute;
  right: 10mm;
  bottom: 10.8mm;
  width: 40mm;
  height: 8.5mm;
  border-radius: 2.5mm;
  background: ${COLORS.navy};
  border: 0.3mm solid #667487;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.8mm;
  color: #fff;
  font-size: 2.9mm;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.report-dna-badge__dna {
  color: #FDB515;
}

.report-dna-badge__dot {
  color: ${COLORS.green};
}

.report-title-card {
  position: absolute;
  left: ${CONTENT_X_MM}mm;
  top: ${COVER_TITLE_TOP_MM}mm;
  width: ${CONTENT_W_MM}mm;
  height: 30mm;
  background: #fff;
  border-radius: 4px;
  box-shadow: 1.3mm 1mm 0 rgba(0, 0, 0, 0.08);
  overflow: hidden;
  z-index: 1;
}

.report-title-strip {
  height: 4mm;
  background: #C8C8C8;
}

.report-title-body {
  padding: 7mm 7mm 2.8mm;
}

.report-title-text {
  margin: 0;
  color: ${COLORS.red};
  font-size: 4.8mm;
  font-weight: 700;
  line-height: 1;
}

.report-title-client {
  margin-top: 3.2mm;
  color: #667487;
  font-size: 3.6mm;
  font-weight: 700;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-title-footer {
  margin-top: 2.6mm;
  color: #000;
  font-size: 2.55mm;
  font-weight: 700;
  line-height: 1;
}

.report-heading {
  position: absolute;
  left: ${CONTENT_X_MM}mm;
  margin: 0;
  color: #000;
  font-size: 5.47mm;
  font-weight: 400;
  line-height: 1;
}

.report-heading--summary {
  top: ${COVER_SUMMARY_HEADING_TOP_MM}mm;
}

.report-heading--records {
  top: ${COVER_RECORDS_HEADING_TOP_MM}mm;
}

.report-box {
  position: absolute;
  left: ${CONTENT_X_MM}mm;
  width: ${CONTENT_W_MM}mm;
  background: #fff;
  border-radius: 4px;
  box-shadow: 1.3mm 1mm 0 rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.report-box-strip {
  height: 7.2mm;
}

.report-box-title {
  position: absolute;
  left: 4mm;
  top: 1.7mm;
  color: #fff;
  font-size: 3.45mm;
  font-weight: 700;
}

.report-box-body {
  position: absolute;
  left: 0;
  right: 0;
  top: 7.2mm;
  bottom: 0;
  padding: 3.5mm 4mm 3mm;
  color: ${COLORS.text};
  font-size: 2.75mm;
  line-height: 1.15;
  overflow: hidden;
}

.report-box-line {
  margin: 0 0 1.5mm 0;
}

.report-box-line--success {
  color: ${COLORS.green};
}

.report-box-line--warning {
  color: ${COLORS.red};
}

.report-conclusion-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 2.08mm;
  line-height: 1.15;
}

.report-conclusion-table td {
  border: 0.12mm solid ${COLORS.line};
  padding: 1mm 1.2mm;
  vertical-align: middle;
}

.report-conclusion-table td:first-child {
  width: 31mm;
  background: #EAF5D7;
  font-weight: 700;
}

.report-chart-row {
  position: absolute;
  left: ${CONTENT_X_MM}mm;
  top: ${COVER_CHARTS_TOP_MM}mm;
  width: ${CONTENT_W_MM}mm;
  height: 62mm;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6mm;
}

.report-chart-panel {
  position: relative;
  background: #fff;
  border-radius: 4px;
  box-shadow: 1.3mm 1mm 0 rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.report-chart-strip {
  height: 7.2mm;
  background: ${COLORS.green};
}

.report-chart-title {
  position: absolute;
  left: 4mm;
  top: 1.7mm;
  color: #fff;
  font-size: 3.4mm;
  font-weight: 700;
}

.report-chart-body {
  position: absolute;
  left: 0;
  right: 0;
  top: 7.2mm;
  bottom: 0;
  padding: 1.8mm 2mm 1.8mm;
}

.report-chart-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.report-record-list {
  position: absolute;
  left: ${CONTENT_X_MM}mm;
  top: 0;
  width: ${CONTENT_W_MM}mm;
  height: ${PAGE_H_MM}mm;
}

.report-record-card {
  position: absolute;
  left: 0;
  width: ${CONTENT_W_MM}mm;
  height: ${ROW_HEIGHT_MM}mm;
  background: #fff;
  border-radius: 4px;
  box-shadow: 1.3mm 1mm 0 rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.report-record-header {
  height: 5.7mm;
  background: ${COLORS.dark};
  color: #fff;
  padding: 0 4mm;
  display: flex;
  align-items: center;
  font-size: 3.1mm;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-record-body {
  position: relative;
  height: 14.1mm;
  padding: 1.6mm 4mm 0;
}

.report-record-table {
  width: calc(100% - 47mm);
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 1.9mm;
  color: ${COLORS.text};
}

.report-record-table td {
  border: 0.12mm solid ${COLORS.line};
  padding: 0.7mm 1mm;
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-record-table td:nth-child(odd) {
  background: #EAF5D7;
  font-weight: 700;
}

.report-record-badge {
  position: absolute;
  right: 4mm;
  top: 50%;
  transform: translateY(-50%);
  width: 34mm;
  height: 6.2mm;
  border-radius: 3mm;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 2.4mm;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.report-footer-note {
  position: absolute;
  left: ${CONTENT_X_MM}mm;
  top: 285mm;
  color: ${COLORS.dark};
  font-size: 2.54mm;
}

.report-appendix-title {
  position: absolute;
  left: ${APPENDIX_HEADER_X_MM}mm;
  top: ${APPENDIX_TITLE_TOP_MM}mm;
  margin: 0;
  color: ${COLORS.red};
  font-size: 4.65mm;
  font-weight: 700;
}

.report-appendix-meta {
  position: absolute;
  left: ${APPENDIX_HEADER_X_MM}mm;
  margin: 0;
  color: ${COLORS.muted};
  font-size: 2.89mm;
}

.report-appendix-meta--one {
  top: ${APPENDIX_META_ONE_TOP_MM}mm;
}

.report-appendix-meta--two {
  top: ${APPENDIX_META_TWO_TOP_MM}mm;
}
`;

function jsPdf() {
  return globalThis.jspdf?.jsPDF ?? globalThis.jsPDF;
}

function ensureHtml2Canvas() {
  const fn = globalThis.html2canvas;
  if (typeof fn !== "function") {
    throw new Error("O html2canvas nao foi carregado.");
  }
  return fn;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function svgAttr(value) {
  return escapeHtml(value).replace(/\"/g, "&quot;");
}

function svgAttrs(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, value]) => value != null && value !== false)
    .map(([name, value]) => `${name}="${svgAttr(value)}"`)
    .join(" ");
}

function svgTag(name, attrs = {}, content = "") {
  const attrText = svgAttrs(attrs);
  if (!content) {
    return `<${name}${attrText ? ` ${attrText}` : ""} />`;
  }
  return `<${name}${attrText ? ` ${attrText}` : ""}>${content}</${name}>`;
}

function waitForFrame() {
  return new Promise((resolve) => {
    const raf = globalThis.requestAnimationFrame ?? ((callback) => globalThis.setTimeout(callback, 16));
    raf(() => resolve());
  });
}

async function waitForImages(root) {
  const images = Array.from(root.querySelectorAll("img"));
  if (!images.length) {
    return;
  }
  await Promise.all(images.map(async (img) => {
    if (img.complete) {
      return;
    }
    if (typeof img.decode === "function") {
      try {
        await img.decode();
        return;
      } catch {
        return;
      }
    }
    await new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }));
}

function getCaptureScale(config) {
  const scale = Number(config?.report?.png_scale);
  if (Number.isFinite(scale) && scale > 0) {
    return scale;
  }
  const fallback = Number(globalThis.devicePixelRatio ?? 1);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 1;
}

function formatGeneratedAt(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function chunkRecords(records, chunkSize) {
  const output = [];
  for (let index = 0; index < records.length; index += chunkSize) {
    output.push(records.slice(index, index + chunkSize));
  }
  return output;
}

function overallBatchCompliant(records) {
  const states = records.map((record) => recordOverallCompliant(record)).filter((state) => state != null);
  return Boolean(states.length && states.every(Boolean));
}

function pickMaxRecord(records, selector) {
  let bestRecord = null;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const record of records) {
    const value = selector(record);
    if (value == null) {
      continue;
    }
    if (bestRecord == null || value > bestValue) {
      bestRecord = record;
      bestValue = value;
    }
  }
  return bestRecord;
}

function getMaxChannel(record) {
  let bestChannel = null;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const axis of CHANNEL_ORDER) {
    const channel = record?.channels?.[axis];
    const value = channel?.ppv_mm_s;
    if (value == null) {
      continue;
    }
    if (bestChannel == null || value > bestValue) {
      bestChannel = channel;
      bestValue = value;
    }
  }
  return bestChannel;
}

function ellipsis(text, maxChars) {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 3))}...`;
}

function titleCase(text) {
  return text
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s-])(\p{L})/gu, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("pt-BR")}`);
}

function chartLabel(text) {
  const source = String(text ?? "").trim();
  if (!source) {
    return "N/D";
  }
  const label = titleCase(source)
    .replace(/Comunidade De /g, "Com. ")
    .replace(/Barragem De /g, "Barr. ");
  return ellipsis(label, 18);
}

function chartLabelForRecord(record) {
  if (record?.sismogram_model === "geosonics" && record.serial_number) {
    return ellipsis(`Serial No: ${record.serial_number}`, 24);
  }
  return chartLabel(record?.location);
}

function frequencyValue(value) {
  if (value == null) {
    return 1;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) {
      return 1;
    }
    if (text.startsWith(">")) {
      return 100;
    }
    const parsed = Number(text.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 1;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 1;
}

function ppvForward(values) {
  const scalarInput = Number.isFinite(Number(values));
  const array = Array.isArray(values) ? values.map(Number) : [Number(values)];
  const floor = 0.05;
  const breakPoint = 0.1;
  const lowBand = 0.5;
  const offset = lowBand - breakPoint;
  const transformed = array.map((value) => {
    const safe = Math.max(value, floor);
    if (value <= breakPoint) {
      return lowBand * (Math.log(safe / floor) / Math.log(breakPoint / floor));
    }
    return value + offset;
  });
  return scalarInput ? transformed[0] : transformed;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function measureLabelBox(lines) {
  const widestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    boxWidth: Math.max(20, Math.min(50, (widestLine * 2.8) + 6)),
    boxHeight: lines.length > 1 ? 12 : 9,
  };
}

function rectFromCenter(centerX, centerY, boxWidth, boxHeight) {
  return {
    left: centerX - (boxWidth / 2),
    top: centerY - (boxHeight / 2),
    right: centerX + (boxWidth / 2),
    bottom: centerY + (boxHeight / 2),
  };
}

function rectsOverlap(left, right, padding = 0.008) {
  return !(
    (left.right + padding) <= right.left
    || (left.left - padding) >= right.right
    || (left.bottom + padding) <= right.top
    || (left.top - padding) >= right.bottom
  );
}

function rectIntersectionArea(left, right) {
  if (!rectsOverlap(left, right, 0)) {
    return 0;
  }

  const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const height = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return width * height;
}

function rectDistance(left, right) {
  const horizontalGap = Math.max(left.left - right.right, right.left - left.right, 0);
  const verticalGap = Math.max(left.top - right.bottom, right.top - left.bottom, 0);
  return Math.hypot(horizontalGap, verticalGap);
}

function distancePointToRect(pointX, pointY, rect) {
  const dx = Math.max(rect.left - pointX, 0, pointX - rect.right);
  const dy = Math.max(rect.top - pointY, 0, pointY - rect.bottom);
  return Math.hypot(dx, dy);
}

function connectorPointToRect(pointX, pointY, rect) {
  const centerX = (rect.left + rect.right) / 2;
  const centerY = (rect.top + rect.bottom) / 2;
  const vx = pointX - centerX;
  const vy = pointY - centerY;
  const halfWidth = Math.max((rect.right - rect.left) / 2, 0.0001);
  const halfHeight = Math.max((rect.bottom - rect.top) / 2, 0.0001);
  const scale = 1 / Math.max(Math.abs(vx) / halfWidth, Math.abs(vy) / halfHeight, 0.0001);

  return {
    x: centerX + (vx * scale),
    y: centerY + (vy * scale),
  };
}

function buildLabelCandidates(pointX, pointY, boxWidthFrac, boxHeightFrac, index) {
  const horizontalBias = pointX <= 0.5 ? 1 : -1;
  const verticalBias = pointY <= 0.5 ? 1 : -1;
  const directions = [
    { dx: horizontalBias, dy: verticalBias },
    { dx: horizontalBias, dy: 0 },
    { dx: 0, dy: verticalBias },
    { dx: horizontalBias, dy: -verticalBias },
    { dx: -horizontalBias, dy: verticalBias },
    { dx: -horizontalBias, dy: 0 },
    { dx: 0, dy: -verticalBias },
    { dx: -horizontalBias, dy: -verticalBias },
  ];
  const tiers = [1, 1.45, 2.0];
  const offsetXStep = Math.max(0.008, boxWidthFrac * 0.05);
  const offsetYStep = Math.max(0.008, boxHeightFrac * 0.05);
  const candidates = [];

  tiers.forEach((tier) => {
    const gapX = Math.max(0.02, boxWidthFrac * 0.22) * tier;
    const gapY = Math.max(0.02, boxHeightFrac * 0.34) * tier;

    directions.forEach((direction) => {
      const offsetX = direction.dx === 0
        ? (((index % 2) === 0 ? -1 : 1) * offsetXStep * tier)
        : direction.dx * ((boxWidthFrac / 2) + gapX);
      const offsetY = direction.dy === 0
        ? ((((index % 3) - 1) * offsetYStep) * tier)
        : direction.dy * ((boxHeightFrac / 2) + gapY);

      candidates.push({
        x: pointX + offsetX,
        y: pointY + offsetY,
      });
    });
  });

  return candidates;
}

function placeChartLabels(labelSpecs) {
  const ordered = [...labelSpecs].sort((left, right) => (
    (right.boxWidthFrac * right.boxHeightFrac) - (left.boxWidthFrac * left.boxHeightFrac)
    || left.index - right.index
  ));
  const placed = [];

  ordered.forEach((spec) => {
    const candidates = buildLabelCandidates(spec.pointXFrac, spec.pointYFrac, spec.boxWidthFrac, spec.boxHeightFrac, spec.index);
    const minCenterX = (spec.boxWidthFrac / 2) + 0.015;
    const maxCenterX = 1 - minCenterX;
    const minCenterY = (spec.boxHeightFrac / 2) + 0.015;
    const maxCenterY = 1 - minCenterY;
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    candidates.forEach((candidate) => {
      const centerX = clamp(candidate.x, minCenterX, maxCenterX);
      const centerY = clamp(candidate.y, minCenterY, maxCenterY);
      const rect = rectFromCenter(centerX, centerY, spec.boxWidthFrac, spec.boxHeightFrac);
      const pointDistance = distancePointToRect(spec.pointXFrac, spec.pointYFrac, rect);

      if (pointDistance < spec.minPointGap) {
        return;
      }

      const overlapArea = placed.reduce((sum, item) => sum + rectIntersectionArea(rect, item.rect), 0);
      const overlapCount = placed.reduce((count, item) => count + (rectsOverlap(rect, item.rect) ? 1 : 0), 0);
      const desiredGap = Math.max(0.022, spec.boxHeightFrac * 0.55);
      const proximityPenalty = placed.reduce((sum, item) => {
        const gap = rectDistance(rect, item.rect);
        return sum + (Math.max(0, desiredGap - gap) * 3500);
      }, 0);
      const distance = Math.hypot(centerX - spec.pointXFrac, centerY - spec.pointYFrac);
      const edgeDistance = Math.min(centerX - minCenterX, maxCenterX - centerX, centerY - minCenterY, maxCenterY - centerY);
      const score = (overlapCount * 1000) + (overlapArea * 5000) + proximityPenalty + (distance * 100) - (edgeDistance * 2);

      if (score < bestScore) {
        best = { centerX, centerY, rect };
        bestScore = score;
      }
    });

    if (!best) {
      const fallbackX = clamp(spec.pointXFrac + (spec.pointXFrac < 0.5 ? 0.08 : -0.08), minCenterX, maxCenterX);
      const fallbackY = clamp(spec.pointYFrac + (spec.pointYFrac < 0.5 ? 0.08 : -0.08), minCenterY, maxCenterY);
      best = {
        centerX: fallbackX,
        centerY: fallbackY,
        rect: rectFromCenter(fallbackX, fallbackY, spec.boxWidthFrac, spec.boxHeightFrac),
      };
    }

    const connector = connectorPointToRect(spec.pointXFrac, spec.pointYFrac, best.rect);
    placed.push({
      ...spec,
      xFrac: best.centerX,
      yFrac: best.centerY,
      connectorXFrac: connector.x,
      connectorYFrac: connector.y,
      rect: best.rect,
    });
  });

  return placed.sort((left, right) => left.index - right.index);
}

function psplLabelPositions(points, axisMax, layout = {}) {
  if (!points.length) {
    return [];
  }

  const plotWidth = layout.plotWidth ?? 320;
  const plotHeight = layout.plotHeight ?? 168;
  const sortedPoints = [...points].sort((left, right) => left.distance - right.distance);
  const safeAxisMax = Math.max(axisMax, 1);

  const labelSpecs = sortedPoints.map((point, index) => {
    const lines = [point.label, `${formatPspl(point.pspl)} dB`];
    const { boxWidth, boxHeight } = measureLabelBox(lines);
    return {
      index,
      pointXFrac: clamp(point.distance / safeAxisMax, 0.06, 0.94),
      pointYFrac: clamp(1 - (point.pspl / 160), 0.08, 0.92),
      boxWidth,
      boxHeight,
      boxWidthFrac: boxWidth / Math.max(plotWidth, 1),
      boxHeightFrac: boxHeight / Math.max(plotHeight, 1),
      lines,
      color: point.color,
      label: point.label,
      pspl: point.pspl,
      distance: point.distance,
      minPointGap: Math.max(0.012, 4.2 / Math.max(Math.min(plotWidth, plotHeight), 1)),
    };
  });

  return placeChartLabels(labelSpecs);
}

function ppvLabelPositions(points, layout = {}) {
  if (!points.length) {
    return [];
  }

  const plotWidth = layout.plotWidth ?? 320;
  const plotHeight = layout.plotHeight ?? 168;
  const sortedPoints = [...points].sort((left, right) => left.freq - right.freq);
  const logMin = Math.log10(1);
  const logMax = Math.log10(1000);
  const yMax = ppvForward(60);

  const labelSpecs = sortedPoints.map((point, index) => {
    const lines = [point.label];
    const { boxWidth, boxHeight } = measureLabelBox(lines);
    return {
      index,
      pointXFrac: clamp((Math.log10(Math.max(point.freq, 1)) - logMin) / (logMax - logMin), 0.06, 0.94),
      pointYFrac: clamp(1 - (ppvForward(point.ppv) / yMax), 0.08, 0.92),
      boxWidth,
      boxHeight,
      boxWidthFrac: boxWidth / Math.max(plotWidth, 1),
      boxHeightFrac: boxHeight / Math.max(plotHeight, 1),
      lines,
      color: point.color,
      label: point.label,
      freq: point.freq,
      ppv: point.ppv,
      minPointGap: Math.max(0.012, 4.2 / Math.max(Math.min(plotWidth, plotHeight), 1)),
    };
  });

  return placeChartLabels(labelSpecs);
}

function hexagonPoints(centerX, centerY, radius) {
  const points = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 180) * (60 * index - 30);
    const x = centerX + (radius * Math.cos(angle));
    const y = centerY + (radius * Math.sin(angle));
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

function buildCornerMotifSvg() {
  return `
    <svg class="report-corner" viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="#2A2F46" stroke-width="0.65" opacity="0.95">
        <polygon points="${hexagonPoints(10, 10, 5.4)}"></polygon>
        <polygon points="${hexagonPoints(10, 10, 6.35)}" stroke-width="0.5"></polygon>
      </g>
    </svg>
  `;
}

function svgText(x, y, text, attrs = {}) {
  return svgTag("text", {
    x,
    y,
    "text-rendering": "geometricPrecision",
    "letter-spacing": "0.001em",
    "word-spacing": "0.001em",
    ...attrs
  }, escapeHtml(text));
}

function svgLine(x1, y1, x2, y2, attrs = {}) {
  return svgTag("line", { x1, y1, x2, y2, ...attrs });
}

function svgRect(x, y, width, height, attrs = {}) {
  return svgTag("rect", { x, y, width, height, ...attrs });
}

function svgCircle(cx, cy, radius, attrs = {}) {
  return svgTag("circle", { cx, cy, r: radius, ...attrs });
}

function svgPolygon(points, attrs = {}) {
  return svgTag("polygon", { points, ...attrs });
}

function buildLabelBoxSvg(x, y, text, color, metrics = null) {
  const lines = Array.isArray(text) ? text.map((line) => String(line)) : String(text).split(/\n/);
  const { boxWidth, boxHeight } = metrics ?? measureLabelBox(lines);
  const left = x - (boxWidth / 2);
  const top = y - (boxHeight / 2);
  const textLines = lines.map((line, index) => {
    const lineOffset = lines.length === 1 ? 0 : (index === 0 ? -2.0 : 2.5);
    return svgText(x, y + lineOffset, line, {
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-size": 4.5,
      fill: color,
      "font-family": "Helvetica, Arial, sans-serif",
    });
  }).join("");

  return `
    ${svgRect(left, top, boxWidth, boxHeight, {
      rx: 2,
      ry: 2,
      fill: COLORS.chartWhite,
      stroke: color,
      "stroke-width": 0.8,
      opacity: 0.96,
    })}
    ${textLines}
  `;
}

function buildMarkerSvg(kind, x, y, size, color) {
  if (kind === "s") {
    return svgRect(x - size, y - size, size * 2, size * 2, {
      fill: color,
      stroke: COLORS.chartWhite,
      "stroke-width": 0.8,
    });
  }
  if (kind === "^") {
    return svgPolygon(`${(x).toFixed(2)},${(y - size).toFixed(2)} ${(x - size).toFixed(2)},${(y + size).toFixed(2)} ${(x + size).toFixed(2)},${(y + size).toFixed(2)}`, {
      fill: color,
      stroke: COLORS.chartWhite,
      "stroke-width": 0.8,
    });
  }
  return svgCircle(x, y, size, {
    fill: color,
    stroke: COLORS.chartWhite,
    "stroke-width": 0.8,
  });
}

function buildPsplChartSvg(records) {
  const width = CHART_SVG_W;
  const height = CHART_SVG_H;
  const margin = { left: 30, right: 10, top: 20, bottom: 22 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const knownDistances = records.map((record) => record.distance_m).filter((value) => value != null);
  const xLimit = Math.max(6000, Math.ceil((Math.max(...knownDistances, 0) / 1000)) * 1000 || 0);
  const ndPosition = xLimit + 650;
  const axisMax = ndPosition + 500;

  const xTickValues = [];
  for (let value = 0; value <= xLimit; value += 1000) {
    xTickValues.push(value);
  }
  xTickValues.push(ndPosition);

  const xTickLabels = xTickValues.map((value) => (value === ndPosition ? "N/D" : String(value)));
  const yTickValues = [0, 20, 40, 60, 80, 100, 120, 140, 160];

  const xPos = (value) => margin.left + ((value / axisMax) * plotWidth);
  const yPos = (value) => margin.top + plotHeight - ((value / 160) * plotHeight);
  const limitY = yPos(134);

  const displayPoints = [];
  records.forEach((record, recordIndex) => {
    if (record.pspl_db_l == null) {
      return;
    }
    const markerTypes = ["o", "s", "^"];
    const colors = [COLORS.chartBrown, COLORS.chartBlue, COLORS.green];
    const distance = record.distance_m ?? ndPosition;
    displayPoints.push({
      distance,
      value: record.pspl_db_l,
      label: chartLabelForRecord(record),
      color: colors[recordIndex % colors.length],
      marker: markerTypes[recordIndex % markerTypes.length],
    });
  });

  const labels = psplLabelPositions(displayPoints.map((point) => ({
    distance: point.distance,
    pspl: point.value,
    label: point.label,
    color: point.color,
  })), axisMax, { plotWidth, plotHeight });

  const gridLines = [
    ...xTickValues.map((value) => svgLine(xPos(value), margin.top, xPos(value), margin.top + plotHeight, {
      stroke: COLORS.chartGrid,
      "stroke-dasharray": "1 2",
      "stroke-width": 0.6,
    })),
    ...yTickValues.map((value) => svgLine(margin.left, yPos(value), margin.left + plotWidth, yPos(value), {
      stroke: COLORS.chartGrid,
      "stroke-dasharray": "1 2",
      "stroke-width": 0.6,
    })),
  ].join("");

  const tickLabels = xTickValues.map((value, index) => svgText(xPos(value), height - 8, xTickLabels[index], {
    "text-anchor": "middle",
    "dominant-baseline": "middle",
    "font-size": 5.8,
    fill: COLORS.chartAxis,
    "font-family": "Helvetica, Arial, sans-serif",
  })).join("");

  const yTickLabels = yTickValues.map((value) => {
    const label = String(value);
    if (value !== 0 && value !== 20 && value !== 40 && value !== 60 && value !== 80 && value !== 100 && value !== 120 && value !== 140 && value !== 160) {
      return "";
    }
    return svgText(22, yPos(value), label, {
      "text-anchor": "end",
      "dominant-baseline": "middle",
      "font-size": 5.8,
      fill: COLORS.chartAxis,
      "font-family": "Helvetica, Arial, sans-serif",
    });
  }).join("");

  const pointMarkup = displayPoints.map((point) => {
    const x = xPos(point.distance);
    const y = yPos(point.value);
    const marker = buildMarkerSvg(point.marker, x, y, 4.2, point.color);
    return marker;
  }).join("");

  const labelMarkup = labels.map((label) => {
    const x = margin.left + (label.pointXFrac * plotWidth);
    const y = margin.top + (label.pointYFrac * plotHeight);
    const labelX = margin.left + (label.xFrac * plotWidth);
    const labelY = margin.top + (label.yFrac * plotHeight);
    return `
      ${svgLine(x, y, margin.left + (label.connectorXFrac * plotWidth), margin.top + (label.connectorYFrac * plotHeight), {
        stroke: label.color,
        "stroke-width": 0.7,
      })}
      ${buildLabelBoxSvg(labelX, labelY, label.lines, label.color, label)}
    `;
  }).join("");

  const limitBoxLeft = Math.max(margin.left + 4, margin.left + (plotWidth * 0.02));
  const limitBoxRight = Math.min(width - margin.right - 18, margin.left + (plotWidth * 0.97));

  return `
    <svg class="report-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="Pressão Sonora x Distância - ABNT NBR 9653:2018">
      ${svgRect(0, 0, width, height, { fill: COLORS.chartWhite })}
      ${svgText(width / 2, 11, "Pressão Sonora x Distância - ABNT NBR 9653:2018", {
        "text-anchor": "middle",
        "font-size": 6.4,
        fill: "#7A7A7A",
        "font-family": "Helvetica, Arial, sans-serif",
      })}
      ${gridLines}
      ${svgLine(margin.left, margin.top, margin.left, margin.top + plotHeight, {
        stroke: COLORS.chartAxis,
        "stroke-width": 0.8,
      })}
      ${svgLine(margin.left, margin.top + plotHeight, margin.left + plotWidth, margin.top + plotHeight, {
        stroke: COLORS.chartAxis,
        "stroke-width": 0.8,
      })}
      ${svgLine(margin.left, limitY, margin.left + plotWidth, limitY, {
        stroke: COLORS.chartBrown,
        "stroke-width": 1.4,
      })}
      ${svgRect(limitBoxLeft - 10, limitY - 5.4, 18, 11, {
        fill: COLORS.chartWhite,
        stroke: "#111111",
        "stroke-width": 0.6,
      })}
      ${svgText(limitBoxLeft - 1, limitY, "134", {
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-size": 5.8,
        fill: "#666666",
        "font-family": "Helvetica, Arial, sans-serif",
      })}
      ${svgRect(limitBoxRight - 10, limitY - 5.4, 18, 11, {
        fill: COLORS.chartWhite,
        stroke: "#111111",
        "stroke-width": 0.6,
      })}
      ${svgText(limitBoxRight - 1, limitY, "134", {
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-size": 5.8,
        fill: "#666666",
        "font-family": "Helvetica, Arial, sans-serif",
      })}
      ${pointMarkup}
      ${labelMarkup}
      ${tickLabels}
      ${yTickLabels}
      ${svgText(width - 14, height - 6, "N/D = sem distancia no PDF", {
        "text-anchor": "end",
        "dominant-baseline": "middle",
        "font-size": 4.6,
        fill: COLORS.chartAxis,
        "font-family": "Helvetica, Arial, sans-serif",
      })}
      ${svgText(14, height / 2, "Pressão Acústica (dB)", {
        transform: `rotate(-90 14 ${height / 2})`,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-size": 6.0,
        fill: COLORS.chartAxis,
        "font-family": "Helvetica, Arial, sans-serif",
      })}
      ${svgText(width / 2, height - 2, "Distância (m)", {
        "text-anchor": "middle",
        "dominant-baseline": "hanging",
        "font-size": 6.0,
        fill: COLORS.chartAxis,
        "font-family": "Helvetica, Arial, sans-serif",
      })}
    </svg>
  `;
}

function buildPpvChartSvg(records) {
  const width = CHART_SVG_W;
  const height = CHART_SVG_H;
  const margin = { left: 30, right: 12, top: 18, bottom: 26 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const xTickValues = [1, 4, 10, 15, 40, 100, 1000];
  const yTickValues = [0.05, 0.1, 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const curveX = [4, 15, 40, 1000];
  const curveY = [15, 20, 50, 50];
  const markerTypes = ["o", "s", "^"];
  const markerColors = [COLORS.chartBrown, COLORS.chartBlue, COLORS.green];

  const xPos = (value) => {
    const logMin = Math.log10(1);
    const logMax = Math.log10(1000);
    const normalized = (Math.log10(Math.max(value, 1)) - logMin) / (logMax - logMin);
    return margin.left + (normalized * plotWidth);
  };

  const yForward = (value) => {
    const floor = 0.05;
    const breakPoint = 0.1;
    const lowBand = 0.5;
    const offset = lowBand - breakPoint;
    if (value <= breakPoint) {
      const safe = Math.max(value, floor);
      return lowBand * (Math.log(safe / floor) / Math.log(breakPoint / floor));
    }
    return value + offset;
  };

  const yMax = yForward(60);
  const yPos = (value) => margin.top + plotHeight - ((yForward(value) / yMax) * plotHeight);

  const plottedPoints = [];
  records.forEach((record, index) => {
    const bestChannel = getMaxChannel(record);
    const freq = frequencyValue(bestChannel?.zc_freq_hz);
    const ppv = Math.max(bestChannel?.ppv_mm_s ?? 0.05, 0.05);
    plottedPoints.push({
      freq,
      ppv,
      label: chartLabelForRecord(record),
      color: markerColors[index % markerColors.length],
      marker: markerTypes[index % markerTypes.length],
    });
  });

  const labels = ppvLabelPositions(plottedPoints, { plotWidth, plotHeight });

  const gridLines = [
    ...xTickValues.map((value) => svgLine(xPos(value), margin.top, xPos(value), margin.top + plotHeight, {
      stroke: COLORS.chartGrid,
      "stroke-dasharray": "1 2",
      "stroke-width": 0.6,
    })),
    ...yTickValues.map((value) => svgLine(margin.left, yPos(value), margin.left + plotWidth, yPos(value), {
      stroke: COLORS.chartGrid,
      "stroke-dasharray": "1 2",
      "stroke-width": 0.6,
    })),
  ].join("");

  const tickLabels = xTickValues.map((value) => svgText(xPos(value), height - 8, String(value), {
    "text-anchor": "middle",
    "dominant-baseline": "middle",
    "font-size": 5.8,
    fill: COLORS.chartAxis,
    "font-family": "Helvetica, Arial, sans-serif",
  })).join("");

  const yTickLabels = yTickValues.map((value) => {
    let text = "";
    if (Math.abs(value - 0.05) < 0.0001) {
      text = "0,05";
    } else if (Math.abs(value - 0.1) < 0.0001) {
      text = "0,1";
    } else {
      const rounded = Math.round(value);
      text = String(rounded);
    }
    return svgText(22, yPos(value), text, {
      "text-anchor": "end",
      "dominant-baseline": "middle",
      "font-size": 5.8,
      fill: COLORS.chartAxis,
      "font-family": "Helvetica, Arial, sans-serif",
    });
  }).join("");

  const curve = curveX.map((value, index) => `${xPos(value).toFixed(2)},${yPos(curveY[index]).toFixed(2)}`).join(" ");
  const curveMarkup = svgTag("polyline", { points: curve, fill: "none", stroke: COLORS.red, "stroke-width": 1.8 });

  const guides = [4, 15, 40].map((value) => svgLine(xPos(value), margin.top, xPos(value), margin.top + plotHeight, {
    stroke: COLORS.red,
    "stroke-width": 0.8,
    "stroke-dasharray": "3 3",
    opacity: 0.35,
  })).join("");

  const horizontalGuides = [15, 20, 50].map((value) => svgLine(margin.left, yPos(value), margin.left + plotWidth, yPos(value), {
    stroke: COLORS.red,
    "stroke-width": 0.8,
    "stroke-dasharray": "3 3",
    opacity: 0.25,
  })).join("");

  const pointMarkup = plottedPoints.map((point) => buildMarkerSvg(point.marker, xPos(point.freq), yPos(point.ppv), 4.2, point.color)).join("");

  const labelMarkup = labels.map((label) => {
    const x = margin.left + (label.pointXFrac * plotWidth);
    const y = margin.top + (label.pointYFrac * plotHeight);
    const labelX = margin.left + (label.xFrac * plotWidth);
    const labelY = margin.top + (label.yFrac * plotHeight);
    return `
      ${svgLine(x, y, margin.left + (label.connectorXFrac * plotWidth), margin.top + (label.connectorYFrac * plotHeight), {
        stroke: label.color,
        "stroke-width": 0.7,
      })}
      ${buildLabelBoxSvg(labelX, labelY, label.lines, label.color, label)}
    `;
  }).join("");

  const limitLabelX = width - 12;
  const limitLabelY = 52;

  return `
    <svg class="report-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="PPV x Limite ABNT">
      ${svgRect(0, 0, width, height, { fill: COLORS.chartWhite })}
      ${gridLines}
      ${guides}
      ${horizontalGuides}
      ${svgLine(margin.left, margin.top, margin.left, margin.top + plotHeight, {
        stroke: COLORS.chartAxis,
        "stroke-width": 0.8,
      })}
      ${svgLine(margin.left, margin.top + plotHeight, margin.left + plotWidth, margin.top + plotHeight, {
        stroke: COLORS.chartAxis,
        "stroke-width": 0.8,
      })}
      ${curveMarkup}
      ${pointMarkup}
      ${labelMarkup}
      ${tickLabels}
      ${yTickLabels}
      ${svgText(limitLabelX, limitLabelY, "Limite ABNT", {
        "text-anchor": "end",
        "font-size": 5.4,
        fill: COLORS.red,
        "font-family": "Helvetica, Arial, sans-serif",
      })}
      ${svgText(width / 2, height - 2, "Frequência (Hz)", {
        "text-anchor": "middle",
        "dominant-baseline": "hanging",
        "font-size": 5.9,
        fill: COLORS.chartAxis,
        "font-family": "Helvetica, Arial, sans-serif",
      })}
      ${svgText(14, height / 2, "PPV (mm/s)", {
        transform: `rotate(-90 14 ${height / 2})`,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-size": 5.9,
        fill: COLORS.chartAxis,
        "font-family": "Helvetica, Arial, sans-serif",
      })}
    </svg>
  `;
}

function buildReportChrome(logoDataUrl) {
  const logo = logoDataUrl ? `<img class="report-logo" src="${escapeHtml(logoDataUrl)}" alt="Logotipo da Enaex">` : "";
  return `
    <div class="report-topline"></div>
    ${logo}
    ${buildCornerMotifSvg().replace('class="report-corner"', 'class="report-corner report-corner--topright"')}
    ${buildCornerMotifSvg().replace('class="report-corner"', 'class="report-corner report-corner--bottomleft"')}
    <div class="report-dna-badge" aria-hidden="true">
      <span class="report-dna-badge__dna">DNA</span>
      <span class="report-dna-badge__dot">•</span>
      <span>ENAEX</span>
    </div>
  `;
}

function buildSummaryBox(records, threshold) {
  const lines = [
    `Data do evento: ${getDateRange(records)}`,
    `Cliente: ${getPrimaryClient(records)}`,
    `Pontos monitorados: ${records.length} fontes de dados de sismógrafos de engenharia processadas com sucesso.`,
  ];

  if (records.length) {
    lines.push(
      anyRecordHasVibrationAlert(records, threshold)
        ? `⚠️ Índices de vibração: acima de ${formatDecimal(threshold, 1)} mm/s.`
        : `✅ Índices de vibração: abaixo de ${formatDecimal(threshold, 1)} mm/s.`,
    );
  }

  const lineMarkup = lines.map((line) => {
    const tone = line.startsWith("⚠️") ? "report-box-line--warning" : line.startsWith("✅") ? "report-box-line--success" : "";
    return `<div class="report-box-line ${tone}">${escapeHtml(line)}</div>`;
  }).join("");

  return `
    <section class="report-box" style="top: ${COVER_SCOPE_TOP_MM}mm; height: 23mm;">
      <div class="report-box-strip" style="background: ${COLORS.green};"></div>
      <div class="report-box-title">Escopo da Campanha</div>
      <div class="report-box-body">
        ${lineMarkup}
      </div>
    </section>
  `;
}

function buildConclusionBox(records) {
  const batchCompliant = overallBatchCompliant(records);
  const accent = batchCompliant ? COLORS.green : COLORS.red;
  const complianceText = batchCompliant
    ? "Todos os pontos abaixo dos limites da ABNT NBR 9653:2018."
    : "Ocorrência com necessidade de verificação manual frente à ABNT NBR 9653:2018.";

  const highestPspl = pickMaxRecord(records, (record) => record.pspl_db_l);
  const highestPpv = pickMaxRecord(records, (record) => getMaxChannel(record)?.ppv_mm_s);
  const highestPvs = pickMaxRecord(records, (record) => record.peak_vector_sum_mm_s);

  const highestPpvChannel = highestPpv ? getMaxChannel(highestPpv) : null;
  const rows = [
    ["Conformidade", complianceText],
    [
      "Maior PSPL",
      `${formatPspl(highestPspl?.pspl_db_l)} dB(L) | ${highestPspl?.location ?? "N/D"}`,
    ],
    [
      "Maior PPV",
      `${formatMmS(highestPpvChannel?.ppv_mm_s)} mm/s | ${highestPpv?.location ?? "N/D"}`,
    ],
    [
      "Maior PVS",
      `${formatMmS(highestPvs?.peak_vector_sum_mm_s)} mm/s | ${highestPvs?.location ?? "N/D"}`,
    ],
  ];

  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td>${escapeHtml(label)}</td>
      <td>${escapeHtml(value)}</td>
    </tr>
  `).join("");

  return `
    <section class="report-box" style="top: ${COVER_CONCLUSION_TOP_MM}mm; height: 24mm;">
      <div class="report-box-strip" style="background: ${accent};"></div>
      <div class="report-box-title">Conclusão Técnica</div>
      <div class="report-box-body">
        <table class="report-conclusion-table">
          <colgroup>
            <col style="width: 31mm;">
            <col>
          </colgroup>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function buildChartPanel(title, svgMarkup) {
  return `
    <article class="report-chart-panel">
      <div class="report-chart-strip"></div>
      <div class="report-chart-title">${escapeHtml(title)}</div>
      <div class="report-chart-body">
        ${svgMarkup}
      </div>
    </article>
  `;
}

function buildRecordTable(record) {
  const getChannel = (axis) => record?.channels?.[axis] ?? { axis };
  const tran = getChannel("Tran");
  const vert = getChannel("Vert");
  const long = getChannel("Long");

  return `
    <table class="report-record-table">
      <colgroup>
        <col style="width: 14mm;">
        <col style="width: 26mm;">
        <col style="width: 12mm;">
        <col style="width: 24mm;">
        <col style="width: 22mm;">
        <col>
      </colgroup>
      <tbody>
        <tr>
          <td>Data</td>
          <td>${escapeHtml(formatDateBr(record.event_date))}</td>
          <td>PSPL</td>
          <td>${escapeHtml(`${formatPspl(record.pspl_db_l)} dB(L)`)}</td>
          <td>Mic</td>
          <td>${escapeHtml(`${formatMicrophoneFrequency(record.microphone_zc_freq_hz)} Hz`)}</td>
        </tr>
        <tr>
          <td>PVS</td>
          <td>${escapeHtml(`${formatMmS(record.peak_vector_sum_mm_s)} mm/s`)}</td>
          <td>SD</td>
          <td>${escapeHtml(formatDistance(record.scaled_distance))}</td>
          <td>Dist / Carga</td>
          <td>${escapeHtml(`${formatDistance(record.distance_m)} m | ${formatCharge(record.charge_kg)} kg`)}</td>
        </tr>
        <tr>
          <td>Tran</td>
          <td>${escapeHtml(`${formatMmS(tran.ppv_mm_s)} mm/s | ${formatFrequency(tran.zc_freq_hz)} Hz`)}</td>
          <td>Vert</td>
          <td>${escapeHtml(`${formatMmS(vert.ppv_mm_s)} mm/s | ${formatFrequency(vert.zc_freq_hz)} Hz`)}</td>
          <td>Long</td>
          <td>${escapeHtml(`${formatMmS(long.ppv_mm_s)} mm/s | ${formatFrequency(long.zc_freq_hz)} Hz`)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function buildRecordCard(record, topMm, badgeTone) {
  const compliant = recordOverallCompliant(record) === true;
  const badgeLabel = compliant ? "CONFORME ABNT" : "VERIFICAR";
  const tone = compliant ? COLORS.green : COLORS.red;

  return `
    <section class="report-record-card" style="top: ${topMm}mm;">
      <div class="report-record-header">${escapeHtml(record.location ?? "N/D")}</div>
      <div class="report-record-body">
        ${buildRecordTable(record)}
        <div class="report-record-badge" style="background: ${badgeTone ?? tone};">${escapeHtml(badgeLabel)}</div>
      </div>
    </section>
  `;
}

function buildCoverPage(records, threshold, summaryLimit, logoDataUrl) {
  const summaryRecords = records.slice(0, summaryLimit);
  const chartPspl = buildPsplChartSvg(records);
  const chartPpv = buildPpvChartSvg(records);
  const rowsMarkup = summaryRecords.map((record, index) => {
    const topMm = COVER_ROW_BASE_TOP_MM + (index * ROW_STEP_MM);
    return buildRecordCard(record, topMm);
  }).join("");

  return `
    <div class="report-page" data-report-page="cover">
      ${buildReportChrome(logoDataUrl)}
      <section class="report-title-card">
        <div class="report-title-strip"></div>
        <div class="report-title-body">
          <div class="report-title-text">MONITORAMENTO SISMOGRÁFICO</div>
          <div class="report-title-client">${escapeHtml(getPrimaryClient(records))}</div>
          <div class="report-title-footer">${escapeHtml(`${records.length} ponto(s)`)}</div>
        </div>
      </section>

      <h2 class="report-heading report-heading--summary">Resumo Executivo</h2>
      ${buildSummaryBox(records, threshold)}
      ${buildConclusionBox(records)}

      <section class="report-chart-row">
        ${buildChartPanel("Pressão Sonora x Distância", chartPspl)}
        ${buildChartPanel("PPV x Limite ABNT", chartPpv)}
      </section>

      <h2 class="report-heading report-heading--records">Pontos Monitorados</h2>
      <div class="report-record-list">
        ${rowsMarkup}
      </div>

      <div class="report-footer-note">Base normativa: ABNT NBR 9653:2018.</div>
    </div>
  `;
}

function buildAppendixPage(pageRecords, pageIndex, totalAppendixPages, totalRecords, generatedAt, logoDataUrl) {
  const rowsMarkup = pageRecords.map((record, index) => {
    const topMm = APPENDIX_ROW_BASE_TOP_MM + (index * ROW_STEP_MM);
    return buildRecordCard(record, topMm);
  }).join("");

  return `
    <div class="report-page" data-report-page="appendix">
      ${buildReportChrome(logoDataUrl)}
      <h2 class="report-appendix-title">REGISTROS COMPLEMENTARES</h2>
      <div class="report-appendix-meta report-appendix-meta--one">Página ${pageIndex + 2} de ${totalAppendixPages + 1} | ${pageRecords.length} sismograma(s) nesta página</div>
      <div class="report-appendix-meta report-appendix-meta--two">Total processado: ${totalRecords} sismograma(s) | Gerado em ${escapeHtml(formatGeneratedAt(generatedAt))}</div>

      <div class="report-record-list">
        ${rowsMarkup}
      </div>

      <div class="report-footer-note">Continuação do resumo executivo.</div>
    </div>
  `;
}

function buildReportMarkup(records, config, logoDataUrl, generatedAt) {
  const threshold = config?.report?.vibration_alert_threshold_mm_s ?? 0.8;
  const summaryLimit = config?.report?.summary_record_limit ?? 3;
  const appendixChunks = chunkRecords(records.slice(summaryLimit), APPENDIX_ROWS_PER_PAGE);

  const pages = [buildCoverPage(records, threshold, summaryLimit, logoDataUrl)];
  appendixChunks.forEach((pageRecords, pageIndex) => {
    pages.push(buildAppendixPage(pageRecords, pageIndex, appendixChunks.length, records.length, generatedAt, logoDataUrl));
  });

  return pages.join("");
}

function mountReportRoot(records, config, logoDataUrl, generatedAt) {
  const root = document.createElement("div");
  root.className = "report-render-root";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<style>${REPORT_STYLES}</style>${buildReportMarkup(records, config, logoDataUrl, generatedAt)}`;
  document.body.appendChild(root);
  return root;
}

export async function buildReportBlob(records, config, logoDataUrl) {
  const generatedAt = new Date();
  const PDF = jsPdf();
  const doc = new PDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setProperties({
    title: "Relatório OnePage de Monitoramento Sismográfico - Enaex",
    subject: "Sismogramas processados no navegador",
    author: "Report Sismografia Enaex",
    creator: "GitHub Pages",
  });

  const captureScale = getCaptureScale(config);
  const html2canvas = ensureHtml2Canvas();
  const root = mountReportRoot(records, config, logoDataUrl, generatedAt);
  const pages = Array.from(root.querySelectorAll(".report-page"));

  try {
    await waitForImages(root);
    await waitForFrame();
    await waitForFrame();

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const canvas = await html2canvas(page, {
        scale: captureScale,
        backgroundColor: COLORS.light,
        useCORS: true,
        allowTaint: false,
        scrollX: 0,
        scrollY: 0,
      });

      if (index > 0) {
        doc.addPage();
      }
      doc.addImage(canvas, "PNG", 0, 0, PAGE_W_MM, PAGE_H_MM, undefined, "FAST");
    }

    return {
      blob: doc.output("blob"),
      filename: buildReportFilename(records, generatedAt),
      generatedAt,
      eventSlug: buildEventSlug(records, generatedAt),
    };
  } finally {
    root.remove();
  }
}

export { chartLabelForRecord, psplLabelPositions, ppvLabelPositions };
