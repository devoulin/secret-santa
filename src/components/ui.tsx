import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'glass';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-red-600 text-white shadow-sm shadow-red-900/20 hover:bg-red-700 active:bg-red-800',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 hover:ring-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'text-red-600 hover:bg-red-50',
  success: 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20 hover:bg-emerald-700',
  glass: 'bg-white/10 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/20',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-7 py-3.5 text-lg',
};

/** Klasy przycisku — do użycia także na <a> (np. linki mailto). */
export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return [
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500',
    'disabled:opacity-50 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function IconButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={props.title}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<Tone, string> = {
  info: 'bg-sky-50 text-sky-900 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  error: 'bg-red-50 text-red-900 ring-red-200',
};

const TONE_ICONS: Record<Tone, string> = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '⛔' };

export function Alert({ tone = 'info', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl p-4 text-sm ring-1 ${TONES[tone]}`}>
      <span aria-hidden className="text-base leading-5">
        {TONE_ICONS[tone]}
      </span>
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 outline-none transition ' +
  'placeholder:text-slate-400 hover:ring-slate-400 focus:ring-2 focus:ring-red-500';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function StepHeader({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-1.5 max-w-3xl text-slate-600">{description}</p>
    </div>
  );
}
