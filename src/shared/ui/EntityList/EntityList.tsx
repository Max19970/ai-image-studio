import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import styles from './EntityList.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export type EntityListDensity = 'comfortable' | 'compact' | 'touch';

export interface EntityListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  density?: EntityListDensity;
}

export interface EntityListItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
}

export function EntityList({ children, density = 'compact', className, ...props }: EntityListProps) {
  return <div className={cx(styles.list, styles[density], className)} {...props}>{children}</div>;
}

export function EntityListItem({
  title,
  description,
  meta,
  leading,
  trailing,
  selected = false,
  className,
  ...props
}: EntityListItemProps) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cx(styles.item, selected && styles.selected, className)}
      aria-pressed={selected}
      {...props}
    >
      {leading && <span className={styles.leading}>{leading}</span>}
      <span className={styles.copy}>
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      {(meta || trailing) && (
        <span className={styles.side}>
          {meta && <span className={styles.meta}>{meta}</span>}
          {trailing}
        </span>
      )}
    </button>
  );
}
