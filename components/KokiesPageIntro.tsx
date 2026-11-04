import {CmsHeading,CmsIntro} from './CmsPage';
import Link from 'next/link';

export default function KokiesPageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="kokies-page-intro"><div className="kokies-breadcrumb"><Link href="/kokies-world-of-gift">Kokies home</Link><span>/</span><span>{eyebrow}</span></div><span className="kokies-eyebrow">{eyebrow}</span><CmsHeading>{title}</CmsHeading><CmsIntro>{description}</CmsIntro></section>;
}
