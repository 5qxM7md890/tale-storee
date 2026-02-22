import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.resolve(process.cwd(), 'data', 'commands.json');

export async function listCommands() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}
