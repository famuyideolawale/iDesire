'use client';
import {useLocal,asFabric} from '../../lib/local/client';
import {CmsHeading,CmsIntro} from '../../components/CmsPage';

import {useEffect,useState} from 'react';
import ProductCard from '../../components/ProductCard';
import {products as seed,Product,readProductCatalogue} from '../../lib/products';
import Link from 'next/link';
export default function NewPage(){const [items,setItems]=useState<Product[]>(seed);const {data:serverData}=useLocal(); useEffect(()=>{if(serverData)setItems(serverData.products.map(asFabric));},[serverData]);const recent=items.filter(p=>p.newArrival||p.label?.toLowerCase().includes('new')||p.label?.toLowerCase().includes('recent')).concat(items.filter(p=>!p.newArrival&&!p.label?.toLowerCase().includes('new')&&!p.label?.toLowerCase().includes('recent')).slice(0,4));return <div className="page-shell"><div className="page-hero"><span className="eyebrow">JUST ARRIVED</span><CmsHeading>New to <em>iDesire.</em></CmsHeading><CmsIntro>Recently introduced fabrics and celebration pieces, selected for the moments you are planning next.</CmsIntro></div>{recent.length?<div className="product-grid shop-grid">{recent.map((p,i)=><ProductCard key={`${p.slug}-${i}`} product={p}/>)}</div>:<div className="empty-cart"><h2>New pieces are on the way.</h2><p>Check back soon or ask our team about upcoming fabrics.</p><Link className="button button-dark" href="/shop">Explore all products</Link></div>}</div>}
