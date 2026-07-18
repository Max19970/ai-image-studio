import { ChevronDownIcon, type IconProps } from '../Icon';
import styles from './DisclosureChevron.module.css';

export type DisclosureChevronDirection = 'up' | 'down' | 'left' | 'right';

interface Props extends Omit<IconProps, 'children'> {
  direction?: DisclosureChevronDirection;
}

export function DisclosureChevron({ direction = 'down', className, ...props }: Props) {
  return (
    <ChevronDownIcon
      {...props}
      className={`${styles.icon} ${className ?? ''}`}
      data-direction={direction}
    />
  );
}
