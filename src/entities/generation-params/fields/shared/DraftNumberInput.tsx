import { useEffect, useState } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  className?: string;
  step?: number;
}

function canParseNumberDraft(value: string) {
  const trimmed = value.trim();
  return trimmed !== '' && trimmed !== '-' && trimmed !== '+' && trimmed !== '.' && trimmed !== '-.' && trimmed !== '+.';
}

export function DraftNumberInput({ value, onChange, ariaLabel, className, step = 1 }: Props) {
  const [draft, setDraft] = useState(() => String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [focused, value]);

  const handleDraftChange = (nextDraft: string) => {
    setDraft(nextDraft);
    if (!canParseNumberDraft(nextDraft)) return;

    const nextValue = Number(nextDraft);
    if (Number.isFinite(nextValue)) onChange(nextValue);
  };

  return (
    <input
      aria-label={ariaLabel}
      className={className}
      type="number"
      step={step}
      value={draft}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        if (!canParseNumberDraft(draft) || !Number.isFinite(Number(draft))) setDraft(String(value));
      }}
      onChange={(event) => handleDraftChange(event.target.value)}
    />
  );
}
