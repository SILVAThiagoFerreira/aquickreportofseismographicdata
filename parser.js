import {
  CHANNEL_ORDER,
  parseFloatValue,
  stripExtension,
  vibrationReferenceLimit,
} from "./utils.js";

function getPdfJs() {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js nao foi carregado.");
  }
  return window.pdfjsLib;
}

function normalizeLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function extractLines(text) {
  const lines = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = normalizeLine(rawLine);
    if (line) {
      lines.push(line);
    }
  }
  return lines;
}

function findLine(lines, target) {
  return lines.findIndex((line) => line === target);
}

function searchGroup(regex, text) {
  const match = regex.exec(text);
  return match ? match[1].trim() : null;
}

function parseFrequencyToken(token) {
  if (token == null) {
    return null;
  }
  const cleaned = String(token).replace(/Hz/gi, "").trim();
  if (!cleaned) {
    return null;
  }
  if (cleaned.startsWith(">")) {
    return cleaned;
  }
  return parseFloatValue(cleaned);
}

function parseScaledDistance(rawValue) {
  if (!rawValue) {
    return { scaledDistance: null, distanceM: null, chargeKg: null };
  }
  const match = /([0-9.]+)\s*\(([0-9.]+)\s*m,\s*([0-9.]+)\s*kg\)/i.exec(rawValue);
  if (!match) {
    return { scaledDistance: parseFloatValue(rawValue), distanceM: null, chargeKg: null };
  }
  return {
    scaledDistance: parseFloatValue(match[1]),
    distanceM: parseFloatValue(match[2]),
    chargeKg: parseFloatValue(match[3]),
  };
}

function englishDateToIso(dateStr) {
  const match = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/.exec(dateStr.trim());
  if (!match) {
    return null;
  }
  const monthIndex = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  }[match[1].toLowerCase()];
  if (!monthIndex) {
    return null;
  }
  const day = String(Number(match[2])).padStart(2, "0");
  const month = String(monthIndex).padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

function parseEventDate(text) {
  const patterns = [
    /(?:Manual|Automatic)\s+at\s+[0-9:]+\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/s,
    /Peak Vector Sum\s*[0-9.]+\s*mm\/s on\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})\s+at/s,
    /([0-9.]+)\s*dB\(L\).*?on\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})\s+at/s,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const dateStr = match[1];
      const iso = englishDateToIso(dateStr);
      if (iso) {
        return iso;
      }
    }
  }
  return null;
}

function parseChannel(lines, axis) {
  const index = findLine(lines, axis);
  if (index < 0) {
    return { axis };
  }
  const block = lines.slice(index + 1, index + 8);
  const ppv = parseFloatValue(block[0]);
  const freq = parseFrequencyToken(block[1]);
  const eventTime = block[3] ?? null;
  const sensorFrequency = parseFloatValue(block[5]);
  const overswingRatio = parseFloatValue(block[6]);
  const limit = vibrationReferenceLimit(freq);
  const compliant = ppv == null || limit == null ? null : ppv <= limit;

  return {
    axis,
    ppv_mm_s: ppv,
    zc_freq_hz: freq,
    event_time: eventTime,
    sensor_frequency_hz: sensorFrequency,
    overswing_ratio: overswingRatio,
    reference_limit_mm_s: limit,
    compliant,
  };
}

function parseSismogramFromText(file, text) {
  const lines = extractLines(text);

  const serialIndex = findLine(lines, "Serial Number");
  const serialNumber = serialIndex >= 0 && lines.length > serialIndex + 5 ? lines[serialIndex + 5] : null;
  const batteryLevel = serialIndex >= 0 && lines.length > serialIndex + 6 ? lines[serialIndex + 6] : null;
  const unitCalibration = serialIndex >= 0 && lines.length > serialIndex + 7 ? lines[serialIndex + 7] : null;
  const fileName = serialIndex >= 0 && lines.length > serialIndex + 8 ? lines[serialIndex + 8] : null;
  const rawScaledDistance = serialIndex >= 0 && lines.length > serialIndex + 9 ? lines[serialIndex + 9] : null;

  const micIndex = findLine(lines, "Linear Weighting");
  const psplLine = micIndex >= 0 && lines.length > micIndex + 1 ? lines[micIndex + 1] : null;
  const micFreqLine = micIndex >= 0 && lines.length > micIndex + 2 ? lines[micIndex + 2] : null;

  const psplDbL = parseFloatValue(psplLine);
  const microphoneZcFreqHz = parseFrequencyToken(micFreqLine);

  const peakMatch = /Peak Vector Sum\s*([0-9.]+)\s*mm\/s\s+at\s+[0-9.]+\s*sec/s.exec(text);
  const peakVectorSumMmS = peakMatch ? parseFloatValue(peakMatch[1]) : null;
  const eventDate = parseEventDate(text);

  const { scaledDistance, distanceM, chargeKg } = parseScaledDistance(rawScaledDistance);
  const channels = Object.fromEntries(CHANNEL_ORDER.map((axis) => [axis, parseChannel(lines, axis)]));

  return {
    source_pdf: file.name,
    location: searchGroup(/Location:\s*(.+)/m, text) || stripExtension(file.name),
    client: searchGroup(/Client:\s*(.+)/m, text),
    user_name: searchGroup(/User Name:\s*(.+)/m, text),
    serial_number: serialNumber,
    battery_level: batteryLevel,
    unit_calibration: unitCalibration,
    file_name: fileName,
    scaled_distance: scaledDistance,
    distance_m: distanceM,
    charge_kg: chargeKg,
    raw_scaled_distance: rawScaledDistance,
    event_date: eventDate,
    pspl_db_l: psplDbL,
    microphone_zc_freq_hz: microphoneZcFreqHz,
    peak_vector_sum_mm_s: peakVectorSumMmS,
    channels,
    pspl_compliant: psplDbL == null ? null : psplDbL <= 134.0,
  };
}

async function readPdfText(file) {
  const pdfjsLib = getPdfJs();
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const documentProxy = await loadingTask.promise;

  try {
    const chunks = [];
    for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
      const page = await documentProxy.getPage(pageNumber);
      const content = await page.getTextContent();
      const parts = [];
      for (const item of content.items) {
        const text = String(item.str ?? "").trim();
        if (!text) {
          continue;
        }
        parts.push(text);
        parts.push(item.hasEOL ? "\n" : " ");
      }
      chunks.push(parts.join(""));
    }
    return chunks.join("\n");
  } finally {
    documentProxy.destroy?.();
  }
}

export async function parsePdfFile(file) {
  const text = await readPdfText(file);
  return parseSismogramFromText(file, text);
}

export async function collectSismogramsFromFiles(files, onProgress = () => {}) {
  const sortedFiles = [...files]
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { numeric: true, sensitivity: "base" }));

  const records = [];
  for (let index = 0; index < sortedFiles.length; index += 1) {
    const file = sortedFiles[index];
    onProgress({ stage: "extract", current: index + 1, total: sortedFiles.length, file });
    const record = await parsePdfFile(file);
    records.push(record);
  }
  return records;
}
