import React from "react";

/**
 * "Data through: <bold date>" label — shared markup for chart footers,
 * StatGrid's footer, and the neighborhood map footnotes so the phrasing
 * and weight stay in sync across all of them. Renders nothing if there's
 * no date to show.
 */
const DataAsOf = ({ date }) => {
  if (!date) return null;
  return (
    <>
      Data through: <span className="font-semibold">{date}</span>
    </>
  );
};

export default DataAsOf;
