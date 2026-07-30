import React from "react";
import PropTypes from "prop-types";
import InfoCard from "./InfoCard";

const MarkdownCardSection = ({ title, sectionSubtitle, cards = [] }) => {
  // When a section has no title, its subtitle is the only heading-level text
  // on the card — render it at the same size/weight as every other section
  // heading on the page instead of the smaller secondary-subtitle style.
  const subtitleActsAsHeading = !title && !!sectionSubtitle;

  return (
    <section className="card-section">
      {title && (
        <h2 className="text-[clamp(1.2rem,1.4rem+0.3vw,1.6rem)] font-semibold text-gray-900 leading-tight mb-2">
          {title}
        </h2>
      )}
      {sectionSubtitle && (
        subtitleActsAsHeading ? (
          <h2 className="text-[clamp(1.2rem,1.4rem+0.3vw,1.6rem)] font-semibold text-gray-900 leading-tight mb-lg">
            {sectionSubtitle}
          </h2>
        ) : (
          <h3 className="text-[1rem] font-semibold text-gray-700 mb-lg leading-relaxed">
            {sectionSubtitle}
          </h3>
        )
      )}
      <div className="card-grid">
        {cards.map((card, idx) => (
          <InfoCard key={card.id || idx} {...card} />
        ))}
      </div>
    </section>
  );
};

MarkdownCardSection.propTypes = {
  title: PropTypes.string,
  sectionSubtitle: PropTypes.string,
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      link: PropTypes.string,
      icon: PropTypes.string,
      externalIcon: PropTypes.string,
    })
  ).isRequired,
};

export default MarkdownCardSection;
