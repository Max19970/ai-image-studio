import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './NavigationButton.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export interface NavigationButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: ReactNode;
  variant?: 'list' | 'rail' | 'card' | 'mobile';
}

export function NavigationButton({
  active = false,
  icon,
  variant = 'list',
  children,
  className,
  ...props
}: NavigationButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cx(styles.button, styles[variant], active && styles.active, className)}
      {...props}
    >
      {icon !== undefined && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      {variant === 'rail' ? null : <span className={styles.label}>{children}</span>}
    </button>
  );
}
