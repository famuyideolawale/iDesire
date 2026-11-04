import BrandDetails from "../../../components/BrandDetails";
import type { Metadata } from "next";
import Link from "next/link";
import KokiesPageIntro from "../../../components/KokiesPageIntro";
import GiftEnquiryForm from "../../../components/GiftEnquiryForm";

export const metadata: Metadata = {
  title: { absolute: "Contact & enquiries | Kokies World of Gifts" },
};
export default async function KokiesContact({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const query = await searchParams;
  return (
    <>
      <KokiesPageIntro
        eyebrow="LET’S TALK GIFTS"
        title="Something lovely starts with hello."
        description="Planning a gift, a corporate order or a celebration? Share the occasion and the details you already know. We’ll take the conversation from there."
      />
      <section className="kokies-contact-layout">
        <GiftEnquiryForm initialType={query.type} />
        <aside>
          <div className="kokies-contact-card">
            <BrandDetails />
          </div>
          <div className="kokies-contact-card">
            <span className="kokies-eyebrow">A DIRECT HELLO</span>
            <h2>Find us on Instagram.</h2>
            <p>
              For a live enquiry, contact the Kokies team through our Instagram
              profile.
            </p>
            <a
              className="kokies-button"
              href="https://www.instagram.com/kokiesworldofgifts/"
              target="_blank"
              rel="noreferrer"
            >
              @kokiesworldofgifts ↗
            </a>
          </div>
          <div className="kokies-contact-card">
            <span className="kokies-eyebrow">ALREADY PLANNING?</span>
            <h2>A few useful details.</h2>
            <p>
              Your occasion, quantities, budget, required date and destination
              help us understand your brief.
            </p>
            <Link
              className="kokies-text-link"
              href="/kokies-world-of-gift/help"
            >
              Read ordering & delivery FAQs ↗
            </Link>
          </div>
          <div className="kokies-contact-card">
            <span className="kokies-eyebrow">LOOKING FOR FABRICS?</span>
            <h2>Meet iDesire TRADS.</h2>
            <p>
              Asoebi and occasion fabrics are handled by our sister business,
              with its own store and team.
            </p>
            <Link className="kokies-text-link" href="/">
              Visit the iDesire website ↗
            </Link>
          </div>
        </aside>
      </section>
    </>
  );
}
