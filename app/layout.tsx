import './admin-desk.css';
import './admin-workspaces.css';
import './admin-system.css';
import type { Metadata } from 'next'; import './globals.css'; import './brands.css'; import './approved-design.css'; import StoreShell from '../components/StoreShell';
export const metadata:Metadata={title:{default:'iDesire TRADS | Where Tradition Meets Innovation',template:'%s | iDesire TRADS'},description:'Premium Asoebi, wedding fabrics, souvenirs, custom packaging and event branding.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><StoreShell>{children}</StoreShell></body></html>}
