import type { HTMLAttributes, ReactNode } from 'react';
import styles from './SideInspector.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export type SideInspectorDensity = 'comfortable' | 'compact';

export interface SideInspectorProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  density?: SideInspectorDensity;
  sticky?: boolean;
}

export function SideInspector({
  children,
  title,
  description,
  actions,
  density = 'comfortable',
  sticky = false,
  className,
  ...props
}: SideInspectorProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <aside className={cx(styles.inspector, styles[density], sticky && styles.sticky, className)} {...props}>
      {hasHeader && (
        <header className={styles.header}>
          <div className={styles.copy}>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
