import { collectSismogramsFromFiles } from "./parser.js";
import {
  anyRecordHasVibrationAlert,
  formatDateBr,
  formatDecimal,
  formatFrequency,
  formatMmS,
  formatPspl,
  formatRecordCompliance,
  formatVibrationStatus,
  getDateRange,
  getPrimaryClient,
  recordOverallCompliant,
  CHANNEL_ORDER,
} from "./utils.js";
import { buildReportBlob } from "./report.js";

const DEFAULT_CONFIG = {
  system: {
    name: "Report Sismografia Enaex",
    version: "1.0.0",
  },
  paths: {
    logo_path: "ICONE/Enaex Stronger Bonds Logo.png",
  },
  report: {
    summary_record_limit: 3,
    vibration_alert_threshold_mm_s: 0.8,
  },
};

const state = {
  config: DEFAULT_CONFIG,
  configSource: "local",
  logoDataUrl: null,
  records: [],
  report: null,
  reportUrl: null,
  busy: false,
};

const elements = {};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function init() {
  cacheElements();
  bindEvents();

  try {
    const loadedConfig = await loadConfig();
    state.config = loadedConfig.config;
    state.configSource = loadedConfig.source;
    updateConfigBadge();
    state.logoDataUrl = await loadImageDataUrl(state.config.paths?.logo_path);
    setStatus("Aguardando PDFs.");
    renderEmptyState();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Falha ao iniciar a interface.", "error");
    renderEmptyState();
  }
}

function cacheElements() {
  elements.dropzone = document.getElementById("dropzone");
  elements.fileInput = document.getElementById("file-input");
  elements.pickButton = document.getElementById("pick-button");
  elements.downloadLink = document.getElementById("download-link");
  elements.clearButton = document.getElementById("clear-button");
  elements.statusLine = document.getElementById("status-line");
  elements.progressWrap = document.getElementById("progress-wrap");
  elements.progressLabel = document.getElementById("progress-label");
  elements.progressCount = document.getElementById("progress-count");
  elements.progressBar = document.getElementById("progress-bar");
  elements.statsGrid = document.getElementById("stats-grid");
  elements.recordsBody = document.getElementById("records-body");
  elements.detailList = document.getElementById("detail-list");
  elements.fileCount = document.getElementById("file-count");
  elements.configBadge = document.getElementById("config-badge");
}

function bindEvents() {
  elements.pickButton.addEventListener("click", () => elements.fileInput.click());
  elements.fileInput.addEventListener("change", handleFileInput);
  elements.clearButton.addEventListener("click", clearState);
  elements.downloadLink.addEventListener("click", (event) => {
    if (elements.downloadLink.classList.contains("button-disabled")) {
      event.preventDefault();
    }
  });

  const dragEvents = ["dragenter", "dragover", "dragleave", "drop"];
  dragEvents.forEach((eventName) => {
    elements.dropzone.addEventListener(eventName, preventDefaults, false);
  });
  elements.dropzone.addEventListener("dragenter", () => elements.dropzone.classList.add("is-dragging"));
  elements.dropzone.addEventListener("dragover", () => elements.dropzone.classList.add("is-dragging"));
  elements.dropzone.addEventListener("dragleave", () => elements.dropzone.classList.remove("is-dragging"));
  elements.dropzone.addEventListener("drop", handleDrop, false);
}

function preventDefaults(event) {
  event.preventDefault();
  event.stopPropagation();
}

async function loadConfig() {
  try {
    const response = await fetch("./config.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return {
      config: mergeConfig(data),
      source: "config.json",
    };
  } catch {
    return {
      config: DEFAULT_CONFIG,
      source: "fallback local",
    };
  }
}

function mergeConfig(source) {
  return {
    ...DEFAULT_CONFIG,
    ...source,
    system: {
      ...DEFAULT_CONFIG.system,
      ...(source?.system ?? {}),
    },
    paths: {
      ...DEFAULT_CONFIG.paths,
      ...(source?.paths ?? {}),
    },
    execution: {
      ...(source?.execution ?? {}),
    },
    report: {
      ...DEFAULT_CONFIG.report,
      ...(source?.report ?? {}),
    },
  };
}

async function loadImageDataUrl(path) {
  if (!path) {
    return null;
  }
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao carregar imagem."));
    reader.readAsDataURL(blob);
  });
}

