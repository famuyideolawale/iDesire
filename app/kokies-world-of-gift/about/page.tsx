import type { Metadata } from 'next';
import Link from 'next/link';
import KokiesPageIntro from '../../../components/KokiesPageIntro';
import SisterBrandFeature from '../../../components/SisterBrandFeature';

export const metadata: Metadata = { title: { absolute: 'Our story | Kokies World of Gifts' } };
export default function KokiesAbout() {
  return <><KokiesPageIntro eyebrow="OUR STORY" title="Life is full of reasons to give." description="A milestone. A thank-you. A room full of people celebrating together. Kokies World of Gifts is a home for the thoughtful details that help those moments stay with us."/>
    <section className="kokies-editorial-split"><img src="/kokies/celebration-gift-set.png" alt="Kokies gift bags and celebration keepsakes"/><div><span className="kokies-eyebrow">CELEBRATING LIFE, ONE EVENT AT A TIME</span><h2>Gifts with a reason behind them.</h2><p>We bring personalised gifts, corporate merchandise, event souvenirs and branded presentation into one dedicated gifting destination.</p><p>Whether you’re recognising a team, bringing guests together or marking a personal milestone, start with who it is for and what you want it to mean. We’ll help you explore the details.</p><Link className="kokies-button" href="/kokies-world-of-gift/shop">Discover the gift collection ↗</Link></div></section>
    <section className="kokies-service-grid"><article><span>THOUGHTFUL</span><h2>Start with the person.</h2><p>Think about who will receive it, how they will use it and the occasion it will remind them of.</p></article><article><span>PERSONAL</span><h2>Let the details speak.</h2><p>Names, messages, colours and branding help make a gift part of your story.</p></article><article><span>CONNECTED</span><h2>Celebrate together.</h2><p>From personal milestones to corporate occasions, bring people into the heart of the gesture.</p></article></section>
    <SisterBrandFeature current="kokies"/>
  </>;
}
