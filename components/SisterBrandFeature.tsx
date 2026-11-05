import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function SisterBrandFeature({ current }: { current: 'idesire' | 'kokies' }) {
  const gift = current === 'idesire';
  return <section className={`sister-feature ${gift ? 'meet-kokies' : 'meet-idesire'}`} aria-labelledby="sister-brand-title">
    <div className="sister-feature-copy"><span className="sister-kicker">A DIFFERENT BUSINESS. ANOTHER WAY TO CELEBRATE.</span>
      <img className="sister-logo" src={gift ? '/kokies/kokies-logo.webp' : '/idesire-trads-logo.webp'} alt={gift ? 'Kokies World of Gifts' : 'iDesire TRADS'}/>
      <h2 id="sister-brand-title">{gift ? 'Meet Kokies World of Gifts.' : 'Meet iDesire TRADS.'}</h2>
      <p>{gift ? 'The outfits bring your people together. The gifts help them remember. Discover our sister business for personalised keepsakes, corporate gifts and beautifully branded event souvenirs.' : 'Found the perfect gift? Now dress for the occasion. Our sister business brings you statement lace, premium Asoebi and coordinated fabrics for weddings, family gatherings and your next big moment.'}</p>
      <div className="sister-categories">{(gift ? ['Personalised gifts', 'Corporate gifting', 'Event souvenirs'] : ['Premium lace', 'Asoebi collections', 'Wedding & group orders']).map(label => <span key={label}>{label}</span>)}</div>
      <Link className="sister-feature-button" href={gift ? '/kokies-world-of-gift' : '/'}>Visit the {gift ? 'Kokies' : 'iDesire'} website <ArrowUpRight size={19}/></Link>
      <small>{gift ? 'A dedicated gift shop, with its own collections and team.' : 'A dedicated fabric store, with its own collections and team.'}</small>
    </div><div className="sister-feature-visual"><img src={gift ? '/kokies/celebration-gift-set.png' : '/products/royal-bloom-wine.webp'} alt={gift ? 'A selection of branded gift bags, bottles and keepsakes from Kokies' : 'Richly embroidered burgundy occasion lace from iDesire'}/><span>{gift ? 'KOKIES · THE GIFTING BUSINESS' : 'IDESIRE · THE FABRIC BUSINESS'}</span></div>
  </section>;
}
