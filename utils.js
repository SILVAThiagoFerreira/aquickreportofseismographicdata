export const CHANNEL_ORDER = ["Tran", "Vert", "Long"];

export const CHANNEL_LABELS = {
  Tran: "Transversal",
  Vert: "Vertical",
  Long: "Longitudinal",
};

const MONTHS_EN = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

export function parseFloatValue(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  const normalized = text.replace(",", ".");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  return Number(match[0]);
}

export function formatDecimal(value, decimals) {
  if (value == null || Number.isNaN(Number(value))) {
    return "N/D";
  }
  return Number(value).toFixed(decimals).replace(".", ",");
}

export function formatMmS(value) {
  return formatDecimal(value, 3);
}

export function formatPspl(value) {
  return formatDecimal(value, 1);
}

export function formatDistance(value) {
  return formatDecimal(value, 1);
}

export function formatCharge(value) {
  return formatDecimal(value, 1);
}

export function formatFrequency(value, decimals = 1) {
  if (value == null) {
    return "N/D";
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) {
      return "N/D";
    }
    if (text.startsWith(">") || text.toUpperCase() === "N/D") {
      return text.replace(".", ",");
    }
    const parsed = parseFloatValue(text);
    if (parsed == null) {
      return text;
    }
    value = parsed;
  }
  const numeric = Number(value);
  if (Number.isInteger(numeric)) {
    return String(numeric);
  }
  return formatDecimal(numeric, decimals);
}

export function formatMicrophoneFrequency(value) {
  return formatFrequency(value, 1);
}

export function formatChannelFrequency(value) {
  return formatFrequency(value, 1);
}

function parseIsoDateString(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
}

export function formatDateBr(value) {
  if (value == null) {
    return "N/D";
  }
  if (typeof value === "string") {
    const iso = parseIsoDateString(value.trim());
    if (iso) {
      return `${iso.day}/${iso.month}/${iso.year}`;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("pt-BR");
    }
    return value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString("pt-BR");
  }
  return "N/D";
}

export function formatDateTimeBr(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "N/D";
  }
  return value.toLocaleString("pt-BR");
}

export function stripExtension(filename) {
  const name = String(filename ?? "").trim();
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(0, index) : name;
}

export function slugify(text) {
  const normalized = String(text ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const slug = normalized.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return slug || "saida";
}

export function normalizeClientName(name) {
  const normalized = String(name ?? "").trim().replace(/\s+/g, " ");
  const upper = normalized.toUpperCase();
  if (upper.includes("MINERACAO VALE") || upper.includes("MINERA AO VALE")) {
    return "US MINERAÇÃO VALE-VERDE";
  }
  return normalized;
}

export function vibrationReferenceLimit(freqValue) {
  if (freqValue == null) {
    return null;
  }
  let freq = null;
  if (typeof freqValue === "string") {
    const text = freqValue.trim();
    if (!text) {
      return null;
    }
    if (text.startsWith(">")) {
      return 50.0;
    }
    freq = parseFloatValue(text);
  } else {
    freq = Number(freqValue);
  }
  if (freq == null || Number.isNaN(freq)) {
    return null;
  }
  if (freq <= 4.0) {
    return 15.0;
  }
  if (freq <= 15.0) {
    return 15.0 + ((freq - 4.0) * (5.0 / 11.0));
  }
  if (freq <= 40.0) {
    return 20.0 + ((freq - 15.0) * (30.0 / 25.0));
  }
  return 50.0;
}

export function recordAllChannelsCompliant(record) {
  const states = CHANNEL_ORDER
    .map((axis) => record?.channels?.[axis]?.compliant)
    .filter((value) => value != null);
  if (!states.length) {
    return null;
  }
  return states.every(Boolean);
}

export function recordOverallCompliant(record) {
  const states = [record?.pspl_compliant, recordAllChannelsCompliant(record)]
    .filter((value) => value != null);
  if (!states.length) {
    return null;
  }
  return states.every(Boolean);
}

export function recordHasVibrationAlert(record, threshold) {
  if (!record) {
    return false;
  }
  const readings = [record.peak_vector_sum_mm_s];
  readings.push(...CHANNEL_ORDER.map((axis) => record?.channels?.[axis]?.ppv_mm_s));
  return readings.some((value) => value != null && value > threshold);
}

export function anyRecordHasVibrationAlert(records, threshold) {
  return records.some((record) => recordHasVibrationAlert(record, threshold));
}

export function getPrimaryClient(records) {
  for (const record of records) {
    if (record.user_name) {
      return normalizeClientName(record.user_name);
    }
    if (record.client) {
      return normalizeClientName(record.client);
    }
  }
  return "ENAEX";
}

export function buildEventSlug(records, generatedAt) {
  const knownDates = [...new Set(records.map((record) => record.event_date).filter(Boolean))].sort();
  if (!knownDates.length) {
    return localDateSlug(generatedAt);
  }
  if (knownDates.length === 1) {
    return knownDates[0].replace(/-/g, "");
  }
  return `${knownDates[0].replace(/-/g, "")}_a_${knownDates[knownDates.length - 1].replace(/-/g, "")}`;
}

export function localDateSlug(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function buildReportFilename(records, generatedAt) {
  return `ENAEX_NSR-${buildEventSlug(records, generatedAt)}.pdf`;
}

export function formatRecordCompliance(record) {
  const compliance = recordOverallCompliant(record);
  if (compliance == null) {
    return "N/D";
  }
  return compliance ? "CONFORME" : "REVISAR";
}

export function formatVibrationStatus(records, threshold) {
  return anyRecordHasVibrationAlert(records, threshold)
    ? `ACIMA DE ${formatDecimal(threshold, 1)} MM/S`
    : `ABAIXO DE ${formatDecimal(threshold, 1)} MM/S`;
}

export function getDateRange(records) {
  const dates = [...new Set(records.map((record) => record.event_date).filter(Boolean))].sort();
  if (!dates.length) {
    return "N/D";
  }
  if (dates.length === 1) {
    return formatDateBr(dates[0]);
  }
  return `${formatDateBr(dates[0])} - ${formatDateBr(dates[dates.length - 1])}`;
}
