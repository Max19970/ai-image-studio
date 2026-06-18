import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  children: ReactNode;
  'aria-label': string;
  size?: 'default' | 'micro';
  tone?: 'neutral' | 'danger';
}

export function IconButton({ children, size = 'default', tone = 'neutral', className, ...props }: IconButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cx(styles.button, size !== 'default' && styles[size], tone !== 'neutral' && styles[tone], className)}
      {...props}
    >
      {children}
    </button>
  );
}
