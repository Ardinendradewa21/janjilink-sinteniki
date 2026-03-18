import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper untuk menggabungkan class Tailwind secara aman (menghindari class yang bentrok).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
