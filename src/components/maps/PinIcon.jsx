/**
 * PinIcon
 *
 * Small pin glyph used by the "pin to compare" affordance on the
 * neighborhood choropleth maps (NeighborhoodMap on the home page,
 * LabCasesNeighborhoodMap on the virus data pages). Filled = pinned,
 * outline = not pinned.
 */
const PinIcon = ({ filled = false, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    {filled ? (
      <path
        d="M9.5 1.5a1 1 0 0 1 1 1v.94l2.06 2.06A1 1 0 0 1 13 6.5v.5a1 1 0 0 1-1 1H9.5v4l-1.5 2-1.5-2V8H4a1 1 0 0 1-1-1v-.5a1 1 0 0 1 .44-.83L5.5 3.44V2.5a1 1 0 0 1 1-1h3Z"
        fill="currentColor"
      />
    ) : (
      <path
        d="M9.5 1.5a1 1 0 0 1 1 1v.94l2.06 2.06A1 1 0 0 1 13 6.5v.5a1 1 0 0 1-1 1H9.5v4l-1.5 2-1.5-2V8H4a1 1 0 0 1-1-1v-.5a1 1 0 0 1 .44-.83L5.5 3.44V2.5a1 1 0 0 1 1-1h3Z"
        stroke="currentColor" strokeWidth="1.2" fill="none"
      />
    )}
  </svg>
);

export default PinIcon;
