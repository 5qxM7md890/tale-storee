import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.resolve(process.cwd(), 'data', 'products.json');

export async function listProducts() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

export function priceForMonths(monthlyPriceCents, months) {
  const m = Number(months);
  const base = monthlyPriceCents * m;
  // Simple discount model (change to match your business rules)
  const discount = m >= 12 ? 0.80 : m >= 6 ? 0.90 : m >= 3 ? 0.95 : 1.0;
  return Math.round(base * discount);
}
