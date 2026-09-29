import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { marked } from "marked";
import { resolveContentPath } from '../../utils/pathUtils';
import { interpolateTokens } from '../../utils/contentUtils';
import "./markdown.css";

const stripHtml = (s = "") => s.replace(/<[^>]*>/g, " ");
const collapseWs = (s = "") => s.replace(/\s+/g, " ").trim();
const normalize = (s = "") => collapseWs(stripHtml(String(s))).toLowerCase();

const extractSection = (markdown, sectionTitle, stripRenderDirectives = false) => {
  const lines = markdown.split("\n");
  const result = [];
  let capture = false;

  const normalizedTarget = normalize(sectionTitle);

  for (const rawLine of lines) {
    const line = rawLine ?? "";
    const trimmed = line.trim();
    const isHeading = trimmed.startsWith("## ");

    if (isHeading) {
      const headingText = trimmed.slice(3).trim();
      const normalizedHeading = normalize(headingText);

      if (normalizedHeading === normalizedTarget) {
        capture = true;
        continue;
      } else if (capture) {
        break;
      }
    }

    if (capture) {
      const isRenderDirective = /^render:\s*/i.test(trimmed);
      if (stripRenderDirectives && isRenderDirective) continue;
      result.push(line);
    }
  }

  return result.join("\n").trim();
};


// PERF: markdown files are static — fetch each URL once per visit and share
// the promise, so several renderers (or re-renders) don't refetch it.
const markdownCache = new Map();
const EMPTY_VARS = Object.freeze({});

function fetchMarkdown(url) {
  if (!markdownCache.has(url)) {
    const p = fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`Markdown file not found or inaccessible: ${url}`);
      }
      return response.text();
    });
    p.catch(() => markdownCache.delete(url));
    markdownCache.set(url, p);
  }
  return markdownCache.get(url);
}

const MarkdownRenderer = ({
  filePath,
  rawContent,
  sectionTitle,
  showTitle = false,
  className = "markdown-body",
  bodyClassName = "",
  variables = EMPTY_VARS,
  stripRenderDirectives = false,
}) => {
  const [html, setHtml] = useState("");

  // PERF: callers usually pass `variables` as an inline object literal, which
  // is a new object every parent render and re-ran the load/parse effect
  // each time. Key the effect on the serialized values instead.
  const varsKey = JSON.stringify(variables);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let markdown = rawContent;

        if (!markdown && filePath) {
          try {
            const url = resolveContentPath(filePath);
            markdown = await fetchMarkdown(url);
          } catch (err) {
            throw new Error(`Failed to load markdown: ${err.message}`);
          }
        }
        

        const interpolated = interpolateTokens(markdown, variables);
        let content;

        if (sectionTitle) {
          const section = extractSection(interpolated, sectionTitle, stripRenderDirectives);
          const displayTitle = collapseWs(stripHtml(sectionTitle));
          content =
            section && section.length
              ? section
              : `### ${displayTitle}\n_Section not found._`;
        } else {
          content = interpolated;
        }

        if (!cancelled) setHtml(marked.parse(content));
      } catch (err) {
        if (!cancelled) setHtml(`<p style="color:red;"><strong>Error:</strong> ${err.message}</p>`);
      }
    };

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `variables` is tracked via varsKey
  }, [filePath, rawContent, sectionTitle, varsKey, stripRenderDirectives]);

  const cleanDisplayTitle = sectionTitle ? collapseWs(stripHtml(sectionTitle)) : "";

  return (
    <div className={className}>
      {showTitle && sectionTitle && (
        <h3 className="text-[var(--content-title-size,var(--font-size-lg))] font-semibold text-gray-900 m-0 mb-xs">
          {cleanDisplayTitle}
        </h3>
      )}
      <div className={bodyClassName || undefined} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

MarkdownRenderer.propTypes = {
  filePath: PropTypes.string,
  rawContent: PropTypes.string,
  sectionTitle: PropTypes.string,
  showTitle: PropTypes.bool,
  className: PropTypes.string,
  bodyClassName: PropTypes.string,
  variables: PropTypes.object,
  stripRenderDirectives: PropTypes.bool,
};

export default MarkdownRenderer;