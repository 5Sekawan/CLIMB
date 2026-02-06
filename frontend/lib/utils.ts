import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const cleaned = input.replace(/\s/g, "");
  const decimalMatch = cleaned.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
  if (decimalMatch) {
    return {
      lat: parseFloat(decimalMatch[1]),
      lng: parseFloat(decimalMatch[2]),
    };
  }
  const dmsMatch = cleaned.match(
    /^(\d+\.?\d*)([NSns]),(\d+\.?\d*)([EWew])$/
  );
  if (dmsMatch) {
    let lat = parseFloat(dmsMatch[1]);
    let lng = parseFloat(dmsMatch[3]);
    if (dmsMatch[2].toLowerCase() === "s") lat = -lat;
    if (dmsMatch[4].toLowerCase() === "w") lng = -lng;
    return { lat, lng };
  }
  return null;
}
