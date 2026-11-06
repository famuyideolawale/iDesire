"use client";
import { campaignDefaults } from "../../components/admin/kokies/campaigns";
import {CmsHeading,CmsIntro} from '../../components/CmsPage';

import {useLocal} from '../../lib/local/client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Gift, BriefcaseBusiness, CalendarDays, MoveRight, ArrowLeft, ArrowRight } from 'lucide-react';
import { useGiftCatalogue, giftSettings, listedGifts } from '../../lib/kokies';
import { naira } from '../../lib/products';

export default function KokiesHome() {
  const products = listedGifts(useGiftCatalogue());
  const {data:serverData}=useLocal();
  const [activeSlide, setActiveSlide] = useState(0);
  const settings = serverData ? { ...giftSettings, ...serverData.settings } : giftSettings;
  const curated = products.filter(product => product.featured);
  // Always show four: featured gifts first, then new arrivals and real products to fill the row.
  const featured = [...curated, ...products.filter(p => p.newArrival && !p.sample), ...products.filter(p => !p.sample), ...products]
    .filter((p, i, all) => all.findIndex(x => x.id === p.id) === i)
    .slice(0, 4);
  const defaults = campaignDefaults(settings.heroTitle, settings.heroText);
  const configured = defaults.map((slide, slot) => {
    const custom = serverData?.settings.heroSlides?.[slot];
    return { ...slide, ...custom, slot, custom: !!custom };
  });
  const visible = configured.filter(slide => slide.visible !== false).sort((a,b) => (a.position ?? a.slot) - (b.position ?? b.slot));
  const slides = visible.length ? visible : [configured[0]];
  const slideIndex = activeSlide % slides.length;
  const slide = slides[slideIndex];
  return <div className="gift-home">
    <section data-cms-slide={`kokies-${slide.slot}`} className="gift-hero-slider" aria-label="Kokies featured collections"><div className="gift-campaign" id="gift-campaign-content"><div className="gift-campaign-copy"><span className="gift-eyebrow">{slide.eyebrow}</span>{slide.slot===0 && !slide.custom?<><CmsHeading>{slide.title === 'Good gifts. Great connections.' ? <>Good gifts.<br/>Great connections.</> : slide.title}</CmsHeading><CmsIntro>{slide.text}</CmsIntro></>:<><h1>{slide.title}</h1><p>{slide.text}</p></>}<div className="gift-campaign-actions"><Link className="gift-shop-button" href={slide.href}>{slide.cta} <ArrowUpRight size={19}/></Link><Link href={slide.secondaryHref}>{slide.secondary} <ArrowUpRight size={17}/></Link></div></div><div className="gift-campaign-photo"><picture>{slide.mobileImage && <source media="(max-width: 700px)" srcSet={slide.mobileImage} />}<img key={slide.image} src={slide.image} alt={slide.alt} fetchPriority={slideIndex === 0 ? 'high' : 'auto'}/></picture></div></div><div className="gift-campaign-controls"><span className="gift-slide-count" aria-live="polite">{String(slideIndex + 1).padStart(2,"0")} / {String(slides.length).padStart(2,"0")}</span><div className="gift-slide-tabs">{slides.map((item, index) => <button key={item.eyebrow} type="button" aria-controls="gift-campaign-content" aria-label={`Show Kokies hero slide ${index + 1}`} aria-pressed={slideIndex === index} onClick={() => setActiveSlide(index)}><span/></button>)}</div><div className="gift-slide-arrows"><button type="button" aria-label="Previous Kokies hero slide" onClick={() => setActiveSlide((slideIndex + slides.length - 1) % slides.length)}><ArrowLeft size={18}/></button><button type="button" aria-label="Next Kokies hero slide" onClick={() => setActiveSlide((slideIndex + 1) % slides.length)}><ArrowRight size={18}/></button></div></div></section>
    <nav className="gift-occasion-nav" aria-label="Find a gift by occasion"><Link href="/kokies-world-of-gift/shop"><Gift size={28}/><span>For someone special</span><ArrowUpRight size={19}/></Link><Link href="/kokies-world-of-gift/corporate-gifts"><BriefcaseBusiness size={28}/><span>For your business</span><ArrowUpRight size={19}/></Link><Link href="/kokies-world-of-gift/contact?type=Event%20souvenirs"><CalendarDays size={28}/><span>For your next event</span><ArrowUpRight size={19}/></Link></nav>
    <section className="gift-finds"><div className="gift-section-heading"><h2>Thoughtful finds,  ready to make yours.</h2><Link href="/kokies-world-of-gift/shop">Shop all gifts <ArrowUpRight size={18}/></Link></div><div className="gift-finds-grid">{featured.map(product => <Link className="gift-find-card" data-cms-item={String(product.id)} href={`/kokies-world-of-gift/${product.id}`} key={product.id}><div className="gift-find-photo"><img src={product.image} alt={product.name} loading="lazy"/><span className="gift-find-arrow"><ArrowUpRight size={19}/></span></div><div className="gift-find-info"><span>{product.category}</span><h3>{product.name}</h3><p>{product.quoteOnly || product.sample ? 'Price on request' : <>{!product.priceConfirmed && <small>From </small>}{naira(product.price)} <small>/ unit</small></>}</p></div></Link>)}</div><p className="gift-price-note">Minimum quantities vary by gift. We confirm availability, personalisation and delivery with you.</p></section>
    <section className="gift-sister-ribbon"><div><span className="gift-eyebrow">MEET OUR SISTER BUSINESS</span><h2>Dress the occasion with iDesire TRADS.</h2></div><p>Premium Asoebi and celebration fabrics.<br/>A separate store. A shared love of celebrating.</p><Link href="/">Visit iDesire <ArrowUpRight size={19}/></Link></section>
    <section className="gift-personal-story"><div className="gift-personal-photo"><img src="/kokies/anniversary-tumblers.png" alt="Personalised colourful tumblers celebrating a milestone" loading="lazy"/><span>THEIR NAME. YOUR THOUGHT.</span></div><div><span className="gift-eyebrow">IT’S THE PERSONAL PART THAT MATTERS</span><h2>Not just a gift.<br/>A little piece of their story.</h2><p>A name they’ll smile at. A message they’ll keep. A logo that belongs to your people. Explore the details that make an everyday object feel anything but ordinary.</p><Link className="gift-shop-button" href="/kokies-world-of-gift/personalisation">Make it personal <ArrowUpRight size={19}/></Link></div></section>
    <section className="gift-business-story"><div><span className="gift-eyebrow">FOR TEAMS, CLIENTS & GOOD CONNECTIONS</span><h2>A thoughtful thank-you goes a long way.</h2><p>Welcome someone new. Recognise a great team. Send a client something considered. Start with your people, and we’ll help you explore the gifting brief.</p><Link href="/kokies-world-of-gift/corporate-gifts">Discover corporate gifting <MoveRight size={21}/></Link></div><img src="/kokies/branded-notebooks.png" alt="Branded notebook and pen gifts for teams and clients" loading="lazy"/></section>
    <section className="gift-last-word"><span className="gift-eyebrow">YOUR IDEA, BEAUTIFULLY CONSIDERED</span><h2>Let’s make<br/>their day.</h2><Link className="gift-shop-button" href="/kokies-world-of-gift/contact">Start a gift brief <ArrowUpRight size={19}/></Link></section>
  </div>;
}
