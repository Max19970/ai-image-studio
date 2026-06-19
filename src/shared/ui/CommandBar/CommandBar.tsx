import type { HTMLAttributes, ReactNode } from 'react';
import styles from './CommandBar.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export type CommandBarDensity = 'comfortable' | 'compact' | 'touch';
export type CommandBarAlign = 'start' | 'center' | 'between' | 'end';

export interface CommandBarProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: 'div' | 'header' | 'nav' | 'section';
  density?: CommandBarDensity;
  align?: CommandBarAlign;
  wrap?: boolean;
}

export function CommandBar({
  children,
  as: Component = 'div',
  density = 'comfortable',
  align = 'between',
  wrap = true,
  className,
  ...props
}: CommandBarProps) {
  return (
    <Component
      className={cx(styles.bar, styles[density], styles[align], wrap && styles.wrap, className)}
      {...props}
    >
      {children}
    </Component>
  );
}
