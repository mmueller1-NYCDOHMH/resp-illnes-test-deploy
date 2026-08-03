import React from "react";
import PropTypes from "prop-types";

// "info-card" and "info-card-link" are marker classes:
//   AboutPageLayout.css  targets .info-card for ::before accent + hover
//   OverviewGrid.css     targets .overview-grid .info-card-link for sizing
//
// accentColor (optional): overrides the default blue top-border accent set
// in AboutPageLayout.css, e.g. per-virus colors on the "Find health
// information..." cards. Passed through as a CSS variable so the ::before
// rule can stay in CSS.

const InfoCard = ({ title, icon, description, link, externalIcon, accentColor }) => {
  const content = (
    <div
      className="info-card flex flex-col bg-white p-lg rounded-xl border border-[var(--gray-200)] shadow-[0_2px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] transition-shadow duration-200 text-left font-body hover:shadow-[0_4px_16px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.06)]"
      style={
        accentColor
          ? { "--card-accent-color": accentColor, "--card-accent-opacity": 1 }
          : undefined
      }
    >
      <div className="flex flex-row justify-between gap-3 mb-sm w-full">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <img
              className="info-card-icon h-[30px] shrink-0 [filter:var(--img-filter)]"
              src={icon}
              alt={`${title} icon`}
            />
          )}
        </div>
        {externalIcon && (
          <img
            className="flex flex-row items-end w-4 h-4 opacity-85 shrink-0 [filter:var(--img-filter)]"
            src={externalIcon}
            alt="Opens external resource"
          />
        )}
      </div>
      <h3 className="info-card-title text-[var(--content-title-size,var(--font-size-lg))] font-semibold m-0 text-gray-900">{title}</h3>
      <p className="info-card-description text-body leading-relaxed text-gray-800">{description}</p>
    </div>
  );

  return link ? (
    <a href={link} className="info-card-link block no-underline text-inherit flex-[1_1_250px]" target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    content
  );
};

InfoCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string,
  description: PropTypes.string.isRequired,
  link: PropTypes.string,
  externalIcon: PropTypes.string,
  accentColor: PropTypes.string,
};

export default InfoCard;
