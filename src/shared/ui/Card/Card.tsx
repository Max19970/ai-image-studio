import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: 'article' | 'section' | 'div';
  interactive?: boolean;
}

export function Card({ children, as: Component = 'div', interactive = false, className, ...props }: CardProps) {
  return <Component className={cx(styles.card, interactive && styles.interactive, className)} {...props}>{children}</Component>;
}
