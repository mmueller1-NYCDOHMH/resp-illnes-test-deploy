import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

const ChartModal = ({ title, isOpen, onClose, children, maxWidth = 980 }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement;

    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusables = ref.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables?.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    const raf = requestAnimationFrame(() =>
      ref.current?.querySelector(".modal-close")?.focus()
    );

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKey);
      prev?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-[var(--chart-bg)] w-full max-h-[90vh] overflow-auto rounded-[12px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] p-4 pb-2 flex flex-col md:rounded-[10px]"
        style={{ maxWidth }}
      >
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-200 mb-3">
          <h3 className="m-0 text-[18px] font-semibold text-[var(--chart-title-color)]">{title}</h3>
          <button
            className="modal-close border-0 bg-transparent cursor-pointer p-[6px] leading-none inline-flex items-center justify-center text-gray-700 hover:text-gray-900 transition-colors duration-200"
            onClick={onClose}
            aria-label="Close large chart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="text-sm text-gray-700">{children}</div>
      </div>
    </div>
  );
};

ChartModal.propTypes = {
  title: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  maxWidth: PropTypes.number,
};

export default ChartModal;
