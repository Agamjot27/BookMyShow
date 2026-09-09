"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import styles from "./ui-dialog.module.css";

export function UiDialog({ open, title, onClose, children, variant = "default" }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode; variant?: "default" | "city" | "drawer";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.dataset.closing = "false";
      if (!dialog.open) dialog.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = previous; };
    }
    if (dialog.open) {
      dialog.dataset.closing = "true";
      const timer = setTimeout(() => dialog.close(), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
      return () => clearTimeout(timer);
    }
  }, [open]);
  return (
    <dialog ref={ref} className={`${styles.dialog} ${styles[variant] ?? ""}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
      <div className={styles.heading}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button>
      </div>
      {children}
    </dialog>
  );
}
