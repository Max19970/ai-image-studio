import type { SVGProps } from 'react';
import styles from './DisclosureChevron.module.css';

export type DisclosureChevronDirection = 'up' | 'down' | 'left' | 'right';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  direction?: DisclosureChevronDirection;
}

export function DisclosureChevron({ direction = 'down', className, ...props }: Props) {
  return (
    <svg
      {...props}
      className={`${styles.icon} ${className ?? ''}`}
      data-direction={direction}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4.25 6.25 8 10l3.75-3.75" />
    </svg>
  );
}
