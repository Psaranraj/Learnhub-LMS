import type { ReactNode } from 'react';

const POINTS = [
  'Free courses taught by instructors',
  'A quiz after every topic, 8 of 10 to pass',
  'A certificate after your assignment is graded and approved',
];

type Props = { title: string; sub: string; heading: string; text: string; children: ReactNode };

export function AuthShell({ title, sub, heading, text, children }: Props) {
  return (
    <div className="mx-auto mt-2.5 grid max-w-[960px] overflow-hidden rounded-[18px] border border-ln bg-white shadow-card md:grid-cols-2">
      <div className="hidden flex-col justify-center gap-[22px] bg-nv px-9 py-10 text-white md:flex">
        <div className="flex items-center gap-2.5 text-lg font-extrabold">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[11px] bg-p">L</span>
          LearnHub
        </div>
        <h2 className="m-0 text-[28px] leading-tight tracking-[-1px]">{heading}</h2>
        <p className="m-0 text-[13px] leading-relaxed text-[#c9c8e0]">{text}</p>
        {POINTS.map((p) => (
          <div key={p} className="flex items-start gap-2.5 text-xs leading-normal text-[#e4e3f4]">
            <b>✓</b>
            {p}
          </div>
        ))}
      </div>
      <div className="px-5 py-[26px] md:px-9 md:pb-[30px] md:pt-9">
        <h1 className="m-0 mb-1 text-2xl font-extrabold tracking-[-0.8px]">{title}</h1>
        <p className="mb-3 text-[11px] leading-normal text-mu">{sub}</p>
        {children}
      </div>
    </div>
  );
}