function updateConfigBadge() {
  const limit = formatDecimal(state.config.report?.vibration_alert_threshold_mm_s ?? 0.8, 1);
  const summary = state.config.report?.summary_record_limit ?? 3;
  elements.configBadge.textContent = `${state.configSource} • resumo ${summary} • limite ${limit} mm/s`;
}

function setStatus(message, tone = "neutral") {
  elements.statusLine.textContent = message;
  elements.statusLine.dataset.tone = tone;
}

function setBusy(busy, label = "Processando") {
  state.busy = busy;
  elements.progressWrap.hidden = !busy;
  if (!busy) {
    elements.progressBar.style.width = "0%";
    elements.progressCount.textContent = "0/0";
    elements.progressLabel.textContent = "Processando";
    return;
  }
  elements.progressLabel.textContent = label;
  elements.progressBar.style.width = "0%";
}

function updateProgress(current, total, fileName) {
  elements.progressWrap.hidden = false;
  elements.progressLabel.textContent = fileName;
  elements.progressCount.textContent = `${current}/${total}`;
  const percent = total === 0 ? 0 : Math.round((current / total) * 100);
  elements.progressBar.style.width = `${percent}%`;
}

function validateFiles(files) {
  const list = [...files].filter(Boolean);
  if (!list.length) {
    throw new Error("Selecione ao menos um PDF.");
  }
  const invalid = list.filter((file) => !isPdfFile(file));
  if (invalid.length) {
    throw new Error(`Todos os arquivos devem ser PDF. Arquivo inválido: ${invalid[0].name}`);
  }
  return list;
}

function isPdfFile(file) {
  const name = String(file?.name ?? "").toLowerCase();
  return file?.type === "application/pdf" || name.endsWith(".pdf");
}

async function handleFileInput(event) {
  const files = event.target.files;
  if (!files?.length) {
    return;
  }
  await processFiles(files);
}

async function handleDrop(event) {
  elements.dropzone.classList.remove("is-dragging");
  const files = event.dataTransfer?.files;
  if (!files?.length) {
    return;
  }
  await processFiles(files);
}

async function processFiles(fileList) {
  let files;
  try {
    files = validateFiles(fileList);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Falha na validação.", "error");
    return;
  }

  clearGeneratedReport(true);
  setBusy(true, "Lendo PDFs");
  setStatus("Validando arquivos e extraindo dados.");

  try {
    const records = await collectSismogramsFromFiles(files, (progress) => {
      updateProgress(progress.current, progress.total, progress.file.name);
    });

    state.records = records;
    renderDashboard(records, files);
    setStatus(`Extração concluída. Gerando PDF para ${records.length} arquivo(s).`, "success");

    setBusy(true, "Montando PDF");
    const report = await buildReportBlob(records, state.config, state.logoDataUrl);
    state.report = report;
    publishReport(report);
    setStatus(`PDF pronto: ${report.filename}`, "success");
  } catch (error) {
    clearGeneratedReport(true);
    state.records = [];
    renderEmptyState();
    setStatus(error instanceof Error ? error.message : "Falha ao processar os PDFs.", "error");
  } finally {
    setBusy(false);
  }
}

function publishReport(report) {
  clearGeneratedReport(true);
  state.reportUrl = URL.createObjectURL(report.blob);
  elements.downloadLink.href = state.reportUrl;
  elements.downloadLink.download = report.filename;
  elements.downloadLink.classList.remove("button-disabled");
  elements.downloadLink.setAttribute("aria-disabled", "false");
}

function clearGeneratedReport(revokeUrl = true) {
  if (revokeUrl && state.reportUrl) {
    URL.revokeObjectURL(state.reportUrl);
  }
  state.reportUrl = null;
  state.report = null;
  elements.downloadLink.removeAttribute("href");
  elements.downloadLink.removeAttribute("download");
  elements.downloadLink.classList.add("button-disabled");
  elements.downloadLink.setAttribute("aria-disabled", "true");
}

function clearState() {
  state.records = [];
  elements.fileInput.value = "";
  clearGeneratedReport(true);
  renderEmptyState();
  setBusy(false);
  setStatus("Estado limpo. Envie novos PDFs para gerar outro relatório.");
}

