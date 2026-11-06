import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Kokies World of Gifts | A little personal. A lot of heart.', template: '%s | Kokies World of Gifts' },
  openGraph: { siteName: 'Kokies World of Gifts', images: [{ url: '/kokies/kokies-logo.webp' }] },
  description: 'Personalised gifts, branded keepsakes, corporate gifts and event souvenirs by Kokies World of Gifts.',
  icons: { icon: '/kokies/kokies-logo.webp' },
};

export default function KokiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
