'use client';
import Link from 'next/link';
import { useLocal } from '../lib/local/client';
import { useGiftCatalogue, listedGifts } from '../lib/kokies';
import { useCatalogueFilter } from '../lib/local/catalogue-filter';
import { CataloguePhoto } from './ProductGallery';
import { naira } from '../lib/products';

export default function GiftCatalogue() {
  const products = listedGifts(useGiftCatalogue());
  const {data} = useLocal();
  const [quantity, setQuantity] = useCatalogueFilter("quantity", "");
  const [custom, setCustom] = useCatalogueFilter("custom", "");
  const [availability, setAvailability] = useCatalogueFilter("availability", "");
  const [price, setPrice] = useCatalogueFilter("price", "");
  const [category, setCategory] = useCatalogueFilter('category','All gifts');
  const [maxPrice, setMaxPrice] = useCatalogueFilter('budget','');
  const [search, setSearch] = useCatalogueFilter('q','');
  const [sort, setSort] = useCatalogueFilter('sort','featured');
  const categories = ['All gifts', ...Array.from(new Set(products.map(p => p.category)))];
  const clear = () => { setCategory('All gifts'); setMaxPrice(''); setSearch(''); setSort('featured'); setQuantity(''); setCustom(''); setAvailability(''); setPrice(''); };
  const bounds: Record<string, [number, number]> = { under: [0,25000], mid:[25000,50000], high:[50000,100000], luxury:[100000,Infinity] };
  const filtered = (() => {
    const selected = products.filter(p => (category === 'All gifts' || p.category === category) && (!maxPrice || !p.quoteOnly&&p.price <= Number(maxPrice)) && `${p.name} ${p.category} ${p.note}`.toLowerCase().includes(search.toLowerCase()));
    const range = bounds[price];
    const matching = selected.filter(p => {
      const minimum = p.minimum ?? 100;
      const stock = data?.inventory.find(i => i.productId === String(p.id))?.available ?? 0;
      const type = p.availability ?? "stock";
      return (!range || (!p.quoteOnly && p.price >= range[0] && p.price < range[1])) &&
        (!quantity || (quantity === "small" ? minimum < 50 : minimum >= Number(quantity))) &&
        (!custom || (p.customisation ?? "personalised") === custom) &&
        (!availability || (availability === "stock" ? type === "stock" && stock >= minimum : type === availability));
    });
    return sort === 'low' ? matching.sort((a, b) => (a.quoteOnly ? Infinity : a.price) - (b.quoteOnly ? Infinity : b.price)) : sort === 'high' ? matching.sort((a, b) => (b.quoteOnly ? -Infinity : b.price) - (a.quoteOnly ? -Infinity : a.price)) : matching;
  })();
  return <>
    <section className="kokies-catalogue-tools" aria-label="Filter gift products"><label>Search gifts<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Try tumbler, notebook, corporate…"/></label><label>Collection<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Budget per unit<select value={maxPrice} onChange={e => setMaxPrice(e.target.value)}><option value="">Any price</option><option value="15000">Up to ₦15,000</option><option value="25000">Up to ₦25,000</option><option value="40000">Up to ₦40,000</option><option value="70000">Up to ₦70,000</option></select></label><label>Sort by<select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label><details className="kokies-more-filters" open={!!(price || quantity || custom || availability) || undefined}><summary>More filters{[price, quantity, custom, availability].filter(Boolean).length ? ` · ${[price, quantity, custom, availability].filter(Boolean).length}` : ''}</summary><div><label>Price band<select value={price} onChange={e => setPrice(e.target.value)}><option value="">Any band</option><option value="under">Under ₦25,000</option><option value="mid">₦25,000–₦49,999</option><option value="high">₦50,000–₦99,999</option><option value="luxury">₦100,000+</option></select></label>
    <label>Minimum order<select value={quantity} onChange={e => setQuantity(e.target.value)}><option value="">Any quantity</option><option value="small">Small orders</option>{[50,100,250,500].map(n => <option key={n} value={n}>{n}+</option>)}</select></label>
    <label>Customisation<select value={custom} onChange={e => setCustom(e.target.value)}><option value="">Any finish</option><option value="personalised">Personalised</option><option value="branded">Branded</option><option value="none">Non-personalised</option></select></label>
    <label>Availability<select value={availability} onChange={e => setAvailability(e.target.value)}><option value="">All availability</option><option value="stock">In stock</option><option value="made">Made to order</option><option value="preorder">Pre-order</option></select></label></div></details>
    <button type="button" className="kokies-reset" onClick={clear}>Clear filters</button><span className="kokies-result-count" aria-live="polite">{filtered.length} gifts</span></section>
    <section className="kokies-products" aria-label="Gift products">{filtered.map(product => <Link href={`/kokies-world-of-gift/${product.id}`} className="kokies-product-card kokies-product-link" data-cms-item={String(product.id)} key={product.id}><div className="kokies-product-image"><CataloguePhoto src={product.image} alt={product.name}/><span>{product.sample || product.availability === 'made' ? 'MADE TO ORDER' : product.customisation === 'none' ? 'READY TO GIFT' : 'CAN BE PERSONALISED'}</span><b className="kokies-view-product">View gift ↗</b></div><div className="kokies-product-copy"><span className="kokies-product-category">{product.category}</span><h3>{product.name}</h3><p>{product.note}</p><strong>{product.quoteOnly || product.sample ? 'Price on request' : <>{!product.priceConfirmed && <small>From </small>}{naira(product.price)}</>} {!product.quoteOnly && !product.sample && <small>/ unit</small>}</strong><small>Minimum order: {product.minimum??100} units</small></div></Link>)}{!filtered.length && <div className="kokies-no-results"><h2>Let’s find another little something.</h2><p>No gifts match these filters. Try a different collection or budget.</p><button className="kokies-reset" onClick={clear}>Show all gifts</button></div>}</section>
  </>;
}
