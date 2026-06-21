import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";
import "./InfoModal.css"; // @keyframes scaleIn/scaleOut/backdropIn/backdropOut + 769px–1024px breakpoint

const DURATION = 220; // ms — match keyframe durations below

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const InfoModal = ({ title, content, markdownPath, isOpen, onClose }) => {
  const [mounted, setMounted] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef(null);
  const prevFocusRef = useRef(null);

  // Mount / unmount with exit animation
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, DURATION);
      return () => clearTimeout(t);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus management: save prev focus, auto-focus close btn, restore on close
  useEffect(() => {
    if (!mounted || closing) return;
    prevFocusRef.current = document.activeElement;
    // Focus the close button after the animation frame
    const raf = requestAnimationFrame(() => {
      dialogRef.current?.querySelector(".modal-close-btn")?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      prevFocusRef.current?.focus?.();
    };
  }, [mounted, closing]);

  // Focus trap
  useEffect(() => {
    if (!mounted || closing) return;
    const handleKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const focusables = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE) ?? []);
      if (!focusables.length) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus(); e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus(); e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mounted, closing, onClose]);

  if (!mounted) return null;

  const dur = `${DURATION}ms`;

  return (
    <div
      className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-[1000]"
      style={{
        backgroundColor: "rgba(31,41,55,0.6)",
        animation: `${closing ? "backdropOut" : "backdropIn"} ${dur} ease both`,
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="info-modal bg-[var(--modal-bg,var(--white))] rounded-lg max-w-[480px] w-1/2 p-lg pt-[calc(var(--spacing-lg)+8px)] shadow-md relative box-border md:w-[90%] md:p-lg md:pt-[calc(var(--spacing-lg)+8px)]"
        style={{ animation: `${closing ? "scaleOut" : "scaleIn"} ${dur} ease both` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn absolute top-[6px] right-[6px] bg-transparent border-0 p-[6px] leading-none inline-flex items-center justify-center text-[var(--modal-close,var(--gray-600))] cursor-pointer transition-colors duration-200 z-10 hover:text-[var(--modal-close-hover,var(--gray-900))]"
          onClick={onClose}
          aria-label="Close info popup"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {/* Title intentionally omitted per RPU/Comms decision */}
        <div className="text-[15px] text-[var(--modal-text,var(--gray-800))] leading-[var(--line-height-lg)] max-h-[60vh] overflow-y-auto md:text-sm">
          {markdownPath ? (
            <MarkdownRenderer filePath={markdownPath} />
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );
};

InfoModal.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.node,
  markdownPath: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default InfoModal;
