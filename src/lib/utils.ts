import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "COP") {
  return new Intl.NumberFormat("es-CO", { 
    style: "currency", 
    currency, 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}
