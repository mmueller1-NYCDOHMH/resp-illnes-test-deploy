import React from "react";
import { getText } from "../../utils/contentUtils";
import MarkdownRenderer from "../contentUtils/MarkdownRenderer";

/**
 * DisclaimerNote
 *
 * Renders a small disclaimer paragraph.
 * Accepts either:
 *   - markdownPath — path to a .md file (preferred: edit content/overview-disclaimer.md)
 *   - textKey      — dot-path key into text.json (legacy, still supported)
 */
const DisclaimerNote = ({ markdownPath, textKey, config }) => {
  // When rendered via ConfigDrivenPage, props arrive wrapped in `config`
  markdownPath = markdownPath ?? config?.markdownPath;
  textKey = textKey ?? config?.textKey;
  if (markdownPath) {
    return (
      <div className="text-sm text-gray-600 leading-relaxed body-links [&_a]:font-normal [&_p]:m-0">
        <MarkdownRenderer filePath={markdownPath} showTitle={false} />
      </div>
    );
  }
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
