import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMZN(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const VALID_PREFIXES = ["82", "83", "84", "85", "86", "87", "88"];

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 9) return false;
  return VALID_PREFIXES.some((p) => digits.startsWith(p));
}

export function isValidPrefix(phone: string): boolean {
  if (phone.length < 2) return true;
  return VALID_PREFIXES.some((p) => phone.startsWith(p));
}

export function generateId(length: number = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export function cleanMocambiquePhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.trim().replace(/\s+/g, "").replace(/\+/g, "");

  if (cleaned.startsWith("258") && cleaned.length > 9) {
    cleaned = cleaned.substring(3);
  }
  return cleaned;
}
