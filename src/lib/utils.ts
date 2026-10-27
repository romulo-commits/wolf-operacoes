import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Junta classes Tailwind resolvendo conflitos (padrão shadcn/ui). */
export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}
