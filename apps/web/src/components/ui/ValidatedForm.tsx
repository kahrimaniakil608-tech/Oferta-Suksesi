'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormHTMLAttributes } from 'react';

type Issue = { id: string; label: string; message: string };
export default function ValidatedForm({children, onSubmit, onInput, ...props}: FormHTMLAttributes<HTMLFormElement>) {
  const prefix = useId();
  const summary = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [issues, setIssues] = useState<Issue[]>([]);
  useEffect(() => { if (issues.length) summary.current?.focus(); }, [attempt]);
  function clear(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
    control.removeAttribute('aria-invalid');
    const description = (control.getAttribute('aria-describedby') ?? '').split(' ').filter(id => id !== `${control.id}-validation`).join(' ');
    if (description) control.setAttribute('aria-describedby', description); else control.removeAttribute('aria-describedby');
  }
  return <form {...props} noValidate onInvalid={event => event.preventDefault()} onInput={event => {
    const control = event.target as HTMLInputElement;
    if (control.validity?.valid) { clear(control); setIssues(old => old.filter(issue => issue.id !== control.id)); }
    onInput?.(event);
  }} onSubmit={event => {
    const controls = Array.from(event.currentTarget.elements).filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement);
    const next: Issue[] = [];
    controls.forEach((control, index) => {
      if (!control.willValidate || control.validity.valid) { clear(control); return; }
      if (!control.id) control.id = `${prefix}-${index}`;
      const label = control.getAttribute('aria-label') || Array.from(control.labels ?? []).map(label => label.textContent).join(' ') || control.name || 'Fusha';
      const v = control.validity;
      const message = v.valueMissing ? 'Plotësoni këtë fushë.' : v.typeMismatch ? 'Vendosni një vlerë në formatin e kërkuar.' : v.tooShort ? `Përdorni të paktën ${(control as HTMLInputElement).minLength} karaktere.` : v.rangeUnderflow || v.rangeOverflow ? 'Vlera është jashtë kufijve të lejuar.' : v.patternMismatch ? 'Kontrolloni formatin e kësaj vlere.' : 'Kontrolloni vlerën e kësaj fushe.';
      control.setAttribute('aria-invalid', 'true');
      const ids = new Set((control.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)); ids.add(`${control.id}-validation`); control.setAttribute('aria-describedby', [...ids].join(' '));
      next.push({id: control.id, label, message});
    });
    setIssues(next); setAttempt(n => n+1);
    if (next.length) { event.preventDefault(); return; }
    if (onSubmit) { event.preventDefault(); onSubmit(event); }
  }}>
    {issues.length > 0 && <div ref={summary} tabIndex={-1} role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-4 text-sm">
      <p className="font-bold">Kontrolloni fushat përpara dërgimit:</p>
      <ul className="list-disc pl-5">{issues.map(issue => <li key={issue.id} id={`${issue.id}-validation`}><button type="button" className="underline text-left" onClick={() => document.getElementById(issue.id)?.focus()}>{issue.label}: {issue.message}</button></li>)}</ul>
    </div>}
    {children}
  </form>;
}
