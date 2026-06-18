import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'default' | 'compact' | 'micro';
type ButtonTone = 'neutral' | 'danger' | 'accent';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

interface BaseButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  fullWidth?: boolean;
  className?: string;
}

type NativeButtonProps = BaseButtonProps & ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: undefined;
};

type AnchorButtonProps = BaseButtonProps & AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export type ButtonProps = NativeButtonProps | AnchorButtonProps;

export function Button({
  children,
  variant = 'secondary',
  size = 'default',
  tone = 'neutral',
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  const buttonClassName = cx(
    styles.button,
    styles[variant],
    size !== 'default' && styles[size],
    tone !== 'neutral' && styles[tone],
    fullWidth && styles.fullWidth,
    className
  );

  if ('href' in props && props.href) {
    const { href, ...anchorProps } = props;
    return <a className={buttonClassName} href={href} {...anchorProps}>{children}</a>;
  }

  const nativeProps = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return <button type={nativeProps.type ?? 'button'} className={buttonClassName} {...nativeProps}>{children}</button>;
}
