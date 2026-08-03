import React from "react";
import PropTypes from "prop-types";
import ContentContainer from "./ContentContainer";

const SectionWithChart = ({
  id,
  title,
  subtitle,
  subtitleVariables,
  titleVariables,
  children,
  infoIcon = false,
  downloadIcon = false,
  onDownloadClick,
  onDownloadPNG,
  onCopyImage,
  modalTitle = "More Info",
  modalContent = null,
  previewData = [],
  columnLabels = {},
  downloadDescription,
  animateOnScroll = true,
  background = "white",
  uploadDate,
}) => {
  const childrenWithUploadDate = React.isValidElement(children)
    ? React.cloneElement(children, { uploadDate })
    : children;

  const safeSubtitleVariables =
    typeof subtitle === "string" ? subtitleVariables : undefined;

  return (
    <ContentContainer
      id={id}
      title={title}
      subtitle={subtitle}
      subtitleVariables={safeSubtitleVariables}
      titleVariables={titleVariables}
      infoIcon={infoIcon}
      downloadIcon={downloadIcon}
      onDownloadClick={onDownloadClick}
      onDownloadPNG={onDownloadPNG}
      onCopyImage={onCopyImage}
      modalTitle={modalTitle}
      modalContent={modalContent}
      downloadPreviewData={previewData}
      downloadColumnLabels={columnLabels}
      downloadDescription={downloadDescription}
      animateOnScroll={animateOnScroll}
      background={background}
    >
      {childrenWithUploadDate}
    </ContentContainer>
  );
};

SectionWithChart.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  subtitleVariables: PropTypes.object,
  titleVariables: PropTypes.object,
  children: PropTypes.node.isRequired,
  infoIcon: PropTypes.bool,
  downloadIcon: PropTypes.bool,
  onDownloadClick: PropTypes.func,
  onDownloadPNG: PropTypes.func,
  onCopyImage: PropTypes.func,
  modalTitle: PropTypes.string,
  modalContent: PropTypes.node,
  previewData: PropTypes.array,
  columnLabels: PropTypes.object,
  downloadDescription: PropTypes.string,
  animateOnScroll: PropTypes.bool,
  background: PropTypes.oneOf(["white", "gray", "transparent"]),
  uploadDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
};

export default SectionWithChart;
