import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Family, MessageTemplate, Person, PersonKind, StoredDraw } from '../domain/types';
import { DEFAULT_TEMPLATE } from '../domain/message';
import { randomId } from '../domain/random';
import { createSampleFamilies } from '../domain/sample';
import type { EmailJsConfig } from '../services/emailjs';
import type { BackupFile } from '../services/backup';

export type StepId = 'families' | 'message' | 'draw' | 'send';

export type SendState = 'sent' | 'opened' | 'copied' | 'error';

export interface SendStatus {
  state: SendState;
  at: string;
  error?: string;
}

export interface AppData {
  families: Family[];
  template: MessageTemplate;
  options: { avoidMutual: boolean };
  emailjs: EmailJsConfig;
  draw: StoredDraw | null;
  /** Status wysyłki per osoba (giverId). */
  sendStatus: Record<string, SendStatus>;
  step: StepId;
}

interface AppActions {
  addFamily: () => string;
  updateFamily: (familyId: string, patch: Partial<Omit<Family, 'id' | 'members'>>) => void;
  removeFamily: (familyId: string) => void;
  addPerson: (familyId: string, kind: PersonKind) => string;
  updatePerson: (familyId: string, personId: string, patch: Partial<Omit<Person, 'id'>>) => void;
  removePerson: (familyId: string, personId: string) => void;

  setTemplate: (patch: Partial<MessageTemplate>) => void;
  resetTemplate: () => void;
  setOptions: (patch: Partial<AppData['options']>) => void;
  setEmailJs: (patch: Partial<EmailJsConfig>) => void;

  setDraw: (draw: StoredDraw) => void;
  clearDraw: () => void;
  setSendStatus: (personId: string, state: SendState, error?: string) => void;

  setStep: (step: StepId) => void;
  loadSample: () => void;
  importBackup: (backup: BackupFile) => void;
  resetAll: () => void;
}

const initialData = (): AppData => ({
  families: [],
  template: { ...DEFAULT_TEMPLATE },
  options: { avoidMutual: true },
  emailjs: { serviceId: '', templateId: '', publicKey: '' },
  draw: null,
  sendStatus: {},
  step: 'families',
});

const mapFamily = (families: Family[], familyId: string, fn: (f: Family) => Family) =>
  families.map((f) => (f.id === familyId ? fn(f) : f));

export const useAppStore = create<AppData & AppActions>()(
  persist(
    (set) => ({
      ...initialData(),

      addFamily: () => {
        const id = randomId();
        set((s) => ({ families: [...s.families, { id, name: '', members: [] }] }));
        return id;
      },
      updateFamily: (familyId, patch) =>
        set((s) => ({ families: mapFamily(s.families, familyId, (f) => ({ ...f, ...patch })) })),
      removeFamily: (familyId) => set((s) => ({ families: s.families.filter((f) => f.id !== familyId) })),

      addPerson: (familyId, kind) => {
        const id = randomId();
        set((s) => ({
          families: mapFamily(s.families, familyId, (f) => ({
            ...f,
            members: [...f.members, { id, name: '', email: '', kind }],
          })),
        }));
        return id;
      },
      updatePerson: (familyId, personId, patch) =>
        set((s) => ({
          families: mapFamily(s.families, familyId, (f) => ({
            ...f,
            members: f.members.map((m) => (m.id === personId ? { ...m, ...patch } : m)),
          })),
        })),
      removePerson: (familyId, personId) =>
        set((s) => ({
          families: mapFamily(s.families, familyId, (f) => ({
            ...f,
            members: f.members.filter((m) => m.id !== personId),
          })),
        })),

      setTemplate: (patch) => set((s) => ({ template: { ...s.template, ...patch } })),
      resetTemplate: () => set((s) => ({ template: { ...DEFAULT_TEMPLATE, budget: s.template.budget, eventDate: s.template.eventDate } })),
      setOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),
      setEmailJs: (patch) => set((s) => ({ emailjs: { ...s.emailjs, ...patch } })),

      setDraw: (draw) => set({ draw, sendStatus: {} }),
      clearDraw: () => set({ draw: null, sendStatus: {} }),
      setSendStatus: (personId, state, error) =>
        set((s) => ({ sendStatus: { ...s.sendStatus, [personId]: { state, at: new Date().toISOString(), error } } })),

      setStep: (step) => set({ step }),
      loadSample: () => set({ families: createSampleFamilies(), draw: null, sendStatus: {}, step: 'families' }),
      importBackup: (backup) =>
        set((s) => ({
          ...initialData(),
          emailjs: s.emailjs,
          families: backup.families,
          template: { ...DEFAULT_TEMPLATE, ...backup.template },
          options: { ...initialData().options, ...backup.options },
          draw: backup.draw ?? null,
        })),
      // Konfigurację EmailJS zostawiamy — to ustawienie organizatora, nie danych losowania.
      resetAll: () => set((s) => ({ ...initialData(), emailjs: s.emailjs })),
    }),
    {
      name: 'secret-santa',
      version: 1,
      partialize: (s): AppData => ({
        families: s.families,
        template: s.template,
        options: s.options,
        emailjs: s.emailjs,
        draw: s.draw,
        sendStatus: s.sendStatus,
        step: s.step,
      }),
    },
  ),
);
