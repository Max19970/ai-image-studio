import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from '../../shared/ui';

type Tone = 'primary' | 'secondary' | 'danger-soft' | 'ghost';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  children: ReactNode;
}

export function ActionButton({ tone = 'secondary', children, ...props }: ActionButtonProps) {
  if (tone === 'primary') return <Button variant="primary" {...props}>{children}</Button>;
  if (tone === 'danger-soft') return <Button variant="secondary" tone="danger" {...props}>{children}</Button>;
  if (tone === 'ghost') return <Button variant="ghost" {...props}>{children}</Button>;
  return <Button variant="secondary" {...props}>{children}</Button>;
}
