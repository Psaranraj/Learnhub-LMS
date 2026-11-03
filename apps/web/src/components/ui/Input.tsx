import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Input({ label, ...rest }: Props) {
  return (
    <label className="mb-3 block text-xs font-bold">
      {label}
      <input
        className="mt-[5px] w-full rounded-lg border border-[#d9d8e8] bg-white p-2.5 font-medium text-ink"
        {...rest}
      />
    </label>
  );
}
