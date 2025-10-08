'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { dashboard, selectors, useDashboard } from '@/stores/dashboard';

const SAVE_DELAY = 600;

export function NotesCard() {
  const notes = useDashboard(selectors.notes);
  const [draft, setDraft] = useState(() => (typeof notes === 'string' ? notes : ''));
  const [status, setStatus] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setDraft(typeof notes === 'string' ? notes : '');
    }
  }, [notes]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const scheduleSave = (value: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setStatus('Saving…');
    timerRef.current = setTimeout(() => {
      dashboard.updateNotes(value);
      setStatus(value ? 'Saved' : '');
      timerRef.current = null;
    }, SAVE_DELAY);
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setDraft(value);
    scheduleSave(value);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    if (!timerRef.current && !draft) {
      setStatus('');
    }
  };

  return (
    <section className="card notes-card">
      <header className="notes-card__header">
        <h2>Notes</h2>
        <p>Recommendations will appear later (based on Energy / SRV / Stress).</p>
      </header>
      <label className="notes-card__field">
        <span className="visually-hidden">Notes</span>
        <textarea
          rows={4}
          data-notes
          placeholder="Add personal observations..."
          spellCheck={false}
          value={draft}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <span className="notes-card__status" aria-live="polite" data-status>
          {status}
        </span>
      </label>
    </section>
  );
}

export default NotesCard;
