export type ProductColour = { name: string; slug: string; hex: string; image: string };
export type Product = { slug:string; name:string; category:string; price?:number; image:string; label?:string; description:string; colours?:ProductColour[]; yardOptions?:number[]; minimumYards?:number; sourceUrl?:string; sample?:boolean };

export const royalBloomColours: ProductColour[] = [
 {name:'Wine',slug:'wine',hex:'#7b142d',image:'/products/royal-bloom-wine.webp'},
 {name:'Emerald Green',slug:'emerald',hex:'#123d2b',image:'/products/royal-bloom-emerald.webp'},
 {name:'Chocolate Brown',slug:'brown',hex:'#5a3829',image:'/products/royal-bloom-brown.webp'},
 {name:'Champagne',slug:'champagne',hex:'#e6d1bd',image:'/products/royal-bloom-champagne.webp'},
 {name:'Navy Blue',slug:'navy',hex:'#14264f',image:'/products/royal-bloom-navy.webp'},
 {name:'Plum',slug:'plum',hex:'#28102f',image:'/products/royal-bloom-plum.webp'},
];

export const sequinLaceColours: ProductColour[] = [
 {name:'Mint Green',slug:'mint-green',hex:'#a8c7b4',image:'/products/sequin-lace-mint.webp'},
 {name:'Silver Grey',slug:'silver-grey',hex:'#a6a6aa',image:'/products/sequin-lace-silver.webp'},
 {name:'Powder Blue',slug:'powder-blue',hex:'#9db6d6',image:'/products/sequin-lace-powder-blue.webp'},
 {name:'White',slug:'white',hex:'#f5f3f0',image:'/products/sequin-lace-white.webp'},
 {name:'Champagne',slug:'champagne',hex:'#e9d9ad',image:'/products/sequin-lace-champagne.webp'},
 {name:'Blush Pink',slug:'blush-pink',hex:'#e8b7bd',image:'/products/sequin-lace-blush-pink.webp'},
];


export const signatureLaceColours: ProductColour[] = [
 {name:'Blush Rose',slug:'blush-rose',hex:'#c9a2a8',image:'/products/embellished-lace-blush-rose.webp'},
 {name:'Champagne & Burgundy',slug:'champagne-burgundy',hex:'#bca58c',image:'/products/embellished-lace-champagne-burgundy.webp'},
 {name:'Blue Grey',slug:'blue-grey',hex:'#9aabb4',image:'/products/embellished-lace-blue-grey.webp'},
 {name:'Sage Green',slug:'sage-green',hex:'#9eaa91',image:'/products/embellished-lace-sage-green.webp'},
 {name:'Champagne Gold',slug:'champagne-gold',hex:'#d4bd8d',image:'/products/embellished-lace-champagne-gold.webp'},
 {name:'Blush Peach',slug:'blush-peach',hex:'#d9aaa0',image:'/products/embellished-lace-blush-peach.webp'},
];

export const sampleFabricProducts: Product[] = [
 {slug:'pearl-bridal-lace-concept',name:'Pearl Bridal Lace',category:'Bridal Fabric Concepts',image:'/products/concepts/pearl-bridal-lace.webp',label:'Sample concept',sample:true,description:'Sample concept with AI-generated imagery for client review. An ivory floral lace direction with pearl-style detailing and a scalloped edge. Pricing, stock, material composition and finishing are unconfirmed; request a quote before ordering.',colours:[{name:'Ivory',slug:'ivory',hex:'#f4eee2',image:'/products/concepts/pearl-bridal-lace.webp'}],minimumYards:5,yardOptions:[5,6,7,8,9,10]},
 {slug:'heritage-wine-aso-oke-concept',name:'Heritage Wine Aso-Oke',category:'Woven Fabric Concepts',image:'/products/concepts/heritage-wine-aso-oke.webp',label:'Sample concept',sample:true,description:'Sample concept with AI-generated imagery for client review. A structured wine woven-fabric direction with restrained champagne stripe detailing. Pricing, stock, weave composition and custom colour options need client confirmation before sale.',colours:[{name:'Wine & Champagne',slug:'wine-champagne',hex:'#74333a',image:'/products/concepts/heritage-wine-aso-oke.webp'}],minimumYards:5,yardOptions:[5,6,7,8,9,10]},
 {slug:'midnight-navy-jacquard-concept',name:'Midnight Navy Jacquard',category:'Jacquard Fabric Concepts',image:'/products/concepts/midnight-navy-jacquard.webp',label:'Sample concept',sample:true,description:'Sample concept with AI-generated imagery for client review. A midnight navy jacquard direction with a subtle botanical damask texture for coordinated occasion looks. Pricing, stock, material composition and finishing are subject to approval and a confirmed quote.',colours:[{name:'Midnight Navy',slug:'midnight-navy',hex:'#17243d',image:'/products/concepts/midnight-navy-jacquard.webp'}],minimumYards:5,yardOptions:[5,6,7,8,9,10]},
];

