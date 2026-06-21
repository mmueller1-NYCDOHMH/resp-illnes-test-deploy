import React from "react";
import { getText } from "../../utils/contentUtils";
import InfoCard from "../cards/InfoCard";
import overviewGridItems from "./OverviewGrid.config";
import "./OverviewGrid.css"; // retains only: cross-component .info-card-link sizing + reduced-motion
import { resolveAsset } from "../../utils/pathUtils";

const OverviewGrid = () => (
  <section className="w-full">
    <div className="overview-grid-container w-full mx-auto py-md px-lg box-border shadow-md rounded-lg bg-white">
      <div>
        <h2 className="text-left text-lg font-heading text-[var(--content-title-color)] font-bold tracking-[0.01em]">
          {getText("overviewBottomNav.title")}
        </h2>
      </div>

      <div className="overview-grid flex flex-wrap justify-between gap-xl w-full items-stretch max-[1119px]:justify-center max-[1119px]:gap-lg max-[1119px]:px-sm">
        {overviewGridItems.map(({ labelKey, descriptionKey, link, icon, showExternalIcon }, i) => {
          const isExternal = link?.startsWith("http");
          const externalIcon =
            isExternal && (showExternalIcon ?? true) ? resolveAsset('assets/external-link-icon.png') : "";

          return (
            <InfoCard
              key={i}
              title={getText(labelKey)}
              description={descriptionKey ? getText(descriptionKey) : ""}
              link={link}
              icon={icon}
              externalIcon={externalIcon}
            />
          );
        })}
      </div>
    </div>
  </section>
);

export default OverviewGrid;
