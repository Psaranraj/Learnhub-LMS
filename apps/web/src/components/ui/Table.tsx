import type { ReactNode } from 'react';

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-ln p-2.5 text-left text-xs font-bold tracking-[0.4px] text-mu">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const Td = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
  <td className={`border-b border-ln px-2.5 py-3 align-middle ${className}`}>{children}</td>
);
