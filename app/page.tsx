"use client";
import {useLocal,asFabric} from '../lib/local/client';
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
  const [catalogue, setCatalogue] = useState<Product[]>(seed);
  const [heroTitle, setHeroTitle] = useState(defaultTitle);
  const [heroText, setHeroText] = useState(defaultText);
  const [active, setActive] = useState(0);
  const {data:serverData}=useLocal(); useEffect(()=>{if(serverData){setCatalogue(serverData.products.map(asFabric));setHeroTitle(serverData.settings.heroTitle);setHeroText(serverData.settings.heroText);}},[serverData]);
  const slides = [
    { eyebrow: 'THE NEW ASOEBI EDIT', title: heroTitle, text: heroText, image: '/campaigns/idesire-fashion-hero.webp', alt: 'Contemporary Nigerian fashion campaign featuring a woman in intricate burgundy lace and gele', href: '/shop', cta: 'Explore the collection', style: 'fashion-campaign' },
    { eyebrow: 'COLOUR. TEXTURE. POSSIBILITY.', title: 'A fabric. A feeling. A statement.', text: 'Discover richly embroidered lace, considered colours and details made to stand out.', image: '/products/royal-bloom-emerald.webp', alt: 'Intricate emerald green embroidered occasion lace', href: '/shop', cta: 'Find your fabric', style: 'fabric-campaign' },
    { eyebrow: 'THE 2027 ASOEBI PRE-ORDER', title: 'Your people. One unforgettable look.', text: 'Bring your wedding party together with coordinated fabrics and thoughtful finishing touches.', image: '/idesire-yoruba-wedding-hero.png', alt: 'A Nigerian couple in coordinated burgundy traditional wedding attire', href: '/wedding-orders', cta: 'Plan a wedding order', style: 'wedding-campaign' },
  ];
  const slide = slides[active];
  const edits = [
    { name: 'Burgundy embroidered lace', image: '/products/royal-bloom-wine.webp', href: '/product/royal-bloom-embroidered-lace?colour=wine' },
    { name: 'Emerald embroidered lace', image: '/products/royal-bloom-emerald.webp', href: '/product/royal-bloom-embroidered-lace?colour=emerald' },
    { name: 'Champagne embroidered lace', image: '/products/royal-bloom-champagne.webp', href: '/product/royal-bloom-embroidered-lace?colour=champagne' },
  ];
  return <div className="fashion-home">
    <section data-cms-slide={`idesire-${active}`} className={`fashion-hero ${slide.style}`} aria-label="The iDesire campaign">
      <img className="fashion-hero-photo" src={slide.image} alt={slide.alt} fetchPriority="high"/>
      <div className="fashion-hero-shade"/>
      <div className="fashion-hero-copy"><span className="fashion-kicker">{slide.eyebrow}</span>{active===0?<><CmsHeading>{slide.title}</CmsHeading><CmsIntro>{slide.text}</CmsIntro></>:<><h1>{slide.title}</h1><p>{slide.text}</p></>}<Link className="fashion-cta" href={slide.href}>{slide.cta}<ArrowUpRight size={20}/></Link></div>
      <div className="fashion-slider"><span>0{active + 1} / 03</span><div>{slides.map((item, index) => <button key={item.eyebrow} aria-label={`Show hero slide ${index + 1}`} aria-pressed={active === index} onClick={() => setActive(index)}><span/></button>)}</div><div className="fashion-slider-arrows"><button aria-label="Previous hero slide" onClick={() => setActive((active + 2) % 3)}><ArrowLeft size={18}/></button><button aria-label="Next hero slide" onClick={() => setActive((active + 1) % 3)}><ArrowRight size={18}/></button></div></div>
    </section>
    <section className="fashion-edit"><div className="fashion-section-heading"><h2>Tradition. With a new point of view.</h2><Link href="/shop">Shop fabrics <ArrowUpRight size={17}/></Link></div><div className="fashion-edit-grid">{edits.map(edit => <Link className="fashion-edit-card" href={edit.href} key={edit.name}><div><img src={edit.image} alt={edit.name} loading="lazy"/></div><span>{edit.name}<ArrowUpRight size={17}/></span></Link>)}<aside className="fashion-gift-discovery"><span className="fashion-kicker">MEET OUR SISTER BUSINESS</span><h3>Kokies<br/>World of Gifts</h3><p>Personalised gifts.<br/>Corporate gifting.<br/>Event souvenirs.</p><Link href="/kokies-world-of-gift">Visit the Kokies website <ArrowUpRight size={17}/></Link><img src="/campaigns/kokies-logo-hero.webp" alt="Thoughtfully presented gift box, tumbler and notebook from the Kokies campaign" loading="lazy"/></aside></div></section>
    <section className="fashion-featured"><div className="fashion-section-heading"><div><span className="fashion-kicker">THE FABRICS YOU’LL REMEMBER</span><h2>Made to be seen.</h2></div><Link href="/shop">View the collection <ArrowUpRight size={17}/></Link></div><div className="product-grid">{catalogue.slice(0, 4).map(product => <ProductCard key={product.slug} product={product}/>)}</div></section>
    <section className="fashion-wedding"><div className="fashion-wedding-photo"><img src="/idesire-yoruba-wedding-hero.png" alt="A celebration in coordinated burgundy Asoebi" loading="lazy"/></div><div><span className="fashion-kicker">FOR THE DAY. FOR YOUR PEOPLE.</span><h2>A celebration<br/>with your signature.</h2><p>Your colours. Your closest people. A look that brings it all together. Let’s plan the fabrics and finishing touches for your wedding or group order.</p><Link className="fashion-cta" href="/wedding-orders">Plan your occasion <ArrowUpRight size={20}/></Link><Link className="fashion-secondary" href="/customisation">Explore customisation ↗</Link></div></section>
    <section className="fashion-brand-note"><span className="fashion-kicker">IDESIRE TRADS</span><h2>Rooted in tradition.<br/>Ready for your next chapter.</h2><p>Premium Asoebi, expressive lace and carefully considered details for the way you celebrate today.</p><Link href="/about">Get to know iDesire <ArrowUpRight size={18}/></Link></section>
  </div>;
}
