import '../admin-workspaces.css';
import '../admin-system.css';
import '../admin-premium.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: { absolute: 'iDesire TRADS | Fabric studio admin' }, robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return children; }
