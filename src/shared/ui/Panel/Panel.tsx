import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Panel.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'tight' | 'comfortable';
}

export function Panel({ children, padding = 'none', className, ...props }: PanelProps) {
  return <div className={cx(styles.panel, padding !== 'none' && styles[padding], className)} {...props}>{children}</div>;
}
