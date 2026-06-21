import { tokens } from "../styles/tokens";
import { virusRegistry, toDisplayVirus } from "./virusRegistry";

// Build a lookup from any name variant (including sourceName) → registry entry
const virusByAnyName = {};
Object.values(virusRegistry).forEach((v) => {
  virusByAnyName[v.displayName] = v;
  if (v.sourceName && v.sourceName !== v.displayName) {
    virusByAnyName[v.sourceName] = v;
  }
});

// Regex matches longest names first to avoid "Flu" matching inside "Influenza"
const VIRUS_PATTERN = /(COVID-19|Influenza|Flu|RSV|ARI)/g;

export function colorizeVirusInTitle(title) {
  if (typeof title !== "string" || !title) return title;

  return title.replace(VIRUS_PATTERN, (match) => {
    const meta = virusByAnyName[match];
    const key = meta?.colorScaleKey;
    const scale = key ? tokens.colorScales?.[key] : null;
    const color = Array.isArray(scale) ? scale[1] : undefined;
    const cls = `virus-label virus-${key || "unknown"}`;
    const style = color ? ` style="color:${color}"` : "";
    return `<span class="${cls}"${style}>${match}</span>`;
  });
}
