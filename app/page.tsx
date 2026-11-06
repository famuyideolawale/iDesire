"use client";
import { campaignDefaults } from "../components/admin/idesire/campaigns";
import {useLocal,useFabricCatalogue} from '../lib/local/client';
import {CmsHeading,CmsIntro} from '../components/CmsPage';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowLeft, ArrowRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { products as seed, Product, readProductCatalogue } from '../lib/products';

const defaultTitle = 'Make an entrance.';
const defaultText = 'Statement fabrics for unforgettable celebrations.';
const oldTitle = 'For the moments that bring us together.';
export default function Home() {
  const [active, setActive] = useState(0);
  const {data:serverData}=useLocal();
  const catalogue = useFabricCatalogue();
  const heroTitle = serverData?.settings.heroTitle || defaultTitle;
  const heroText = serverData?.settings.heroText || defaultText;
  const defaults = campaignDefaults(heroTitle, heroText);
  const configured = defaults.map((slide, slot) => {
    const custom = serverData?.settings.heroSlides?.[slot];
    return { ...slide, ...custom, slot, custom: !!custom };
  });
  const visible = configured.filter(slide => slide.visible !== false).sort((a,b) => (a.position ?? a.slot) - (b.position ?? b.slot));
  const slides = visible.length ? visible : [configured[0]];
  const slideIndex = active % slides.length;
  const slide = slides[slideIndex];
  const edits = [
    { name: 'Burgundy embroidered lace', image: '/products/royal-bloom-wine.webp', href: '/product/royal-bloom-embroidered-lace?colour=wine' },
    { name: 'Emerald embroidered lace', image: '/products/royal-bloom-emerald.webp', href: '/product/royal-bloom-embroidered-lace?colour=emerald' },
    { name: 'Champagne embroidered lace', image: '/products/royal-bloom-champagne.webp', href: '/product/royal-bloom-embroidered-lace?colour=champagne' },
  ];
  return <div className="fashion-home">
    <section data-cms-slide={`idesire-${slide.slot}`} className={`fashion-hero ${slide.style}`} aria-label="The iDesire campaign">
      <picture>{slide.mobileImage && <source media="(max-width: 700px)" srcSet={slide.mobileImage} />}<img className="fashion-hero-photo" src={slide.image} alt={slide.alt} fetchPriority="high"/></picture>
      <div className="fashion-hero-shade"/>
      <div className="fashion-hero-copy"><span className="fashion-kicker">{slide.eyebrow}</span>{slide.slot===0 && !slide.custom?<><CmsHeading>{slide.title}</CmsHeading><CmsIntro>{slide.text}</CmsIntro></>:<><h1>{slide.title}</h1><p>{slide.text}</p></>}<Link className="fashion-cta" href={slide.href}>{slide.cta}<ArrowUpRight size={20}/></Link></div>
      <div className="fashion-slider"><span>{String(slideIndex + 1).padStart(2,"0")} / {String(slides.length).padStart(2,"0")}</span><div>{slides.map((item, index) => <button key={item.eyebrow} aria-label={`Show hero slide ${index + 1}`} aria-pressed={slideIndex === index} onClick={() => setActive(index)}><span/></button>)}</div><div className="fashion-slider-arrows"><button aria-label="Previous hero slide" onClick={() => setActive((slideIndex + slides.length - 1) % slides.length)}><ArrowLeft size={18}/></button><button aria-label="Next hero slide" onClick={() => setActive((slideIndex + 1) % slides.length)}><ArrowRight size={18}/></button></div></div>
    </section>
    <section className="fashion-edit"><div className="fashion-section-heading"><h2>Tradition. With a new point of view.</h2><Link href="/shop">Shop fabrics <ArrowUpRight size={17}/></Link></div><div className="fashion-edit-grid">{edits.map(edit => <Link className="fashion-edit-card" href={edit.href} key={edit.name}><div><img src={edit.image} alt={edit.name} loading="lazy"/></div><span>{edit.name}<ArrowUpRight size={17}/></span></Link>)}<aside className="fashion-gift-discovery"><span className="fashion-kicker">MEET OUR SISTER BUSINESS</span><h3>Kokies<br/>World of Gifts</h3><p>Personalised gifts.<br/>Corporate gifting.<br/>Event souvenirs.</p><Link href="/kokies-world-of-gift">Visit the Kokies website <ArrowUpRight size={17}/></Link><img src="/campaigns/kokies-logo-hero.webp" alt="Thoughtfully presented gift box, tumbler and notebook from the Kokies campaign" loading="lazy"/></aside></div></section>
    <section className="fashion-featured"><div className="fashion-section-heading"><div><span className="fashion-kicker">THE FABRICS YOU’LL REMEMBER</span><h2>Made to be seen.</h2></div><Link href="/shop">View the collection <ArrowUpRight size={17}/></Link></div><div className="product-grid">{[...catalogue].sort((a,b)=>Number(!!b.featured)-Number(!!a.featured)).slice(0, 4).map(product => <ProductCard key={product.slug} product={product}/>)}</div></section>
    <section className="fashion-wedding"><div className="fashion-wedding-photo"><img src="/idesire-yoruba-wedding-hero.webp" alt="A celebration in coordinated burgundy Asoebi" loading="lazy"/></div><div><span className="fashion-kicker">FOR THE DAY. FOR YOUR PEOPLE.</span><h2>A celebration<br/>with your signature.</h2><p>Your colours. Your closest people. A look that brings it all together. Let’s plan the fabrics and finishing touches for your wedding or group order.</p><Link className="fashion-cta" href="/wedding-orders">Plan your occasion <ArrowUpRight size={20}/></Link><Link className="fashion-secondary" href="/kokies-world-of-gift/personalisation">Souvenirs by Kokies ↗</Link></div></section>
    <section className="fashion-brand-note"><span className="fashion-kicker">IDESIRE TRADS</span><h2>Rooted in tradition.<br/>Ready for your next chapter.</h2><p>Premium Asoebi, expressive lace and carefully considered details for the way you celebrate today.</p><Link href="/about">Get to know iDesire <ArrowUpRight size={18}/></Link></section>
  </div>;
}
