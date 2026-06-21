import React from "react";
import PropTypes from "prop-types";
import InfoCard from "./InfoCard";

const MarkdownCardSection = ({ title, sectionSubtitle, cards = [] }) => (
  <section className="card-section">
    {title && (
      <h2 className="text-[clamp(1.2rem,1.4rem+0.3vw,1.6rem)] font-bold text-gray-900 leading-tight mb-2">
        {title}
      </h2>
    )}
    {sectionSubtitle && (
      <h3 className="text-[1rem] font-semibold text-gray-700 mb-lg leading-relaxed">
        {sectionSubtitle}
      </h3>
    )}
    <div className="card-grid">
      {cards.map((card, idx) => (
        <InfoCard key={card.id || idx} {...card} />
      ))}
    </div>
  </section>
);

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