export const products: Product[] = [
 {slug:'royal-bloom-embroidered-lace',name:'Royal Bloom Embroidered Lace',category:'Premium Fabrics',price:30000,image:royalBloomColours[0].image,label:'6 colours',description:'A richly embroidered floral lace with a delicate vine motif and scalloped border. Available in six colour options. Ideal for asoebi, wedding guests and special-occasion tailoring. Customisable colours are available; terms and conditions apply.',colours:royalBloomColours,yardOptions:[5,6,7,8,9,10],minimumYards:5},
 {slug:'celestial-sequin-embroidered-lace',name:'Celestial Sequin Embroidered Lace',category:'Premium Fabrics',image:sequinLaceColours[0].image,label:'6 colours',description:'A statement embroidered lace featuring dimensional leaf motifs, fine sequin embellishments and a soft sheer base. Available in six colour options, suitable for wedding looks, asoebi and special-occasion tailoring. Contact us to confirm price, availability and custom colour options.',colours:sequinLaceColours,yardOptions:[5,6,7,8,9,10],minimumYards:5},
 {slug:'signature-floral-beaded-lace',name:'Signature Floral Beaded Lace',category:'Premium Fabrics',price:55000,image:signatureLaceColours[0].image,label:'6 colours',description:'An ornate floral lace with intricate embroidery, sparkling sequins, dimensional flower appliqués and bead detailing. A statement choice for weddings, asoebi groups and special-occasion outfits. Available in six colour variations.',colours:signatureLaceColours,yardOptions:[5,6,7,8,9,10],minimumYards:5},
 {slug:'2027-asoebi-preorder-14000',name:'2027 Asoebi Pre-Order Collection',category:'2027 Asoebi Pre-Order',price:14000,image:'/products/instagram/asoebi-14000-1.webp',label:'Pre-order · 6 colours',description:'2027 Asoebi pre-order fabric from iDesire TRADS. Customisable colours are available, subject to terms and conditions. Minimum order is 5 yards. Complimentary custom paper bags and eligible logo branding are available. Optional luxury packaging costs extra. Contact us to confirm current availability and delivery details.',colours:[{name:'Wine',slug:'wine',hex:'#7a1735',image:'/products/instagram/asoebi-14000-1.webp'},{name:'Emerald Green',slug:'emerald-green',hex:'#284a35',image:'/products/instagram/asoebi-14000-2.webp'},{name:'Chocolate Brown',slug:'chocolate-brown',hex:'#5d3a2d',image:'/products/instagram/asoebi-14000-3.webp'},{name:'Blush Pink',slug:'blush-pink',hex:'#d8b5b2',image:'/products/instagram/asoebi-14000-4.webp'},{name:'Navy Blue',slug:'navy-blue',hex:'#172c5b',image:'/products/instagram/asoebi-14000-5.webp'},{name:'Purple',slug:'purple',hex:'#54316d',image:'/products/instagram/asoebi-14000-6.webp'}],yardOptions:[5,6,7,8,9,10],minimumYards:5,sourceUrl:'https://www.instagram.com/idesiretradsng/p/DfRKQ0VCD4k/'},
 {slug:'2027-asoebi-preorder-18000',name:'2027 Asoebi Pre-Order Collection II',category:'2027 Asoebi Pre-Order',price:18000,image:'/products/instagram/asoebi-18000-1.webp',label:'Pre-order · 5 colours',description:'A 2027 Asoebi pre-order option featured by iDesire TRADS. Minimum order is 5 yards. Custom colour options are subject to terms and conditions. Contact us to confirm current availability, matching accessories, packaging and delivery.',colours:[{name:'Mint Green',slug:'mint-green',hex:'#b6c8b3',image:'/products/instagram/asoebi-18000-1.webp'},{name:'Silver Grey',slug:'silver-grey',hex:'#a6a8a8',image:'/products/instagram/asoebi-18000-2.webp'},{name:'Powder Blue',slug:'powder-blue',hex:'#9db7d8',image:'/products/instagram/asoebi-18000-3.webp'},{name:'White',slug:'white',hex:'#f4f0e9',image:'/products/instagram/asoebi-18000-4.webp'},{name:'Champagne',slug:'champagne',hex:'#d6c5a2',image:'/products/instagram/asoebi-18000-5.webp'}],yardOptions:[5,6,7,8,9,10],minimumYards:5,sourceUrl:'https://www.instagram.com/idesiretradsng/p/DfB4FEjCLBI/'},
 {slug:'premium-textured-aso-oke-fabric',name:'Premium Textured Aso-Oke Fabric',category:'Premium Fabrics',price:13000,image:'/products/instagram/asoebi-13000-1.webp',label:'6 colours',description:'Premium textured Aso-Oke fabric for weddings, coordinated family looks and special occasions. Available in six colour options: rust/orange, purple, champagne/gold, royal blue, silver and red. Minimum order is 5 yards (₦65,000). Custom colours and finishing are subject to terms and conditions.',colours:[{name:'Rust Orange',slug:'rust-orange',hex:'#c65c28',image:'/products/instagram/asoebi-13000-1.webp'},{name:'Purple',slug:'purple',hex:'#64418b',image:'/products/instagram/asoebi-13000-2.webp'},{name:'Champagne Gold',slug:'champagne-gold',hex:'#c7b18a',image:'/products/instagram/asoebi-13000-3.webp'},{name:'Royal Blue',slug:'royal-blue',hex:'#164c9a',image:'/products/instagram/asoebi-13000-4.webp'},{name:'Silver',slug:'silver',hex:'#b9b9bc',image:'/products/instagram/asoebi-13000-5.webp'},{name:'Red',slug:'red',hex:'#b51f35',image:'/products/instagram/asoebi-13000-6.webp'}],yardOptions:[5,6,7,8,9,10],minimumYards:5},
 {slug:'2027-asoebi-preorder-30000',name:'2027 Asoebi Pre-Order Collection III',category:'2027 Asoebi Pre-Order',price:30000,image:'/products/instagram/asoebi-30000-1.webp',label:'Pre-order · 6 colours',description:'A premium 2027 Asoebi pre-order fabric featured by iDesire TRADS at ₦30,000 per yard. Minimum order is 5 yards. Customisable colours are available subject to terms and conditions. Complimentary custom paper bags, eligible logo branding and optional luxury packaging are available. Contact us to confirm availability.',colours:[{name:'Blush Rose',slug:'blush-rose',hex:'#c8a0a7',image:'/products/instagram/asoebi-30000-1.webp'},{name:'Champagne',slug:'champagne',hex:'#cbb89d',image:'/products/instagram/asoebi-30000-2.webp'},{name:'Emerald Green',slug:'emerald-green',hex:'#66856e',image:'/products/instagram/asoebi-30000-3.webp'},{name:'Sage Green',slug:'sage-green',hex:'#a5b3a0',image:'/products/instagram/asoebi-30000-4.webp'},{name:'Champagne Gold',slug:'champagne-gold',hex:'#c7b28e',image:'/products/instagram/asoebi-30000-5.webp'},{name:'Silver Grey',slug:'silver-grey',hex:'#a9abad',image:'/products/instagram/asoebi-30000-6.webp'}],yardOptions:[5,6,7,8,9,10],minimumYards:5,sourceUrl:'https://www.instagram.com/idesiretradsng/p/DfPPn4DCOGo/'},
 ...sampleFabricProducts,
];
export const naira=(n:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n);

// One-time expansion preserves staff edits and respects later deletions.
export function readProductCatalogue(): Product[] {
 if(typeof window==='undefined')return products;
 try {
  const raw=localStorage.getItem('idesire-products-v1');
  if(!raw)return products;
  const saved=JSON.parse(raw) as Product[];
  if(!Array.isArray(saved))return products;
  if(!localStorage.getItem('idesire-sample-expansion-v1')){
   const additions=sampleFabricProducts.filter(p=>!saved.some(x=>x.slug===p.slug));
   const next=[...saved,...additions];
   try {localStorage.setItem('idesire-products-v1',JSON.stringify(next));localStorage.setItem('idesire-sample-expansion-v1','1');} catch {}
   return next;
  }
  return saved;
 }catch{return products;}
}
