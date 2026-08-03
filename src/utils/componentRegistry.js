/**
 * componentRegistry
 *
 * Maps string component names (as used in page config objects) to the actual
 * React components they refer to.
 *
 * Config sections declare components by name string:
 *   { renderAs: "custom", component: "CombinedVirusChart", ... }
 *
 * Previously this map lived inline inside ConfigDrivenPage and was re-declared
 * identically in CustomSection.  It is now the single source of truth.
 *
 * To add a new custom section component:
 *   1. Import it here
 *   2. Add a single entry below
 *   No other file needs to change.
 */

import dynamic from "next/dynamic";
import StatGrid from "../components/grids/StatGrid";
import OverviewGrid from "../components/grids/OverviewGrid";
import CombinedVirusChart from "../components/charts/CombinedVirusChart";
import DynamicParagraph from "../components/sections/DynamicParagraph";
import SeasonalBullet from "../components/bullets/SeasonalBullet";
import WastewaterChart from "../components/charts/WastewaterChart";
import DisclaimerNote from "../components/sections/DisclaimerNote";

// Leaflet maps touch `window` at module load time — must be client-only.
const NeighborhoodMap = dynamic(
  () => import("../components/maps/NeighborhoodMap"),
  { ssr: false }
);
const LabCasesNeighborhoodMap = dynamic(
  () => import("../components/maps/LabCasesNeighborhoodMap"),
  { ssr: false }
);

const componentRegistry = {
  StatGrid,
  OverviewGrid,
  CombinedVirusChart,
  DynamicParagraph,
  SeasonalBullet,
  NeighborhoodMap,
  LabCasesNeighborhoodMap,
  WastewaterChart,
  DisclaimerNote,
};

export default componentRegistry;
