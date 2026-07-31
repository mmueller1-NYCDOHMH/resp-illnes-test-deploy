/**
 * SectionRenderer
 *
 * Dispatches a config section to the appropriate render handler via
 * sectionTypeRegistry.  Adding a new renderAs type requires only a single
 * entry in sectionTypeRegistry — this file never needs to change.
 */

import React from "react";
import sectionTypeRegistry from "../../utils/sectionTypeRegistry";

const SectionRenderer = (props) => {
  const handler =
    sectionTypeRegistry[props.section?.renderAs] ??
    sectionTypeRegistry["default"];

  return handler(props) ?? null;
};

export default SectionRenderer;
