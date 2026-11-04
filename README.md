# iDesire TRADS & Kokies World of Gifts

Two separate storefronts and branded admin workspaces, connected to a persistent local Next.js backend. iDesire sells fabrics; Kokies sells finished gifts and souvenirs.

## Run locally

```powershell
npm install
npm run dev
```

Open [iDesire](http://localhost:2030), [Kokies](http://localhost:2030/kokies-world-of-gift), [iDesire admin](http://localhost:2030/admin) or [Kokies admin](http://localhost:2030/admin/kokies). Both development and production commands use port 2030. Stop the running server with Ctrl+C before starting another server on that port.

For production-mode local use: `npm run build`, then `npm run start`. Development uses `.next-dev`; production uses `.next`. Run only one server process against the same local database when editing records.

## Accounts and local sign-in

The demo and verification staff accounts have been removed from this workspace. Only the Developer account is retained; create the accounts you need through Accounts.

The primary account is `Developer` (username login). Its generated password was issued privately and is not stored in this README. Login fields are empty; demo credentials are no longer prefilled or advertised on the sign-in screen.

Open **Accounts** in either admin to create staff with a generated password, modify their display name/username/email, assign roles and businesses, suspend/reinstate access, or regenerate passwords. A generated password is shown once in the requesting admin screen and stored only as a salted scrypt hash. Suspension, password changes/resets and role/business-access changes revoke existing sessions immediately. Account changes refresh both brand workspaces. You cannot suspend/demote your own Developer account; change your own password in Settings.

Developers manage all accounts across both brands. Owners manage Managers within their own assigned businesses. Managers cannot manage accounts. Signed, HTTP-only sessions expire after eight hours and every private route checks current account access.

For a fresh local database only, `node scripts/provision-developer.cjs` creates the first Developer through a one-use filesystem token and outputs its generated password once. It does not overwrite an existing Developer. The token is removed immediately; ordinary Owners cannot use the staff API to grant Developer access.

## Admin workflows

Both workspaces offer Overview, Orders, Products, Inventory, Customers, Enquiries, Live chat, Page builder, Media, Settings, Accounts (permitted roles only) and Activity. iDesire uses a dark burgundy sidebar and operational dashboard. Kokies uses a wine-and-cream gift house desk with horizontal pill navigation.

The first run seeds each business with 12 fictional orders, eight customers, six enquiries, four chat conversations, inventory, media, subscriber examples and ten CMS page definitions. Records labelled Demo use fictional contacts at example.test. Verification submissions are named Local QA, Browser QA or Checkout QA. The catalogues contain ten fabrics and eleven gifts, including three additional sample concepts for each brand. Concepts use illustrative photography and require approval; their initial physical stock is zero.

### Brand Studio — visual page builder

Open Page builder and choose a page. The canvas loads the actual storefront page with its real CSS, images, navigation, catalogue and functional templates. Click a heading, paragraph, image, button or link to select it; the inspector is populated with that item's current content. Text, button labels and link destinations update directly in the canvas. Images support upload-and-replace, a thumbnail media picker, image URL and alt text. A section-image shortcut makes background photos accessible even when text overlays them.

Desktop (1280 px), tablet (768 px) and mobile (390 px) modes render real responsive layouts. Expand workspace provides a larger editing area. Click-to-edit selects content; Test interactions lets you operate sliders, menus and disclosures. Form submissions are disabled inside the editor to avoid accidental orders. Each hero slide and product has a stable scope for its edits. Shared headers, footers and the business strip are explicitly labelled in the inspector and publish across the current brand only.

Undo/redo and element reset support revisions before saving. Save draft keeps changes private. Publish page makes them live and records the previous version. Page settings contains SEO controls, a saved-draft preview link and version restore. Unsaved changes are guarded when switching pages or leaving the editor. Sections can be added, reordered and hidden while the real page remains visible. Cart, contact, tracking, wedding and product templates protect their functional tools. Text and URLs are validated on the server; this editor does not accept arbitrary HTML or scripts.

The initial draft mirrors the published page. Previously saved drafts reopen as drafts. Visual changes persist in the local database and are applied after page hydration. If the source markup is redesigned in code later, review affected visual edits because structural selectors may need updating. Slide, product, section and shared-region identifiers reduce accidental cross-item changes.

### Orders and stock

Customers can add fabrics or gifts to separate bags and submit contact/delivery details. Server-side product prices and minimums determine the order; browser totals are never trusted. Product enquiries preserve colours and structured personalisation. Up to eight words are in the standard wording allowance; additional wording requires explicit quote acknowledgement, validated again by the server.

Unknown prices, sample concepts and personalised gifts require quotation. Staff can issue a final quote with unit costs (including agreed personalisation), a delivery fee and notes. Confirm payment manually after checking your payment records; then move the order through production, ready, dispatch and completion. Stock reservations are created for priced checkout orders and released on cancellation or deducted on dispatch. Inventory adjustments require a reason and keep a movement ledger. Order histories and customer notes/tags follow patterns reviewed in the local Mandy Vogue project.

Orders and enquiries can be tracked with their reference and matching phone number. Each brand only searches its own records. Website contact, wedding, corporate and gifting forms reach their corresponding admin registers. Newsletter sign-ups appear in Overview.

### Live chats

Each storefront has its own live chat widget and admin inbox. Open a storefront in one browser and its admin in another. A customer message arrives in Live chat; staff can reply, recommend a product, assign a teammate, add tags and mark a thread resolved. Replies appear in the originating visitor’s browser automatically. Separate HTTP-only visitor cookies isolate private conversations and brands. This is real local browser-to-browser chat, not a scripted bot or a shared browser-storage transcript.

### Media and settings

Upload PNG, JPEG or WebP images up to 5 MB. File signatures are checked server-side. Select uploaded media in Brand Studio or copy its path into a product. Unused media can be archived from the library; files remain available to previous page versions. Brand settings control announcement, homepage copy, contact details, opening hours and chat availability/welcome. Export a business snapshot from Settings. Activity records server changes.

## Persistence and boundaries

The server stores records in `.local/store.json`, maintains `.local/store.previous.json` as the previous successful save, and stores media in `.local/media`. Writes are serialized and replaced atomically. `.local/session-secret` signs sessions. These files are ignored by Git. Back up the entire `.local` directory while the server is stopped. Do not delete it to restart the app; deletion removes local records and re-seeds demonstration data.

The browser only persists shopping bags. Older prototype localStorage records remain untouched and are no longer the authoritative admin database. The server starts from the supplied catalogue and fictional records, rather than automatically importing potentially mixed legacy records.

Local functionality does not require external services. Actual online payments, email/SMS alerts, shipping integrations and internet hosting are not connected. Before public deployment, remove prefilled demo sign-ins, confirm client prices and stock, and replace this single-process local file store with a deployment-appropriate database and storage.

## Verification

`npm run build` checks compilation and TypeScript. Local API checks cover private-data isolation, authenticated brand permissions, server-calculated prices, stock reservation/release, personalisation consent, enquiries, tracking, CMS drafts/publishing and protected sections. Browser checks cover both admins and storefronts at 390 px, live replies between separate browser contexts, chat isolation, publishing to an already-open page, business switching, catalogue creation, shopping bags/checkout and media upload/serving. Visual editor checks cover click selection with populated values, inline canvas updates, text/image/link publishing, private drafts, undo, responsive canvas sizes, shared-region isolation, independent hero slides, custom section editing and the actual page templates for both brands. Temporary scripts and review screenshots are under ignored `output/`.

## Visual assets

Kokies uses wine `#74333A` and cream `#FDF6EC` sampled from the supplied logo. iDesire retains burgundy, cream and champagne with a fashion-led layout. Both storefronts introduce and link to the separate sister business. Optimised campaign images live in `public/campaigns/`; fabrics in `public/products/`; finished gifts in `public/kokies/`. Generation notes are retained with the assets. No fabric products are placed in Kokies.
