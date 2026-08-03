import React from "react";
import PropTypes from "prop-types";

/**
 * ToggleGroup
 *
 * Shared segmented toggle-button control. Consolidates three near-identical
 * components that had drifted apart on accessibility (ToggleControls,
 * DataTypeToggleGroup, ViewToggleGroup — the latter two lived in
 * DataTypeToggleGroup.jsx / VisitAdmitToggle.jsx) into one implementation.
 * Every variant now gets role="group" + aria-label, aria-pressed per button,
 * and a visible focus ring for free — no variant can silently regress again.
 *
 * Variants (pick the one matching the old component you're replacing):
 *  - "pill"    — bordered pill, single-tone active fill. Was ToggleControls;
 *                used inside chart sidebars. Keeps the `toggle-controls` /
 *                `toggle-button` marker classes ChartContainer.css targets
 *                for stack-mode layout — do not rename those.
 *  - "solid"   — rounded-md buttons in a wrapping row. Was DataTypeToggleGroup.
 *  - "stretch" — two flex-1 buttons capped at 340px wide. Was ViewToggleGroup.
 *
 * "solid" and "stretch" keep `data-type-toggle-group` / `view-toggle` marker
 * classes from the originals. No stylesheet in this repo currently targets
 * them (the FloatingTogglePill.css referenced in old comments doesn't exist
 * here) — kept only so a reintroduced stylesheet wouldn't lose its hook.
 */

const VARIANTS = {
  pill: {
    container:
      "toggle-controls inline-flex border border-[var(--gray-300)] rounded-full overflow-hidden bg-white",
    containerStyle: { "--chart-toggle-active-color": "var(--gray-900, #1f2937)" },
    button:
      "toggle-button appearance-none border-0 py-[0.45rem] px-[0.8rem] cursor-pointer text-sm font-semibold leading-tight outline-none transition-[background-color,color] duration-150 focus:outline-none focus-visible:relative focus-visible:z-[1] focus-visible:outline-2 focus-visible:[outline-offset:-2px] focus-visible:outline-[var(--chart-toggle-active-color,#1f2937)]",
    active: "bg-[var(--chart-toggle-active-color,#1f2937)] text-white",
    idle: "bg-transparent text-[var(--gray-700)] hover:bg-[var(--gray-100)]",
  },
  solid: {
    container:
      "data-type-toggle-group flex gap-sm justify-start items-center flex-nowrap w-full overflow-x-auto md:flex-col md:items-stretch md:overflow-x-visible md:gap-2",
    button:
      "view-toggle whitespace-nowrap py-sm px-md text-center border-0 rounded-md text-md font-medium font-body cursor-pointer transition-[background,transform] duration-200 hover:bg-gray-800 hover:text-white hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 md:w-full",
    active: "!bg-gray-900 !text-white",
    idle: "bg-gray-400 text-gray-900",
  },
  stretch: {
    container:
      "flex gap-md justify-end w-full max-w-[340px] md:justify-stretch md:max-w-none md:gap-2",
    button:
      "view-toggle flex-1 text-center border-0 rounded-md cursor-pointer py-sm px-lg text-md font-medium font-body transition-[background,transform] duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
    active: "!bg-gray-900 !text-white",
    idle: "bg-gray-300 text-gray-900",
  },
};

const ToggleGroup = ({ options, value, onChange, ariaLabel, variant = "solid" }) => {
  const styles = VARIANTS[variant] || VARIANTS.solid;

  const handleClick = (optValue) => {
    if (optValue !== value) onChange(optValue);
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={styles.container}
      style={styles.containerStyle}
    >
      {options.map(({ label, value: optValue }) => {
        const active = optValue === value;
        return (
          <button
            key={optValue}
            type="button"
            onClick={() => handleClick(optValue)}
            aria-pressed={active}
            className={`${styles.button} ${active ? styles.active : styles.idle}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

ToggleGroup.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["pill", "solid", "stretch"]),
};

export default ToggleGroup;
