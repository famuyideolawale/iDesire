"use client";
import {api,useLocal} from '../../../lib/local/client';
import {addToBag} from '../../../lib/local/bag';
import {CmsHeading} from '../../../components/CmsPage';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useGiftCatalogue, readLocal, GiftOrder } from '../../../lib/kokies';
import { countPersonalisationWords, STANDARD_WORD_ALLOWANCE, GiftPersonalisation } from '../../../lib/personalisation';

const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
const printColours: Record<string, string> = { Wine: '#74333a', Cream: '#fdf6ec', White: '#ffffff', Black: '#191919', Gold: '#b59355' };
export default function KokiesProductPage() {
  const params = useParams();
  const products = useGiftCatalogue();
  const {data:catalogueData}=useLocal();
  const product = products.find(p => String(p.id) === String(params.id));
  const [quantity, setQuantity] = useState(100);
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
  const total = quantity * product.price;
  const minimum=product.minimum??100;

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !name.trim() || !phone.trim()) { setNotice('Please enter your name and phone number.'); return; }
    if (hasText && !wordCount) { setNotice('Please enter the wording you would like personalised.'); return; }
    if (extraWords && !extraAccepted) { setNotice('Please acknowledge the additional-word quote before submitting.'); return; }
    const personalisation: GiftPersonalisation = { method, wording: hasText ? wording.trim() : '', wordCount, extraWords, productColour: selectedProductColour, printColour: method !== 'none' ? printColour : '', placement: method !== 'none' ? placement : '', artworkNotes: hasLogo ? artworkNotes.trim() : '', additionalNotes: additionalNotes.trim(), extraWordingQuoteAccepted: extraWords > 0 && extraAccepted };
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
    const order: GiftOrder = { reference: `KWG-${Date.now()}`, business: 'Kokies World of Gifts', product: product.name, quantity, unitPrice: product.price, estimatedTotal: total, customerName: name.trim(), phone: phone.trim(), event: event.trim(), customisation: details, personalisation, status: 'Enquiry received', createdAt: new Date().toISOString() };
    setBusy(true);
    try { const saved=await api('/api/local/kokies',{type:'order',kind:'enquiry',productId:String(product.id),quantity,customerName:name,phone,notes:`Event: ${event}\n${details}`,personalisation});setNotice(`Your enquiry ${saved.id} has reached the Kokies admin. The team will confirm costs and availability before payment.`); } catch(e){setNotice((e as Error).message)}finally{setBusy(false)}
  }

  return <div className="kwg-detail-shell" data-cms-product={String(product.id)}><div className="kwg-breadcrumb"><Link href="/kokies-world-of-gift/shop">The Kokies gift shop</Link><span>/</span><span>{product.category}</span></div>
    <div className="kwg-detail-grid"><div className="kwg-detail-image"><img src={product.image} alt={product.name}/><span>PRODUCT PREVIEW · DEMO PRICE</span></div>
      <div className="kwg-detail-copy"><span className="kokies-eyebrow">{product.category}</span><CmsHeading>{product.name}</CmsHeading><p>{product.note}</p>{product.sourceUrl && <a className="kwg-inspiration-link" href={product.sourceUrl} target="_blank" rel="noreferrer">See the inspiration on Kokies’ Instagram ↗</a>}<strong className="kwg-detail-price">{product.quoteOnly?'Price on request':money(product.price)} {!product.quoteOnly&&<small>per unit · provisional demo price</small>}</strong><div className="kwg-minimum-note"><b>Made for your occasion</b><span>Bulk product · minimum {minimum} units</span><span>Personalisation and colour requests are subject to product suitability and availability.</span></div>
        <form className="kwg-order-form" onSubmit={submitOrder}>
          <h2>Make it yours.</h2><label>Quantity (minimum {minimum})<input type="number" min={minimum} step={1} required value={quantity} onChange={e => setQuantity(Math.max(minimum, Math.floor(Number(e.target.value) || 100)))}/></label>
          <label>Personalisation option<select value={method} onChange={e => { setMethod(e.target.value as GiftPersonalisation['method']); setExtraAccepted(false); }}><option value="none">No personalisation</option><option value="text">Name / message</option><option value="logo">Logo / artwork</option><option value="text-and-logo">Name / message + logo</option></select></label>
          <div className="kwg-colour-fields"><label>Preferred product colour<select value={productColour} onChange={e => setProductColour(e.target.value)}><option>As pictured</option><option>Wine</option><option>Cream</option><option>Black</option><option>White</option><option>Navy</option><option>Custom colour</option></select></label>{productColour === 'Custom colour' && <label>Describe your preferred colour<input required maxLength={100} value={customColour} onChange={e => setCustomColour(e.target.value)} placeholder="e.g. blush pink or #D8A6AD"/></label>}</div>
          {method !== 'none' && <><p className="kwg-personalisation-policy">Standard wording allowance: up to <b>8 words</b>. Additional words attract an extra charge, quoted separately. All personalisation finishes and costs are confirmed before production.</p>
            {hasText && <><label>Personalisation wording<textarea required value={wording} onChange={e => { setWording(e.target.value); setExtraAccepted(false); }} rows={3} maxLength={1500} placeholder="Enter the exact name or message, including spelling" aria-describedby="personalisation-word-count"/></label><p id="personalisation-word-count" className={extraWords ? 'kwg-word-count over-allowance' : 'kwg-word-count'} aria-live="polite">{wordCount} / 8 words{extraWords > 0 ? ` · ${extraWords} extra word${extraWords === 1 ? '' : 's'} — additional quote required` : ' · within the standard allowance'}</p></>}
            <div className="kwg-colour-fields"><label>Print / engraving colour<select value={printColour} onChange={e => setPrintColour(e.target.value)}>{Object.keys(printColours).map(colour => <option key={colour}>{colour}</option>)}</select></label><label>Preferred placement<select value={placement} onChange={e => setPlacement(e.target.value)}><option>Front / centre</option><option>Back</option><option>Gift packaging</option><option>Discuss with the team</option></select></label></div>
            {hasLogo && <label>Logo / artwork brief<textarea required value={artworkNotes} onChange={e => setArtworkNotes(e.target.value)} rows={3} placeholder="Describe your logo, artwork colours and placement. The team will request the final artwork."/></label>}
            {hasText && wording.trim() && <div className="kwg-wording-preview"><small>WORDING PREVIEW · PLACEMENT AND FINISH TO CONFIRM</small><p style={{ color: printColours[printColour], background: printColour === 'White' || printColour === 'Cream' ? '#74333a' : '#fdf6ec' }}>{wording}</p></div>}
            {extraWords > 0 && <label className="kwg-extra-acknowledgement"><input type="checkbox" required checked={extraAccepted} onChange={e => setExtraAccepted(e.target.checked)}/><span>I understand that {extraWords} extra word{extraWords === 1 ? '' : 's'} per unit will attract an additional charge. Kokies will quote the amount before I confirm my order.</span></label>}
          </>}
          <label>Other instructions (optional)<textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} rows={2} placeholder="Packaging, colour matching or special requests"/></label>
          <div className="kwg-customisation-summary"><div><span>Base gift subtotal · {quantity} units</span><strong>{product.quoteOnly?'To quote':money(total)}</strong></div>{method !== 'none' && <div><span>Personalisation</span><b>Quoted separately</b></div>}{extraWords > 0 && <div><span>Extra wording · {extraWords} extra / unit</span><b>Additional quote required</b></div>}<small>Demo estimate. Personalisation, extra-word charges and delivery are excluded until your final quote is agreed.</small></div>
          <button type="button" className="kwg-order-primary" onClick={()=>{addToBag('kokies',{productId:String(product.id),quantity,personalisation:{method,wording,wordCount,extraWords,productColour:selectedProductColour,printColour,placement,artworkNotes,additionalNotes,extraWordingQuoteAccepted:extraAccepted}});setNotice('Added to your gift bag. Open the gift bag to review and send your order.')}}>Add to gift bag</button><Link href="/kokies-world-of-gift/cart">View gift bag ↗</Link><h2 className="kwg-contact-title">Your order details</h2><label>Your name<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Name or organisation"/></label><label>Phone number<input type="tel" required autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)}/></label><label>Event / required date<input value={event} onChange={e => setEvent(e.target.value)} placeholder="e.g. conference, wedding, date"/></label><button className="kwg-order-primary" type="submit" disabled={busy}>Submit website order enquiry ↗</button><a className="kwg-order-whatsapp" href="https://www.instagram.com/kokiesworldofgifts/" target="_blank" rel="noreferrer">Discuss your gift on Instagram ↗</a>{notice && <p className="kwg-order-notice" role="status">{notice}</p>}<small>Your enquiry is securely saved to the local Kokies workspace. Track it using your reference and phone number.</small>
        </form><Link className="kwg-back-link" href="/kokies-world-of-gift/shop">← Continue browsing gifts</Link>
      </div>
    </div><section className="kwg-related"><span className="kokies-eyebrow">MORE TO EXPLORE</span><h2>Other gifts in the collection</h2><div>{products.filter(p => p.id !== product.id).slice(0, 4).map(p => <Link key={p.id} href={`/kokies-world-of-gift/${p.id}`}><img src={p.image} alt={p.name} loading="lazy"/><b>{p.name}</b><span>{money(p.price)}</span></Link>)}</div></section>
  </div>;
}
