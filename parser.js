import {
  CHANNEL_ORDER,
  parseFloatValue,
  stripExtension,
  vibrationReferenceLimit,
} from "./utils.js";

import * as pdfjsLib from "./vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).toString();

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

function parseHeaderBlock(text) {
  const match = /Serial Number\s*Battery Level\s*Unit Calibration\s*File Name\s*Scaled Distance\s*([^\n]+)\s*([^\n]+)\s*([^\n]+)\s*([^\n]+)\s*([^\n]+)\s*Notes\s*Location:\s*([^\n]+)\s*Client:\s*([^\n]+)\s*User Name:\s*([^\n]+)\s*General:/s.exec(text);
  if (!match) {
    return {
      serialNumber: null,
      batteryLevel: null,
      unitCalibration: null,
      fileName: null,
      rawScaledDistance: null,
      location: null,
      client: null,
      userName: null,
    };
  }

  return {
    serialNumber: match[1].trim(),
    batteryLevel: match[2].trim(),
    unitCalibration: match[3].trim(),
    fileName: match[4].trim(),
    rawScaledDistance: match[5].trim(),
    location: match[6].trim(),
    client: match[7].trim(),
    userName: match[8].trim(),
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

function extractLineValue(lines, prefix) {
  const lowerPrefix = prefix.toLowerCase();
  const line = lines.find((entry) => entry.toLowerCase().startsWith(lowerPrefix));
  if (!line) {
    return null;
  }
  const value = line.slice(prefix.length).replace(/^:\s*/, "").trim();
  return value || null;
}

function extractTripletValues(lines, prefix) {
  const line = extractLineValue(lines, prefix);
  if (!line) {
    return [null, null, null];
  }
  const values = line.match(/[-+]?\d+(?:[.,]\d+)?/g)?.map(parseFloatValue) ?? [];
  return [values[0] ?? null, values[1] ?? null, values[2] ?? null];
}

function getMaxPpvValue(channels) {
  let bestValue = null;
  for (const axis of CHANNEL_ORDER) {
    const value = channels[axis]?.ppv_mm_s ?? null;
    if (value == null) {
      continue;
    }
    if (bestValue == null || value > bestValue) {
      bestValue = value;
    }
  }
  return bestValue;
}

function mmDdYyyyToIso(dateStr) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(dateStr).trim());
  if (!match) {
    return null;
  }
  const month = String(Number(match[1])).padStart(2, "0");
  const day = String(Number(match[2])).padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

function detectSismogramModel(text) {
  if (/GeoSonics Inc\. Seismic Analysis/i.test(text) || /Velocity Waveform Analysis/i.test(text)) {
    return "geosonics";
  }
  return "instantel";
}

function parseGeoSonicsSismogramFromText(file, text) {
  const lines = extractLines(text);

  const serialNumber = extractLineValue(lines, "Serial No:");
  const dateValue = extractLineValue(lines, "Date:");
  const eventDate = dateValue ? mmDdYyyyToIso(dateValue.split(/\s+/)[0]) : null;
  const fileNameRaw = extractLineValue(lines, "File:");
  const fileName = fileNameRaw ? fileNameRaw.replace(/\s*\(.+$/, "").trim() : null;
  const location = extractLineValue(lines, "Location:");
  const client = extractLineValue(lines, "Client:");
  const operationName = extractLineValue(lines, "Operation:") ?? extractLineValue(lines, "Operator:");
  const calibrationDate = extractLineValue(lines, "Shaketable Calibrated:");
  const calibrationBy = extractLineValue(lines, "By:");
  const unitCalibration = calibrationDate && calibrationBy
    ? `${calibrationDate} by ${calibrationBy}`
    : calibrationDate ?? calibrationBy;
  const distanceRaw = extractLineValue(lines, "Distance:");
  const distanceValue = distanceRaw ? parseFloatValue(distanceRaw) : null;
  const ppvValues = extractTripletValues(lines, "PPV (mm/s)");
  const freqValues = extractTripletValues(lines, "FREQ (Hz)");
  const timeValues = extractTripletValues(lines, "Time (Rel. to Trig)");
  const overswingValues = extractTripletValues(lines, "Overswing Ratio");

  const psplLine = extractLineValue(lines, "Peak Air Pressure:");
  const psplDbL = psplLine ? parseFloatValue(psplLine) : null;

  const microphoneMatch = /PSI\s*@\s*([0-9.,>]+)\s*Hz/i.exec(text);
  const microphoneZcFreqHz = microphoneMatch ? parseFrequencyToken(microphoneMatch[1]) : null;

  const peakVectorMatch = new RegExp("Peak Vector Sum\\s*:?[\\s\\S]*?([0-9.,>]+)\\s*mm\\/s", "i").exec(text);
  const peakVectorValue = peakVectorMatch ? parseFloatValue(peakVectorMatch[1]) : null;

  const axisIndexByChannel = {
    Tran: 1,
    Vert: 2,
    Long: 0,
  };
  const channels = Object.fromEntries(CHANNEL_ORDER.map((axis) => {
    const sourceIndex = axisIndexByChannel[axis];
    const ppv = ppvValues[sourceIndex] ?? null;
    const freq = freqValues[sourceIndex] ?? null;
    const limit = vibrationReferenceLimit(freq);
    return [axis, {
      axis,
      ppv_mm_s: ppv,
      zc_freq_hz: freq,
      event_time: timeValues[sourceIndex] ?? null,
      sensor_frequency_hz: null,
      overswing_ratio: overswingValues[sourceIndex] ?? null,
      reference_limit_mm_s: limit,
      compliant: ppv == null || limit == null ? null : ppv <= limit,
    }];
  }));
  // GeoSonics pode omitir o PVS explícito; nesse caso usamos o maior PPV dos eixos.
  const peakVectorSumMmS = peakVectorValue ?? getMaxPpvValue(channels);

  return {
    source_pdf: file.name,
    location: location || stripExtension(file.name),
    client,
    user_name: client || operationName,
    operation_name: operationName,
    serial_number: serialNumber,
    battery_level: null,
    unit_calibration: unitCalibration,
    file_name: fileName,
    scaled_distance: distanceValue,
    distance_m: distanceValue,
    charge_kg: null,
    raw_scaled_distance: distanceRaw,
    event_date: eventDate,
    pspl_db_l: psplDbL,
    microphone_zc_freq_hz: microphoneZcFreqHz,
    peak_vector_sum_mm_s: peakVectorSumMmS,
    channels,
    pspl_compliant: psplDbL == null ? null : psplDbL <= 134.0,
  };
}

function parseChannel(lines, axis) {
  const axisPattern = new RegExp(`\\b${axis}\\b`, "i");
  const index = lines.findIndex((line) => axisPattern.test(line));
  if (index < 0) {
    return { axis };
  }
  const axisLine = lines[index];
  const ppvMatch = new RegExp(`\\b${axis}\\s+([0-9.,>]+)`, "i").exec(axisLine);
  const ppv = ppvMatch ? parseFloatValue(ppvMatch[1]) : null;

  let freq = null;
  for (let offset = 1; offset <= 4 && index + offset < lines.length; offset += 1) {
    const candidate = parseFrequencyToken(lines[index + offset]);
    if (candidate != null) {
      freq = candidate;
      break;
    }
  }

  const limit = vibrationReferenceLimit(freq);
  const compliant = ppv == null || limit == null ? null : ppv <= limit;

  return {
    axis,
    ppv_mm_s: ppv,
    zc_freq_hz: freq,
    event_time: null,
    sensor_frequency_hz: null,
    overswing_ratio: null,
    reference_limit_mm_s: limit,
    compliant,
  };
}

function parseSismogramFromText(file, text) {
  if (detectSismogramModel(text) === "geosonics") {
    return parseGeoSonicsSismogramFromText(file, text);
  }

  const lines = extractLines(text);

  const header = parseHeaderBlock(text);

  const micMatch = /Linear Weighting[\s\S]*?([0-9.,]+)\s*dB\(L\)[\s\S]*?\n\s*([0-9.,>]+)\s*Hz/s.exec(text);
  const psplDbL = micMatch ? parseFloatValue(micMatch[1]) : null;
  const microphoneZcFreqHz = micMatch ? parseFrequencyToken(micMatch[2]) : null;

  const peakMatch = /Peak Vector Sum\s*([0-9.]+)\s*mm\/s\s+at\s+[0-9.]+\s*sec/s.exec(text);
  const peakVectorSumMmS = peakMatch ? parseFloatValue(peakMatch[1]) : null;
  const eventDate = parseEventDate(text);

  const { scaledDistance, distanceM, chargeKg } = parseScaledDistance(header.rawScaledDistance);
  const channels = Object.fromEntries(CHANNEL_ORDER.map((axis) => [axis, parseChannel(lines, axis)]));

  return {
    source_pdf: file.name,
    location: header.location || stripExtension(file.name),
    client: header.client,
    user_name: header.userName,
    serial_number: header.serialNumber,
    battery_level: header.batteryLevel,
    unit_calibration: header.unitCalibration,
    file_name: header.fileName,
    scaled_distance: scaledDistance,
    distance_m: distanceM,
    charge_kg: chargeKg,
    raw_scaled_distance: header.rawScaledDistance,
    event_date: eventDate,
    pspl_db_l: psplDbL,
    microphone_zc_freq_hz: microphoneZcFreqHz,
    peak_vector_sum_mm_s: peakVectorSumMmS,
    channels,
    pspl_compliant: psplDbL == null ? null : psplDbL <= 134.0,
  };
}

async function readPdfText(file) {
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