function renderDashboard(records, files) {
  renderStats(records);
  renderRecordsTable(records);
  renderLastRecord(records.at(-1) ?? null);
  elements.fileCount.textContent = `${files.length} PDF${files.length === 1 ? "" : "s"}`;
}

function renderEmptyState() {
  renderStats([]);
  elements.fileCount.textContent = "0 PDFs";
  elements.recordsBody.replaceChildren(createEmptyRow("Selecione PDFs para ver a extração."));
  elements.detailList.replaceChildren(createEmptyStateCard("O detalhe do último arquivo aparece aqui após o processamento."));
}

function renderStats(records) {
  const threshold = state.config.report?.vibration_alert_threshold_mm_s ?? 0.8;
  elements.statsGrid.replaceChildren(
    createStatCard("PDFs processados", String(records.length), "Upload local no navegador.", "#e5231b"),
    createStatCard(
      "Conformes",
      String(records.filter((record) => recordOverallCompliant(record) === true).length),
      "Conformidade pela NBR 9653:2018.",
      "#7bc51c",
    ),
    createStatCard(
      "PVS máximo",
      records.length ? `${formatMmS(Math.max(...records.map((record) => record.peak_vector_sum_mm_s ?? 0)))} mm/s` : "N/D",
      `Período: ${getDateRange(records)}`,
      "#1c2240",
    ),
    createStatCard(
      "Vibração",
      records.length
        ? (anyRecordHasVibrationAlert(records, threshold) ? "ACIMA" : "ABAIXO")
        : "N/D",
      `Limite configurado em ${formatDecimal(threshold, 1)} mm/s.`,
      anyRecordHasVibrationAlert(records, threshold) ? "#f5a524" : "#7bc51c",
    ),
  );
}

function createStatCard(label, value, note, accent) {
  const card = document.createElement("article");
  card.className = "stat-card";
  card.style.setProperty("--accent", accent);

  const labelEl = document.createElement("span");
  labelEl.className = "stat-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("span");
  valueEl.className = "stat-value";
  valueEl.textContent = value;

  const noteEl = document.createElement("span");
  noteEl.className = "stat-note";
  noteEl.textContent = note;

  card.append(labelEl, valueEl, noteEl);
  return card;
}

function renderRecordsTable(records) {
  if (!records.length) {
    elements.recordsBody.replaceChildren(createEmptyRow("Selecione PDFs para ver a extração."));
    return;
  }

  const rows = records.map((record) => {
    const row = document.createElement("tr");

    row.append(
      createTableCell(record.source_pdf, record.file_name ?? record.source_pdf, "table-name", `Origem: ${record.source_pdf}`),
      createTableCell(record.location ?? "N/D", formatRecordDetail(record, "location"), "table-name"),
      createTableCell(getPrimaryClient([record]), formatRecordDetail(record, "client"), "table-name"),
      createTableCell(formatDateBr(record.event_date), formatRecordDetail(record, "event_date"), "table-name"),
      createTableCell(formatMmS(record.peak_vector_sum_mm_s), formatRecordDetail(record, "peak_vector_sum_mm_s"), "table-name"),
      createTableCell(formatPspl(record.pspl_db_l), formatRecordDetail(record, "pspl_db_l"), "table-name"),
      createStatusCell(formatRecordCompliance(record)),
    );

    return row;
  });

  elements.recordsBody.replaceChildren(...rows);
}

function createTableCell(title, meta, titleClass = "table-name", titleTitle = "") {
  const cell = document.createElement("td");
  const titleEl = document.createElement("span");
  titleEl.className = titleClass;
  titleEl.textContent = title;
  if (titleTitle) {
    titleEl.title = titleTitle;
  }

  const metaEl = document.createElement("span");
  metaEl.className = "table-meta";
  metaEl.textContent = meta;

  cell.append(titleEl, metaEl);
  return cell;
}

