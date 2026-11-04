import BrandDetails from "../../components/BrandDetails";
import LocalEnquiry, { BrandContact } from "../../components/LocalEnquiry";
import { CmsHeading, CmsIntro } from "../../components/CmsPage";
export default function Contact() {
  return (
    <div className="page-shell contact-page">
      <div className="page-hero">
        <span className="eyebrow">WE’RE HERE TO HELP</span>
        <CmsHeading>Let’s talk about your plans.</CmsHeading>
        <CmsIntro>
          Questions about a fabric, group order or custom finishing? Our team
          can help you work out the next step.
        </CmsIntro>
      </div>
      <BrandContact />
      <section className="contact-visit-card">
        <BrandDetails />
      </section>
      <LocalEnquiry />
    </div>
  );
}
