import type { ButtonHTMLAttributes } from 'react';

const styles = {
  default: 'border-[#d9d8e8] bg-white text-ink',
  pri: 'border-p bg-p text-white',
  soft: 'border-lv bg-lv text-p',
  danger: 'border-[#f3c2cb] bg-white text-[#b0293d]',
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof styles };

export function Button({ variant = 'default', className = '', ...rest }: Props) {
  return (
    <button
      className={`rounded-[9px] border px-[13px] py-[9px] text-xs font-bold hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}
