import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Kokies World of Gifts | A little personal. A lot of heart.' },
  description: 'Personalised gifts, branded keepsakes, corporate gifts and event souvenirs by Kokies World of Gifts.',
  icons: { icon: '/kokies/kokies-world-of-gifts-logo.jpg' },
};

export default function KokiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
