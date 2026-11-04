"use client";
import { useLocal } from "../lib/local/client";
export function Announcement() {
  const { data } = useLocal();
  return data?.settings.announcement ? (
    <div className="brand-announcement" data-cms-site="announcement">{data.settings.announcement}</div>
  ) : null;
}
export default function BrandDetails() {
  const { data } = useLocal();
  if (!data) return null;
  return (
    <div className="brand-contact-details">
      <strong>Visit & contact</strong>
      <p>{data.settings.address}</p>
      <p>{data.settings.openingHours}</p>
      <a href={`mailto:${data.settings.email}`}>{data.settings.email}</a>
      <a
        href={`https://wa.me/${data.settings.phone}`}
        target="_blank"
        rel="noreferrer"
      >
        +{data.settings.phone}
      </a>
      <a href={data.settings.instagram} target="_blank" rel="noreferrer">
        Follow us on Instagram ↗
      </a>
    </div>
  );
}
