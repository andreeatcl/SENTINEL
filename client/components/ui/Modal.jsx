import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./Button";
import { CloseIcon } from "./icons";

const WIDTHS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
  mdWithSidebar: "max-w-[44rem]",
};

const openModals = [];

export default function Modal({
  isOpen = true,
  onClose,
  title,
  subtitle,
  headerActions,
  footer,
  width = "md",
  zIndex = "z-[2000]",
  sidebar,
  topOnPhones,
  children,
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const entry = {};
    openModals.push(entry);
    function handleKey(e) {
      if (e.key === "Escape" && openModals[openModals.length - 1] === entry) {
        onCloseRef.current();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      openModals.splice(openModals.indexOf(entry), 1);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndex} flex items-center ${topOnPhones ? "max-sm:items-start" : ""} justify-center bg-black/70 backdrop-blur-sm px-3 pt-16 pb-3 animate-fade-in`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${WIDTHS[width]} ${
          sidebar ? "h-[min(85dvh,44rem,100%)]" : "max-h-[min(85dvh,100%)]"
        } flex flex-col bg-carbon-900 border border-carbon-800 rounded-xl shadow-panel animate-pop-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-carbon-800 shrink-0">
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-white leading-snug">
              {title}
            </h2>
            {subtitle && (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-carbon-400 mt-1">
                {subtitle}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 -mr-2 -mt-1 shrink-0">
            {headerActions}
            <IconButton label="Close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>

        {sidebar ? (
          <div className="flex-1 min-h-0 flex">
            {/* hidden on phone */}
            <aside className="hidden sm:block w-48 shrink-0 border-r border-carbon-800 overflow-y-auto">
              {sidebar}
            </aside>
            <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">{children}</div>
        )}

        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-carbon-800 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
