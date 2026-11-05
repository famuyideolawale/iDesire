import type { Metadata } from 'next';
export const metadata: Metadata = { title: { absolute: 'Kokies World of Gifts | The gifting desk' }, icons: { icon: '/kokies/kokies-logo.webp' } };
export default function KokiesAdminLayout({ children }: { children: React.ReactNode }) { return children; }
