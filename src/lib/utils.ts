import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { JsonValue } from "@/components/practice/types";

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

export function formatDatasetValue(value: JsonValue): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
