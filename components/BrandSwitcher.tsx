'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowLeftRight, ArrowUpRight, Gift, Layers } from 'lucide-react';

export default function BrandSwitcher({ brand }: { brand: 'idesire' | 'kokies' }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="brand-switcher" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} className="brand-switch-trigger" aria-expanded={open} aria-controls="brand-menu" onClick={() => setOpen(!open)}><ArrowLeftRight size={16}/> Switch business</button>
    {open && <div id="brand-menu" className="brand-switch-menu">
      <p>Choose your workspace</p>
      <Link href="/admin" aria-current={brand === 'idesire' ? 'page' : undefined}><Layers size={22}/><span><b>iDesire TRADS</b><small>Fabrics & Asoebi {brand === 'idesire' && '· Current'}</small></span><ArrowUpRight size={16}/></Link>
      <Link href="/admin/kokies" aria-current={brand === 'kokies' ? 'page' : undefined}><Gift size={22}/><span><b>Kokies World of Gifts</b><small>Gifts & personalisation {brand === 'kokies' && '· Current'}</small></span><ArrowUpRight size={16}/></Link>
    </div>}
  </div>;
}
