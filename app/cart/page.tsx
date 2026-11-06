import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Your fabric bag', robots: { index: false } };
import ShoppingBag from '../../components/ShoppingBag';
export default function Cart(){return <ShoppingBag brand="idesire"/>}