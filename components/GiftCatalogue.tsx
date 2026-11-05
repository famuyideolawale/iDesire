'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { useGiftCatalogue } from '../lib/kokies';
import { useCatalogueFilter } from '../lib/local/catalogue-filter';
import { CataloguePhoto } from './ProductGallery';
import { naira } from '../lib/products';

export default function GiftCatalogue() {
  const products = useGiftCatalogue();
  const [category, setCategory] = useCatalogueFilter('category','All gifts');
  const [maxPrice, setMaxPrice] = useCatalogueFilter('budget','');
  const [search, setSearch] = useCatalogueFilter('q','');
  const [sort, setSort] = useCatalogueFilter('sort','featured');
  const categories = ['All gifts', ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = useMemo(() => {
    const selected = products.filter(p => (category === 'All gifts' || p.category === category) && (!maxPrice || !p.quoteOnly&&p.price <= Number(maxPrice)) && `${p.name} ${p.category} ${p.note}`.toLowerCase().includes(search.toLowerCase()));
    return sort === 'low' ? selected.sort((a, b) => (a.quoteOnly ? Infinity : a.price) - (b.quoteOnly ? Infinity : b.price)) : sort === 'high' ? selected.sort((a, b) => (b.quoteOnly ? -Infinity : b.price) - (a.quoteOnly ? -Infinity : a.price)) : selected;
  }, [products, category, maxPrice, search, sort]);
  return <>
    <section className="kokies-catalogue-tools" aria-label="Filter gift products"><label>Search gifts<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Try tumbler, notebook, corporate…"/></label><label>Collection<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Budget per unit<select value={maxPrice} onChange={e => setMaxPrice(e.target.value)}><option value="">Any price</option><option value="15000">Up to ₦15,000</option><option value="25000">Up to ₦25,000</option><option value="40000">Up to ₦40,000</option><option value="70000">Up to ₦70,000</option></select></label><label>Sort by<select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label><button type="button" className="kokies-reset" onClick={() => { setCategory('All gifts'); setMaxPrice(''); setSearch(''); setSort('featured'); }}>Clear filters</button><span className="kokies-result-count" aria-live="polite">{filtered.length} gifts</span></section>
    <section className="kokies-products" aria-label="Gift products">{filtered.map(product => <Link href={`/kokies-world-of-gift/${product.id}`} className="kokies-product-card kokies-product-link" data-cms-item={String(product.id)} key={product.id}><div className="kokies-product-image"><CataloguePhoto src={product.image} alt={product.name}/><span>{product.sample ? 'SAMPLE CONCEPT' : 'PERSONALISATION AVAILABLE'}</span><b className="kokies-view-product">View gift ↗</b></div><div className="kokies-product-copy"><span className="kokies-product-category">{product.category}</span><h3>{product.name}</h3><p>{product.note}</p><strong>{product.quoteOnly || product.sample ? 'Request a quote' : naira(product.price)} {!product.quoteOnly && !product.sample && <small>/ unit{!product.priceConfirmed ? ' estimate' : ''}</small>}</strong><small>Minimum order: {product.minimum??100} units</small></div></Link>)}{!filtered.length && <div className="kokies-no-results"><h2>Let’s find another little something.</h2><p>No gifts match these filters. Try a different collection or budget.</p><button className="kokies-reset" onClick={() => { setSearch(''); setCategory('All gifts'); setMaxPrice(''); }}>Show all gifts</button></div>}</section>
  </>;
}
