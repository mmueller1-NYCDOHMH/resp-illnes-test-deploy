const colors = {
  // Grayscale
  white: "#FFFFFF",
  black: "#000000",
  // footnoteGray: "#687482",
  gray100: "#F9FAFB",
  gray200: "#F3F4F6",
  gray300: "#E5E7EB",
  gray400: "#D1D5DB",
  gray500: "#9CA3AF", 
  gray600: "#6B7280",
  gray700: "#4B5563",
  gray800: "#374151",
  gray900: "#1F2937",
  grayTransparent: "rgba(0, 0, 0, 0)",

  // Main / Accent
  bluePrimary: "#387781",
  blueSecondary: "#629FAA",
  blueAccent: "#1E40AF",
  purplePrimary: "#8739B7",
  purpleBackground: "#F6A1FF",
  purpleAccent: "#BC6AEB",
  greenPrimary: "#065F46",
  greenAccent: "#139D72",
  greenMuted: "#059669",
  orangeText: "#91401A",
  orangePrimary: "#FF6600",
  orangeAccent: "#B36C31",
  orangeMuted: "#FF6C0B",
  redPrimary: "#AF233F",
  redAccent: "#DC2626",
  redMuted: "#F87171",
  tealPrimary: "#387781",
  
  // Semantic backgrounds
bgLightBlue:   "#08519C26",
bgTeal: "#387781",
bgLightPurple: "#4A148624",
  // bgLightBlue: "#EFF6FF",
  bgLightGreen: "#00441A26",
  bgLightOrange: "#AA4C3466",
  bgLightRed: "#AF233F66",
  // bgLightPurple: "#F5F3FF",
  bgMutedPink: "#F4C4A5",
  bgMutedPurple: "#F5F3FF",
  bgMutedGray: "#ADAEBC",
  bgLightTeal: "#38778166",
  bgOrange: "#AA4C34",
  bgPurple: "#8739B7",
  bgBlue: "#2248c5",
};

const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
};

const typography = {
  body: '"Inter", sans-serif',
  heading: '"Inter", sans-serif',
  fontSizeBase: "14px",
  fontSizeLg: "18px",
  weightBold: "bold" 
};

const radii = {
  sm: "4px",
  md: "6px",
  lg: "8px",
};

const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 6px rgba(0,0,0,0.1)",
};

const colorScales = {
covid: [ 
  "#520583", 
  "#1F003D", 
  "#8739B7", 
  "#BC6AE8", 
  "#A020C8" 
], 

flu: [ 
  "#03515B", 
  "#002B35",
  "#387781", 
  "#629FAA",  
  "#2F8F9D"
], 

rsv: [ 
  "#570000",  
  "#812816", 
  "#AA4C34", 
  "#D47056", 
  "#B5523A" 
],
  ari: ["#26A69A"]
};

export const tokens = {
  colors,
  spacing,
  typography,
  radii,
  shadows,
  colorScales,
};
