import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

export function Modal({ open, title, onClose, children, wide }: Props) {
  const box = useRef<HTMLDivElement>(null);
  // Pages pass a new onClose function on every render (onClose={() => setForm(null)}). Keeping it in a ref lets the
  // effect below run only when the modal opens or closes. If onClose were a dependency, every keystroke in a field
  // would re-run the effect, move focus back to the dialog box, and the field would keep only the first letter.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[9] grid place-items-center bg-[#0e102080] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full ${wide ? 'max-w-[880px]' : 'max-w-[520px]'} overflow-auto rounded-[14px] bg-white p-[22px] outline-none`}
      >
        <h2 className="mb-3.5 text-base font-extrabold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-3.5 flex justify-end gap-2">{children}</div>;
}
