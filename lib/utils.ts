import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Fungsi util bawaan shadcn untuk menggabungkan class Tailwind tanpa konflik.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
