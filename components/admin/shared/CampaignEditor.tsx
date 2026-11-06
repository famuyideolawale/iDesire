"use client";
import type { Brand, BusinessData } from "../../../lib/local/types";
import { campaignDefaults as fashion } from "../idesire/campaigns";
import { campaignDefaults as gifts } from "../kokies/campaigns";

export function CampaignEditor({ data, brand, save }: {
  data: BusinessData; brand: Brand; save: (input: Record<string, unknown>) => Promise<unknown>;
}) {
  const defaults = (brand === "kokies" ? gifts : fashion)(data.settings.heroTitle, data.settings.heroText);
  const fields = [["eyebrow", "Eyebrow"], ["title", "Heading"], ["text", "Description"], ["image", "Desktop image"],
    ["mobileImage", "Mobile image (optional)"], ["alt", "Image description"], ["cta", "Button label"], ["href", "Destination"]] as const;
  return <details className="desk-card">
    <summary>Homepage campaigns</summary>
    <p>Changes here publish to this brand's homepage. The visual editor remains available for page-level edits.</p>
    <form onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void save({ action: "saveHeroSlides", slides: defaults.map((_, index) => ({
        ...Object.fromEntries(fields.map(([key]) => [key, form.get(key + index)])),
        position: Number(form.get("position" + index)),
        visible: form.has("visible" + index),
      })) });
    }}>
      {defaults.map((fallback, index) => {
        const slide = {...fallback, ...data.settings.heroSlides?.[index]};
        return <details key={index}><summary>Campaign {index + 1} · {slide.title}</summary>
          <div className="desk-fields">
            {fields.map(([key, label]) => <label key={key}>{label}<input name={key + index} defaultValue={slide[key]} /></label>)}
            <label>Position<select name={"position" + index} defaultValue={slide.position ?? index}>{[0,1,2].map(n => <option key={n} value={n}>{n+1}</option>)}</select></label>
            <label className="desk-check"><input type="checkbox" name={"visible" + index} defaultChecked={slide.visible !== false} /> Show on homepage</label>
          </div>
        </details>;
      })}
      <button className="desk-primary">Publish campaigns</button>
    </form>
  </details>;
}
