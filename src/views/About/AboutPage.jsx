import React from "react";
import { PageStateProvider } from "../../components/hooks/usePageState";
import AboutPageLayout from "../../components/layout/AboutPageLayout";
import aboutPageConfig from "../config/AboutPage.config";

const AboutPage = () => {
  return (
    <PageStateProvider enableVirusToggle={false} enableDataTypeToggle={false}>
      <AboutPageLayout config={aboutPageConfig} />
    </PageStateProvider>
  );
};

export default AboutPage;
