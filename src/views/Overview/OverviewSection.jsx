import React from "react";
import PropTypes from "prop-types";
import "./OverviewSection.css"; // retains only: descendant h2/p styles + container * global cascade

const OverviewSection = ({ leftTitle, rightTitle, leftContent, rightContent }) => {
  return (
    <section className="overview-section mt-lg w-full bg-[var(--overview-bg,var(--white))] overflow-x-hidden box-border">
      <div className="overview-container w-full max-w-full p-[var(--overview-padding,var(--spacing-xl))] box-border overflow-x-hidden flex flex-col gap-lg md:p-lg">
        <div className="flex flex-wrap gap-[var(--overview-column-gap,var(--spacing-3xl))] mt-lg w-full md:flex-col md:gap-xl">
          <div className="overview-column flex-[1_1_300px] min-w-0 flex flex-col items-start gap-lg">
            {leftTitle && <h2 className="overview-title">{leftTitle}</h2>}
            {leftContent}
          </div>
          <div className="overview-column flex-[1_1_300px] min-w-0 flex flex-col items-start gap-lg">
            {rightTitle && <h2 className="overview-title">{rightTitle}</h2>}
            {rightContent}
          </div>
        </div>
      </div>
    </section>
  );
};

OverviewSection.propTypes = {
  leftTitle: PropTypes.string,
  rightTitle: PropTypes.string,
  leftContent: PropTypes.node,
  rightContent: PropTypes.node,
};

export default OverviewSection;
