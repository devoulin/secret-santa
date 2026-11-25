import type { Family, MessageTemplate, StoredDraw } from '../domain/types';

/** Format pliku kopii zapasowej (bez kluczy EmailJS). */
export interface BackupFile {
  app: 'secret-santa';
  version: 1;
  exportedAt: string;
  families: Family[];
  template: MessageTemplate;
  options: { avoidMutual: boolean };
  draw: StoredDraw | null;
}

export function createBackup(data: Omit<BackupFile, 'app' | 'version' | 'exportedAt'>): BackupFile {
  return { app: 'secret-santa', version: 1, exportedAt: new Date().toISOString(), ...data };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isFamily(v: unknown): v is Family {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.members) &&
    v.members.every(
      (m) =>
        isObject(m) &&
        typeof m.id === 'string' &&
        typeof m.name === 'string' &&
        typeof m.email === 'string' &&
        (m.kind === 'adult' || m.kind === 'child'),
    )
  );
}

/** Parsuje i weryfikuje plik kopii zapasowej. Rzuca błąd z polskim komunikatem. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Plik nie jest poprawnym plikiem JSON.');
  }
  if (!isObject(data) || data.app !== 'secret-santa') {
    throw new Error('To nie jest plik eksportu z tej aplikacji.');
  }
  if (!Array.isArray(data.families) || !data.families.every(isFamily)) {
    throw new Error('Plik ma niepoprawną listę rodzin.');
  }
  return data as unknown as BackupFile;
}
