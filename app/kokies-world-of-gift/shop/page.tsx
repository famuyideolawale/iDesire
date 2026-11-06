import type { Metadata } from 'next';
import GiftCatalogue from '../../../components/GiftCatalogue';
import KokiesPageIntro from '../../../components/KokiesPageIntro';

export const metadata: Metadata = { title: { absolute: 'The gift shop | Kokies World of Gifts' }, description: 'Browse personalised drinkware, corporate gifts, event souvenirs and thoughtful keepsakes from Kokies.' };
export default function GiftShop() {
  return <><KokiesPageIntro eyebrow="THE GIFT SHOP" title="Find their kind of lovely." description="Useful, personal and chosen with an occasion in mind. Explore the collection, find a favourite and tell us how you’d like to make it yours."/><div className="kokies-shop-note">Minimum quantities vary by gift. Prices marked “From” are estimates; we confirm the final price in your quote before you pay.</div><GiftCatalogue/></>;
}
