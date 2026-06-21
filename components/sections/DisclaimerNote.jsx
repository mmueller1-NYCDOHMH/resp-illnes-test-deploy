import React from "react";
import { getText } from "../../utils/contentUtils";

const DisclaimerNote = ({ textKey }) => {
  if (!textKey) return null;
  const html = getText(textKey) || "";
  return (
    <p
      className="text-sm text-gray-600 leading-relaxed body-links [&_a]:font-normal"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default DisclaimerNote;
