'use client';
import {useLocal,asFabric} from '../../lib/local/client';
import {CmsHeading,CmsIntro} from '../../components/CmsPage';

import {useEffect,useMemo,useState} from 'react';
import type {Metadata} from 'next';
import ProductCard from '../../components/ProductCard';
import {products as seed,Product,readProductCatalogue} from '../../lib/products';

export default function Shop(){
 const [catalogue,setCatalogue]=useState<Product[]>(seed);
 const {data:serverData}=useLocal(); useEffect(()=>{if(serverData)setCatalogue(serverData.products.map(asFabric));},[serverData]);
 const [category,setCategory]=useState('All categories');
 const [colour,setColour]=useState('All colours');
 const [sort,setSort]=useState('Featured');
 const [query,setQuery]=useState('');
 const filtered=useMemo(()=>{
  let list=catalogue.filter(p=>(category==='All categories'||p.category===category)&&p.name.toLowerCase().includes(query.toLowerCase())&&(colour==='All colours'||p.colours?.some(c=>c.name===colour)));
  if(sort==='Price: low to high') list=[...list].sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
  if(sort==='Price: high to low') list=[...list].sort((a,b)=>(b.price??-Infinity)-(a.price??-Infinity));
  return list;
 },[catalogue,category,colour,sort,query]);
 const categories=['All categories',...Array.from(new Set(catalogue.map(p=>p.category)))];
 const colours=['All colours',...Array.from(new Set(catalogue.flatMap(p=>p.colours?.map(c=>c.name)??[])))];
 return <div className="page-shell"><div className="page-hero"><span className="eyebrow">THE IDESIRE COLLECTION</span><CmsHeading>Find something <em>meaningful.</em></CmsHeading><CmsIntro>Explore fabrics, Asoebi and thoughtful finishing touches for your next celebration.</CmsIntro></div>
 <div className="shop-toolbar" style={{gap:12,flexWrap:'wrap'}}><span>{filtered.length} {filtered.length===1?'piece':'pieces'} to discover</span><input id="collection-search" aria-label="Search products" placeholder="Search the collection" value={query} onChange={e=>setQuery(e.target.value)} style={{maxWidth:220,padding:'11px 12px',border:'1px solid #ded5d0',background:'transparent'}}/><select aria-label="Filter by category" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select><select aria-label="Filter by colour" value={colour} onChange={e=>setColour(e.target.value)}>{colours.map(c=><option key={c}>{c}</option>)}</select><select aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}><option>Featured</option><option>Price: low to high</option><option>Price: high to low</option></select></div>
 {filtered.length?<div className="product-grid shop-grid">{filtered.map(p=><ProductCard key={p.slug} product={p}/>)}</div>:<div style={{padding:'50px 0'}}>No pieces match those filters. Try another colour or category.</div>}
 <div className="shop-help"><span>Looking for something specific?</span><a href="https://wa.me/2348091142201?text=Hello%20iDesire%20TRADS%2C%20I%20would%20like%20help%20choosing%20fabric." target="_blank" rel="noreferrer">Talk to our team on WhatsApp ↗</a></div></div>
}
