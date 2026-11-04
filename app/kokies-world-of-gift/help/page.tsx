import type { Metadata } from 'next';
import Link from 'next/link';
import KokiesPageIntro from '../../../components/KokiesPageIntro';

export const metadata: Metadata = { title: { absolute: 'Ordering, delivery & FAQs | Kokies World of Gifts' } };
const questions = [
  ['How do I start an order?', 'Explore the gift shop, open a product and submit your gift enquiry. You can also contact the Kokies team on Instagram with the product, quantity, required date and personalisation details. In this preview, website forms save on your browser only.'],
  ['Are the displayed prices final?', 'Prices in this preview are demonstration prices. Confirm the final quote, including personalisation, branding, packaging and delivery, with the team before making a payment.'],
  ['Is there a minimum order quantity?', 'The current bulk gift collection shows a minimum of 100 units per product. Contact Kokies to discuss your specific quantity and confirm what can be supplied.'],
  ['Can I add a name, message or logo?', 'Personalisation depends on the chosen product and finish. Share the exact wording, logo and placement you have in mind. Confirm spelling, artwork, pricing and production details before approving the order.'],
  ['How much wording can I add?', 'The standard personalisation allowance is eight words. Longer wording attracts an additional charge and requires a separate quote. The product form counts your words and asks you to acknowledge the extra charge before submitting. Final personalisation and colour availability are confirmed before production.'],
  ['How long will production and delivery take?', 'Timing depends on the product, quantity, customisation and destination. Give the team your required date and confirm the agreed production and delivery timeline before ordering. No standard delivery promise is set in this preview.'],
  ['What about changes, cancellations and returns?', 'Ask Kokies to confirm the applicable terms before payment, especially for personalised products. The client’s final cancellation, returns and refund policies have not yet been published in this preview.'],
  ['Can I track an order?', 'Use your Kokies reference and phone number on the tracking page. This preview can find records saved on the same browser; contact Kokies for live delivery updates.'],
  ['How is Kokies connected to iDesire?', 'They are two separate businesses presented together for convenient discovery. Kokies specialises in gifts, personalisation and event souvenirs; iDesire TRADS specialises in Asoebi, occasion fabrics and wedding group orders. Each has its own website experience and staff workspace.'],
];
export default function KokiesHelp() {
  return <><KokiesPageIntro eyebrow="HERE TO HELP" title="A little clarity, before you gift." description="The practical details for planning a thoughtful order. Always confirm your final quote and agreed terms with the Kokies team."/><section className="kokies-faq-layout"><aside><h2>Planning something special?</h2><p>Start with your occasion, quantity, budget and date. We’ll help you shape the rest.</p><Link className="kokies-button" href="/kokies-world-of-gift/contact">Talk to Kokies ↗</Link><Link className="kokies-text-link" href="/kokies-world-of-gift/track-order">Track an order ↗</Link></aside><div className="kokies-faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section></>;
}
