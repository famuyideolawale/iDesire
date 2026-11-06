"use client";
import {api,useLocal} from '../../../lib/local/client';
import {addToBag} from '../../../lib/local/bag';
import {CmsHeading} from '../../../components/CmsPage';
import Link from 'next/link';
import WhatsAppIcon from '../../../components/WhatsAppIcon';
import { lineNeedsQuote } from '../../../lib/delivery';
import { ProductGallery, CataloguePhoto } from '../../../components/ProductGallery';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useGiftCatalogue } from '../../../lib/kokies';
import { countPersonalisationWords, STANDARD_WORD_ALLOWANCE, GiftPersonalisation } from '../../../lib/personalisation';

const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
const printColours: Record<string, string> = { Wine: '#74333a', Cream: '#fdf6ec', White: '#ffffff', Black: '#191919', Gold: '#b59355' };
export default function KokiesProductPage() {
  const params = useParams();
  const products = useGiftCatalogue();
  const {data} = useLocal();
  const product = products.find(p => String(p.id) === String(params.id));
  const [requestedQuantity, setQuantity] = useState<string>();
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [requestedSize, setSize] = useState("");
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [event, setEvent] = useState('');
  const [method, setMethod] = useState<GiftPersonalisation['method']>('none');
  const [wording, setWording] = useState('');
  const [productColour, setProductColour] = useState('As pictured');
  const [customColour, setCustomColour] = useState('');
  const [printColour, setPrintColour] = useState('Wine');
  const [placement, setPlacement] = useState('Front / centre');
  const [artworkNotes, setArtworkNotes] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [extraAccepted, setExtraAccepted] = useState(false);
  const [notice, setNotice] = useState(''); const [busy,setBusy]=useState(false);
  const hasText = method === 'text' || method === 'text-and-logo';
  const hasLogo = method === 'logo' || method === 'text-and-logo';
  const wordCount = hasText ? countPersonalisationWords(wording) : 0;
  const extraWords = Math.max(0, wordCount - STANDARD_WORD_ALLOWANCE);
  const selectedProductColour = productColour === 'Custom colour' ? customColour.trim() : productColour;
  if (!product) return <div className="kwg-detail-shell"><h1>We couldn’t find that gift.</h1><Link href="/kokies-world-of-gift/shop">Back to the Kokies gift shop</Link></div>;
  const minimum = product.minimum ?? 100;
  const quantity = requestedQuantity === undefined ? minimum : Number(requestedQuantity);
  const validQuantity = Number.isInteger(quantity) && quantity >= minimum && quantity <= (product.maximum ?? 100000);
  const size = product.sizes?.includes(requestedSize) ? requestedSize : product.sizes?.[0];
  const stock = data?.inventory.find(i => i.productId === String(product.id))?.available;
  const phoneDigits = (data?.settings.phone || "").replace(/\D/g, "").replace(/^00/, "").replace(/^0(?=\d{10}$)/,"234");
  const whatsapp = /^[1-9]\d{7,14}$/.test(phoneDigits) ? phoneDigits : "2349099591993";
  const quote = lineNeedsQuote({ price: product.quoteOnly ? null : product.price, sample: product.sample, colours: product.colours },
    { personalisation: { method, extraWords, productColour: selectedProductColour } });
  const total = (validQuantity ? quantity : minimum) * product.price;

  function getPersonalisation(): GiftPersonalisation | null {
    if (hasText && !wordCount) { setNotice('Enter the wording under Personalise this gift.'); return null; }
    if (hasLogo && !artworkNotes.trim()) { setNotice('Enter the artwork brief under Personalise this gift.'); return null; }
    if (!selectedProductColour) { setNotice('Describe your preferred colour under Personalise this gift.'); return null; }
    if (extraWords && !extraAccepted) { setNotice('Acknowledge the additional wording quote under Personalise this gift.'); return null; }
    return { method, wording: hasText ? wording.trim() : '', wordCount, extraWords, productColour: selectedProductColour, printColour: method !== 'none' ? printColour : '', placement: method !== 'none' ? placement : '', artworkNotes: hasLogo ? artworkNotes.trim() : '', additionalNotes: additionalNotes.trim(), extraWordingQuoteAccepted: extraWords > 0 && extraAccepted };
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !enquiryOpen || !product || !validQuantity) return;
    if (!name.trim() || !phone.trim()) { setNotice('Please enter your name and phone number.'); return; }
    const personalisation = getPersonalisation();
    if (!personalisation) return;
    const details = [
      `Personalisation: ${method === 'none' ? 'Not requested' : method}`,
      `Preferred product colour: ${selectedProductColour} (availability to confirm)`,
      hasText ? `Exact wording: ${wording.trim()}\nWord count: ${wordCount} / ${STANDARD_WORD_ALLOWANCE} standard allowance` : '',
      method !== 'none' ? `Print / engraving colour: ${printColour}\nPlacement: ${placement}` : '',
      hasLogo ? `Artwork brief: ${artworkNotes.trim()}` : '',
      extraWords ? `EXTRA WORDING: ${extraWords} additional word(s) per unit. Additional charge requires a separate quote; customer acknowledged.` : '',
      additionalNotes.trim(),
      'Base gift estimate excludes any personalisation, extra-word and delivery charges pending the final quote.',
    ].filter(Boolean).join('\n');
    setBusy(true);
    try { const saved=await api('/api/local/kokies',{type:'order',kind:'enquiry',productId:String(product.id),quantity,size,customerName:name,phone,notes:`Event: ${event}\n${details}`,personalisation});setNotice(`Your enquiry ${saved.id} has reached the Kokies admin. The team will confirm costs and availability before payment.`); } catch(e){setNotice((e as Error).message)}finally{setBusy(false)}
  }

  return <div className="kwg-detail-shell" data-cms-product={String(product.id)}><div className="kwg-breadcrumb"><Link href="/kokies-world-of-gift/shop">The Kokies gift shop</Link><span>/</span><span>{product.category}</span></div>
    <div className="kwg-detail-grid"><div className="kwg-detail-image"><ProductGallery src={product.colours?.find(c=>c.name===selectedProductColour)?.image || product.image} alt={product.name} photos={product.gallery} /></div>
      <div className="kwg-detail-copy"><span className="kokies-eyebrow">{product.category}</span><CmsHeading>{product.name}</CmsHeading><p>{product.note}</p>{product.sourceUrl && <a className="kwg-inspiration-link" href={product.sourceUrl} target="_blank" rel="noreferrer">See the inspiration on Kokies’ Instagram ↗</a>}<strong className="kwg-detail-price">{product.quoteOnly || product.sample ? 'Request a quote':money(product.price)} {!product.quoteOnly && !product.sample && <small>per unit</small>}</strong><p className="kwg-order-minimum">Minimum order: {minimum} units · {product.availability === "made" ? "Made to order" : product.availability === "preorder" ? "Pre-order" : stock === undefined ? "Availability to confirm" : stock + " units available"}</p>
      {product.leadTime && <p>Lead time: {product.leadTime}</p>}
        <form className="kwg-order-form" onSubmit={submitOrder} onInvalidCapture={e => {
          const section = (e.target as HTMLElement).closest('details');
          if (section) section.open = true;
        }}>
          <label>Quantity<input type="number" min={minimum} max={product.maximum ?? 100000} step={1} required value={requestedQuantity ?? minimum} onChange={e => setQuantity(e.target.value)}/></label>
          {product.sizes?.length ? <label>Size<select value={size} onChange={e=>setSize(e.target.value)}>{product.sizes.map(option=><option key={option}>{option}</option>)}</select></label> : null}
          <details className="kwg-order-disclosure">
            <summary>Personalise this gift <span>Optional</span></summary>
            <div className="kwg-order-fields">
          <label>Personalisation option<select value={method} onChange={e => { setMethod(e.target.value as GiftPersonalisation['method']); setExtraAccepted(false); }}><option value="none">No personalisation</option><option value="text">Name / message</option><option value="logo">Logo / artwork</option><option value="text-and-logo">Name / message + logo</option></select></label>
          <div className="kwg-colour-fields"><label>Preferred product colour<select value={productColour} onChange={e => setProductColour(e.target.value)}><option>As pictured</option>{(product.colours?.map(c=>c.name) ?? ["Wine","Cream","Black","White","Navy"]).map(colour=><option key={colour}>{colour}</option>)}<option>Custom colour</option></select></label>{productColour === 'Custom colour' && <label>Describe your preferred colour<input required maxLength={100} value={customColour} onChange={e => setCustomColour(e.target.value)} placeholder="e.g. blush pink or #D8A6AD"/></label>}</div>
          {method !== 'none' && <><p className="kwg-personalisation-policy">Standard wording allowance: up to <b>8 words</b>. Additional words attract an extra charge, quoted separately. All personalisation finishes and costs are confirmed before production.</p>
            {hasText && <><label>Personalisation wording<textarea required value={wording} onChange={e => { setWording(e.target.value); setExtraAccepted(false); }} rows={3} maxLength={1500} placeholder="Enter the exact name or message, including spelling" aria-describedby="personalisation-word-count"/></label><p id="personalisation-word-count" className={extraWords ? 'kwg-word-count over-allowance' : 'kwg-word-count'} aria-live="polite">{wordCount} / 8 words{extraWords > 0 ? ` · ${extraWords} extra word${extraWords === 1 ? '' : 's'} — additional quote required` : ' · within the standard allowance'}</p></>}
            <div className="kwg-colour-fields"><label>Print / engraving colour<select value={printColour} onChange={e => setPrintColour(e.target.value)}>{Object.keys(printColours).map(colour => <option key={colour}>{colour}</option>)}</select></label><label>Preferred placement<select value={placement} onChange={e => setPlacement(e.target.value)}><option>Front / centre</option><option>Back</option><option>Gift packaging</option><option>Discuss with the team</option></select></label></div>
            {hasLogo && <label>Logo / artwork brief<textarea required value={artworkNotes} onChange={e => setArtworkNotes(e.target.value)} rows={3} placeholder="Describe your logo, artwork colours and placement. The team will request the final artwork."/></label>}
            {hasText && wording.trim() && <div className="kwg-wording-preview"><small>WORDING PREVIEW · PLACEMENT AND FINISH TO CONFIRM</small><p style={{ color: printColours[printColour], background: printColour === 'White' || printColour === 'Cream' ? '#74333a' : '#fdf6ec' }}>{wording}</p></div>}
            {extraWords > 0 && <label className="kwg-extra-acknowledgement"><input type="checkbox" required checked={extraAccepted} onChange={e => setExtraAccepted(e.target.checked)}/><span>I understand that {extraWords} extra word{extraWords === 1 ? '' : 's'} per unit will attract an additional charge. Kokies will quote the amount before I confirm my order.</span></label>}
          </>}
          <label>Other instructions (optional)<textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} rows={2} placeholder="Packaging, colour matching or special requests"/></label>
            </div>
          </details>
          <div className="kwg-customisation-summary"><div><span>Base gift subtotal · {quantity} units</span><strong>{product.quoteOnly || product.sample ? 'To quote' : money(total)}</strong></div>{method !== 'none' && <div><span>Personalisation</span><b>Quoted separately</b></div>}{extraWords > 0 && <div><span>Extra wording · {extraWords} extra / unit</span><b>Additional quote required</b></div>}<small>Personalisation and delivery are confirmed separately.</small></div>
          {!validQuantity && <p role="status">Enter a whole quantity from {minimum} to {(product.maximum ?? 100000).toLocaleString()} units.</p>}
          <button type="button" className="kwg-order-primary" disabled={!validQuantity} onClick={() => {
            const personalisation = getPersonalisation();
            if (!personalisation) return;
            addToBag('kokies', {productId: String(product.id), quantity, personalisation});
            setNotice('Added to your gift bag. Open the bag to review your order.');
          }}>Add to gift bag</button>
          <div className="kwg-order-actions">
          <button type="button" className="kwg-order-secondary" disabled={!validQuantity} onClick={() => {
            const personalisation = getPersonalisation();
            if (!personalisation) return;
            addToBag("kokies",{productId:String(product.id),quantity,size,personalisation});
            location.assign("/kokies-world-of-gift/cart");
          }}>Buy now</button>
          <button type="button" className="kwg-order-whatsapp-button" disabled={!validQuantity} onClick={() => {
            const personalisation = getPersonalisation();
            if (!personalisation) return;
            const lines = ["Hi Kokies, I'd like to order this gift:", product.name, "Product: " + (product.sku || product.id),
              "Quantity: " + quantity, "Colour: " + selectedProductColour, size ? "Size: " + size : "",
              method !== "none" ? "Personalisation: " + method + (wording ? " · " + wording : "") : "",
              product.quoteOnly || product.sample ? "Price: Please quote" : "Subtotal: " + money(total) + (quote ? " (personalisation to quote)" : ""),
              "Delivery: please confirm the fee to my location",
              "Please confirm availability, delivery and the final amount."];
            window.open("https://wa.me/" + whatsapp + "?text=" + encodeURIComponent(lines.filter(Boolean).join("\n")), "_blank", "noopener,noreferrer");
          }}><WhatsAppIcon /> Order on WhatsApp</button>
          </div>
          <Link className="kwg-view-bag" href="/kokies-world-of-gift/cart">View gift bag &#8599;</Link>
          <details className="kwg-order-disclosure" onToggle={e => setEnquiryOpen(e.currentTarget.open)}>
            <summary>Request a quote</summary>
            {enquiryOpen && <div className="kwg-order-fields">
              <label>Your name<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Name or organisation"/></label>
              <label>Phone number<input type="tel" required autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)}/></label>
              <label>Event / required date<input value={event} onChange={e => setEvent(e.target.value)} placeholder="e.g. conference, wedding, date"/></label>
              <button className="kwg-order-primary" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send quote request'}</button>
              <small>Keep your reference to track your request.</small>
            </div>}
          </details>
          {notice && <p className="kwg-order-notice" role="status">{notice}</p>}
        </form><details><summary>Delivery and lead time</summary><p>We confirm the delivery fee and date for your location before payment. {product.leadTime || "Lead time depends on stock and your chosen personalisation."}</p></details><Link className="kwg-back-link" href="/kokies-world-of-gift/shop">← Continue browsing gifts</Link>
      </div>
    </div><section className="kwg-related"><span className="kokies-eyebrow">MORE TO EXPLORE</span><h2>Other gifts in the collection</h2><div>{products.filter(p => p.id !== product.id).sort((a,b) => (Number(product.relatedIds?.includes(String(b.id)) ?? false)*10 + Number(b.category === product.category)) - (Number(product.relatedIds?.includes(String(a.id)) ?? false)*10 + Number(a.category === product.category))).slice(0, 4).map(p => <Link key={p.id} href={`/kokies-world-of-gift/${p.id}`}><CataloguePhoto src={p.image} alt={p.name}/><b>{p.name}</b><span>{p.quoteOnly || p.sample ? "Request a quote" : money(p.price)}</span></Link>)}</div></section>
  </div>;
}
