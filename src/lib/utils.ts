import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import Decimal from "decimal.js"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Money arithmetic helpers — avoid JS floating-point errors (e.g. 0.1 + 0.2 = 0.30000000000000004)
// All results are rounded to 2 decimal places (centavos), except calcPercent which keeps full precision.

export const addMoney = (a: number, b: number): number =>
  new Decimal(a).plus(b).toDecimalPlaces(2).toNumber()

export const subtractMoney = (a: number, b: number): number =>
  new Decimal(a).minus(b).toDecimalPlaces(2).toNumber()

export const multiplyMoney = (a: number, b: number): number =>
  new Decimal(a).times(b).toDecimalPlaces(2).toNumber()

export const divideMoney = (a: number, b: number): number =>
  new Decimal(a).dividedBy(b).toDecimalPlaces(2).toNumber()

/** Returns (part / total) * 100. Does NOT round — callers use toFixed() for display. */
export const calcPercent = (part: number, total: number): number =>
  new Decimal(part).dividedBy(total).times(100).toNumber()
