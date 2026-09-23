"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/site";

/**
 * Mobile navigation drawer. Plain disclosure (not yet a Radix dialog) — the
 * shadcn/ui primitives land with the catalog pages (plan phase 3); keyboard
 * and reduced-motion behavior are already in place.
 */
export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-btn border border-line bg-white"
      >
        <span className="sr-only">{open ? "Закрыть меню" : "Открыть меню"}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          {open ? (
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-ink/25"
          />
          <div
            ref={panelRef}
            id="mobile-menu"
            className="fixed top-0 right-0 z-40 flex h-dvh w-72 flex-col gap-1 rounded-l-panel border-l border-line bg-white p-4 shadow-lift motion-safe:animate-[drawer-in_200ms_ease]"
          >
            <p className="px-3 pt-2 pb-4 text-lg font-extrabold">Меню</p>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-btn px-3 py-3 text-base font-bold hover:bg-soft"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
