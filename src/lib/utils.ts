import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { JsonValue } from "@/components/practice/types";

const DATASET_TIMESTAMP_COLUMN_NAMES = [
  "interactiondate",
  "resolutiondate",
  "createddate",
  "updateddate",
  "created_at",
  "updated_at",
  "submitted_at",
  "resolved_at",
  "closed_at",
  "opened_at",
  "orderdate",
  "shipdate",
  "duedate",
];

const DATASET_TIMESTAMP_KEYWORDS = [
  "date",
  "timestamp",
  "datetime",
  "created",
  "updated",
  "resolved",
  "submitted",
  "closed",
  "opened",
  "reported",
];

const DATASET_TIMESTAMP_COLUMN_SUFFIXES = ["_at", "_ts", "_time"];

const DATASET_TIMESTAMP_COLUMNS = new Set(
  DATASET_TIMESTAMP_COLUMN_NAMES.map((name) => name.toLowerCase()),
);

const WRAPPED_CELL_VALUE_PATTERN = /^\\?(['"])(.*)\\?\1$/;
const NUMERIC_STRING_PATTERN = /^-?\\d+(?:\\.\\d+)?$/;
const DATE_TIME_DELIMITER_PATTERN = /[-/T]/;
const DECIMAL_COLUMN_KEYWORDS = [
  "amount",
  "price",
  "total",
  "cost",
  "value",
  "fee",
  "charge",
  "balance",
  "listprice",
  "list_price",
  "list",
  "qty",
  "quantity",
];
const DECIMAL_COLUMN_SUFFIXES = ["_amount", "_amt", "_price", "_cost", "_total", "_value", "_qty", "_quantity"];

const DECIMAL_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const normalizeDatasetCellValue = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  let normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const stripEdgeQuotes = (input: string): string => {
    let result = input;
    for (let i = 0; i < 6; i += 1) {
      let changed = false;
      result = result.trim();

      if (/^\\+['"]/.test(result)) {
        result = result.replace(/^\\+['"]+/, "").trimStart();
        changed = true;
      } else if (/^['"]/.test(result)) {
        result = result.slice(1).trimStart();
        changed = true;
      }

      if (/['"]\\+$/.test(result)) {
        result = result.replace(/['"]+\\+$/, "").trimEnd();
        changed = true;
      } else if (/['"]$/.test(result)) {
        result = result.slice(0, -1).trimEnd();
        changed = true;
      }

      if (!changed) {
        break;
      }
    }
    return result;
  };

  normalized = stripEdgeQuotes(normalized);
  for (let i = 0; i < 3; i += 1) {
    const match = normalized.match(WRAPPED_CELL_VALUE_PATTERN);
    if (match && typeof match[2] === "string") {
      normalized = match[2].trim();
      normalized = stripEdgeQuotes(normalized);
      continue;
    }
    break;
  }

  normalized = normalized.replace(/\\(['"])/g, "$1");
  return normalized;
};

const isLikelyTimestampColumn = (columnName?: string): boolean => {
  if (!columnName) {
    return false;
  }

  const normalized = columnName.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (DATASET_TIMESTAMP_COLUMNS.has(normalized)) {
    return true;
  }

  if (DATASET_TIMESTAMP_COLUMN_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return true;
  }

  return DATASET_TIMESTAMP_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const normalizeEpochToMilliseconds = (value: number): number | null => {
  const absValue = Math.abs(value);

  if (absValue >= 1e15) {
    return value / 1000;
  }

  if (absValue >= 1e11) {
    return value;
  }

  if (absValue >= 1e8) {
    return value * 1000;
  }

  return null;
};

const formatTimestampFromMilliseconds = (timestampMs: number): string | null => {
  const parsedDate = new Date(timestampMs);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDatasetTimestamp = (rawValue: unknown): string | null => {
  const normalizedValue = normalizeDatasetCellValue(rawValue);

  if (normalizedValue instanceof Date && !Number.isNaN(normalizedValue.getTime())) {
    return formatTimestampFromMilliseconds(normalizedValue.getTime());
  }

  let numericValue: number | null = null;
  if (typeof normalizedValue === "number") {
    numericValue = normalizedValue;
  } else if (
    typeof normalizedValue === "string" &&
    NUMERIC_STRING_PATTERN.test(normalizedValue)
  ) {
    numericValue = Number(normalizedValue);
  }

  if (numericValue !== null && Number.isFinite(numericValue)) {
    const timestampMs = normalizeEpochToMilliseconds(numericValue);
    if (timestampMs !== null) {
      const formatted = formatTimestampFromMilliseconds(timestampMs);
      if (formatted) {
        return formatted;
      }
    }
  }

  if (typeof normalizedValue === "string") {
    const trimmed = normalizedValue.trim();
    if (trimmed.length >= 6 && DATE_TIME_DELIMITER_PATTERN.test(trimmed)) {
      const parsedDate = new Date(trimmed);
      const formatted = formatTimestampFromMilliseconds(parsedDate.getTime());
      if (formatted) {
        return formatted;
      }
    }
  }

  return null;
};

const parseNumericValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string" && NUMERIC_STRING_PATTERN.test(value)) {
    return Number(value);
  }
  return null;
};

const normalizeColumnName = (columnName?: string) => columnName?.trim().toLowerCase() ?? "";

const isLikelyDecimalColumn = (columnName?: string): boolean => {
  const normalized = normalizeColumnName(columnName);
  if (!normalized) {
    return false;
  }

  if (DECIMAL_COLUMN_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  return DECIMAL_COLUMN_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
};

const EMPTY_CELL_LABEL = "\u2014";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function getExperienceBadgeColor(level: string): string {
  switch (level.toLowerCase()) {
    case "entry":
      return "bg-blue-100 text-blue-800";
    case "junior":
      return "bg-green-100 text-green-800";
    case "mid":
      return "bg-yellow-100 text-yellow-800";
    case "senior":
      return "bg-orange-100 text-orange-800";
    case "lead":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function formatDatasetValue(value: JsonValue | unknown, columnName?: string): string {
  if (value === null || value === undefined) {
    return EMPTY_CELL_LABEL;
  }

  const normalizedValue = normalizeDatasetCellValue(value);

  if (typeof normalizedValue === 'string' && normalizedValue.length === 0) {
    return EMPTY_CELL_LABEL;
  }

  if (isLikelyTimestampColumn(columnName)) {
    const formattedTimestamp = formatDatasetTimestamp(normalizedValue);
    if (formattedTimestamp) {
      return formattedTimestamp;
    }
  }

  const numericCandidate = parseNumericValue(normalizedValue);
  if (numericCandidate !== null && Number.isFinite(numericCandidate)) {
    if (isLikelyDecimalColumn(columnName)) {
      return DECIMAL_FORMATTER.format(numericCandidate);
    }
  }

  if (typeof normalizedValue === 'boolean') {
    return normalizedValue ? 'TRUE' : 'FALSE';
  }

  if (typeof normalizedValue === 'object' && normalizedValue !== null) {
    try {
      return JSON.stringify(normalizedValue);
    } catch {
      return String(normalizedValue);
    }
  }

  return typeof normalizedValue === 'string'
    ? normalizedValue
    : String(normalizedValue);
}