function createStatusCell(status) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge ${status === "CONFORME" ? "badge-success" : status === "REVISAR" ? "badge-danger" : "badge-muted"}`;
  badge.textContent = status;
  cell.append(badge);
  return cell;
}

function formatRecordDetail(record, field) {
  const threshold = state.config.report?.vibration_alert_threshold_mm_s ?? 0.8;
  switch (field) {
    case "location":
      return `Cliente: ${getPrimaryClient([record])}`;
    case "client":
      return record.user_name ? `Operação: ${record.user_name}` : record.client ? `Cliente bruto: ${record.client}` : "Cliente não identificado";
    case "event_date":
      return `Vibração: ${formatVibrationStatus([record], threshold)}`;
    case "peak_vector_sum_mm_s":
      return record.pspl_db_l == null ? "PSPL: N/D" : `PSPL: ${formatPspl(record.pspl_db_l)} dB(L)`;
    case "pspl_db_l":
      return `Status: ${formatRecordCompliance(record)}`;
    default:
      return "";
  }
}

function renderLastRecord(record) {
  if (!record) {
    elements.detailList.replaceChildren(createEmptyStateCard("O detalhe do último arquivo aparece aqui após o processamento."));
    return;
  }

  const card = document.createElement("article");
  card.className = "detail-card";

  const header = document.createElement("div");
  header.className = "detail-card-header";

  const titleWrap = document.createElement("div");
  const title = document.createElement("span");
  title.className = "detail-title";
  title.textContent = record.location ?? record.source_pdf;

  const meta = document.createElement("span");
  meta.className = "detail-meta";
  meta.textContent = `${record.source_pdf} • ${formatDateBr(record.event_date)}`;

  titleWrap.append(title, meta);

  const badge = document.createElement("span");
  const compliance = formatRecordCompliance(record);
  badge.className = `badge ${compliance === "CONFORME" ? "badge-success" : compliance === "REVISAR" ? "badge-danger" : "badge-muted"}`;
  badge.textContent = compliance;

  header.append(titleWrap, badge);

  const grid = document.createElement("div");
  grid.className = "detail-grid";

  const fields = [
    ["Cliente", getPrimaryClient([record])],
    ["Número de série", record.serial_number ?? "N/D"],
    ["Bateria", record.battery_level ?? "N/D"],
    ["Calibração", record.unit_calibration ?? "N/D"],
    ["Arquivo interno", record.file_name ?? "N/D"],
    [
      "Distância escalada",
      record.scaled_distance == null
        ? "N/D"
        : `${formatDecimal(record.scaled_distance, 1)} (${formatDecimal(record.distance_m, 1)} m; ${formatDecimal(record.charge_kg, 1)} kg)`,
    ],
    ["PSPL", record.pspl_db_l == null ? "N/D" : `${formatPspl(record.pspl_db_l)} dB(L)`],
    ["PVS", record.peak_vector_sum_mm_s == null ? "N/D" : `${formatMmS(record.peak_vector_sum_mm_s)} mm/s`],
    ["Microfone", formatMicrophoneValue(record)],
    ["Vibração", formatVibrationStatus([record], state.config.report?.vibration_alert_threshold_mm_s ?? 0.8)],
  ];

  fields.forEach(([label, value]) => {
    const field = document.createElement("div");
    field.className = "detail-field";

    const fieldLabel = document.createElement("span");
    fieldLabel.className = "detail-field-label";
    fieldLabel.textContent = label;

    const fieldValue = document.createElement("span");
    fieldValue.className = "detail-field-value";
    fieldValue.textContent = value;

    field.append(fieldLabel, fieldValue);
    grid.append(field);
  });

  const chips = document.createElement("div");
  chips.className = "detail-chips";

  CHANNEL_ORDER.forEach((axis) => {
    const channel = record.channels?.[axis] ?? { axis };
    const chip = document.createElement("span");
    chip.className = `detail-chip ${channel.compliant == null ? "" : channel.compliant ? "badge-success" : "badge-danger"}`;
    chip.textContent = `${axis}: ${channel.compliant == null ? "N/D" : channel.compliant ? "OK" : "REVISAR"}`;
    chips.append(chip);
  });

  card.append(header, grid, chips);
  elements.detailList.replaceChildren(card);
}

function formatMicrophoneValue(record) {
  if (record.microphone_zc_freq_hz == null) {
    return "N/D";
  }
  return `${formatFrequency(record.microphone_zc_freq_hz, 1)} Hz`;
}

function createEmptyRow(message) {
  const row = document.createElement("tr");
  row.className = "empty-row";
  const cell = document.createElement("td");
  cell.colSpan = 7;
  cell.textContent = message;
  row.append(cell);
  return row;
}

function createEmptyStateCard(message) {
  const card = document.createElement("div");
  card.className = "empty-state";
  card.textContent = message;
  return card;
}
