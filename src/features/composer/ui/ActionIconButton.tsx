import type { Ref } from 'react';
import styles from './ActionIconButton.module.css';

interface ActionIconButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
  testId?: string;
}

export function ActionIconButton({ icon, label, active = false, onClick, buttonRef, testId }: ActionIconButtonProps) {
  return (
    <button ref={buttonRef} type="button" className={`${styles.button} ${active ? styles.active : ''}`} data-tooltip={label} data-testid={testId} aria-label={label} onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
