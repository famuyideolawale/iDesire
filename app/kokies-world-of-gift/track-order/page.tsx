import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Track your order', description: 'Check the status of your Kokies order or enquiry with your reference.' };
import OrderTracker from '../../../components/OrderTracker';
export default function Track(){return <OrderTracker brand="kokies"/>}