import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function BrandDirectory({ current }: { current: 'idesire' | 'kokies' }) {
  return <nav data-cms-site="directory" className="brand-directory" aria-label="Our two businesses">
    <Link className="directory-idesire" href="/" aria-current={current === 'idesire' ? 'page' : undefined}><span><b>iDesire TRADS</b><small> — Asoebi & Fabrics</small></span>{current !== 'idesire' && <ArrowUpRight size={17}/>}</Link>
    <Link className="directory-kokies" href="/kokies-world-of-gift" aria-current={current === 'kokies' ? 'page' : undefined}><span><b>Kokies World of Gifts</b><small> — Gifts & Souvenirs</small></span>{current !== 'kokies' && <ArrowUpRight size={17}/>}</Link>
  </nav>;
}
