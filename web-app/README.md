# Dalmia Hardware dashboard

The dashboard uses Next.js 16.3.6, React 19.3, and TypeScript. It includes 149 products, 148 separate catalog images, and 938 printed prices.

## Start development

Use Node.js 20.9 or later.

```sh
cd /Users/nipun/Code/dalmia-dashboard/web-app
npm ci
npm run dev
```

Open http://127.0.0.1:4173 in your browser. The server listens on this computer only.

## Start the production server

```sh
npm run build
npm start
```

If port 4173 is in use, select another port:

```sh
npm start -- --port 4175
```

## Application structure

- `app/` defines the Next.js pages, shared layout, and CSS.
- `components/` contains React components for the library, documents, product details, and shortlist.
- `lib/` contains data types, search functions, CSV export, and formatting functions.
- `data/catalog.json` stores the product records and source text.
- `documents/` contains the five original PDFs.
- `public/assets/products/` contains the model images and catalog context crops.
- `public/assets/pages/` contains previews of all 86 source pages.
- `scripts/` contains the PDF extraction tools and document preparation script.
- `tests/` contains data tests and browser tests.

Next.js serves a separate page for every model. React handles search, filters, and saved products. The browser loads product images from Supabase Storage.

The application reads the shared Supabase catalog when its environment variables are set.
Supabase Storage supplies catalog images, page previews, and PDF links.
The website loads original images from the configured project's `catalog-media` bucket. Vercel deployments exclude local product images and page previews.
The website disables Vercel image optimization because its managed endpoint bypasses the application login wall.
The Supabase project URL is required for catalog media. Images have no local fallback.
See [the database guide](../supabase/README.md) for setup and deployment.
Account pages use Supabase Auth. Staff and manufacturer permissions come from database rules.
See [accounts and access](../supabase/AUTH.md) for role administration and the first super admin.

The website requires login for all workspace pages, local PDFs, catalog images, and optimized image requests.
Visitors can open `/login`, `/signup`, `/forgot-password`, and the account confirmation routes without login.
The public account pages do not load the catalog or show workspace navigation.
After login, the website returns the user to the requested page. Direct login opens the product library.
Password reset links open `/account/password` after the website creates a recovery session.
The shared Supabase catalog API and Storage bucket retain their existing public access for the iOS and Android apps.
The website login wall does not restrict direct Supabase URLs.

## Visual design

The dashboard follows the supplied brochures. It uses charcoal panels, silver diagonal lines, white cards, and small gold accents.

The sidebar and favicon use the original logo paths from the cover of `door-handles-knobs.pdf`. Product photographs keep their original colors.

## Pages and features

| Address | Purpose |
| --- | --- |
| `/` | Search and filter products |
| `/models/door-handles-2601` | View one model, its image, prices, and source links |
| `/documents` | Search source pages and open the original PDFs |
| `/shortlist` | View saved products |
| `/playground` | Attach 3D fittings to furniture, compare finishes, and price the set |

Search accepts `DH1501`, `DH-1501`, and `DH 1501`. Sofa model `1501` and concealed handle `DH-1501` remain separate products.

All matching products appear on one page, including saved products. Document searches also show every matching page.

Filters cover category, size, finish, and data availability. CSV export includes the current results and their source price rows.

Signed-in users share their shortlist with the iOS and Android apps and other devices.
The browser keeps account-specific offline changes and retries sync every 15 seconds while open.
Guest saves stay on this computer. Use “Add device saves to account” to copy them into the signed-in account.

## Fitting playground

The playground builds ten furniture pieces from adjustable templates: wardrobe, kitchen run, chest of drawers, bedside table, TV unit, sofa, bed, ottoman, wall folding table, and entrance door.
Handles and knobs attach to doors and drawers, sofa legs to the underside of leg-mounted pieces, and brackets under the folding table top.
Pieces on legs rise to the chosen leg size.
`lib/playground.mjs` holds the templates, mounting rules, prices, and design links, and `tests/playground.test.mjs` covers them.
`components/playground-scene.ts` draws the scene with three.js and loads the product GLBs with their finish variants.

Each fitting keeps its finish, size, position, and angle. Finish names map to catalog price rows by letter or name, and per-inch prices multiply by the chosen length.
The bill lists quantities and totals at the listed price or any calculated price, and exports CSV.
Designs save in the browser, and share links carry the design in the address. Opening a share link requires sign-in.
Product pages with a 3D model link to the playground with that product ready to place.
The GLBs use Draco compression. `public/draco/` holds the decoder copied from `three/examples/jsm/libs/draco/gltf/`; copy it again after upgrading three.

## Separate model images

Each of the 148 pictured models has a unique image file. Models `2601` through `2611` use individual crops from page 23 of `door-handles-knobs.pdf`.

These crops preserve the original product pixels and exclude neighboring models. The extraction script records the crop boundaries for repeatable results.

Some model pictures show several finishes of that same model. Each model page also links to the original catalog context.

Model `1202` appears only in the price list. The supplied catalogs have no matching picture, so the dashboard marks its image as missing.

## Calculated prices

Each product card shows six calculated prices based on its lowest listed price. Each model page shows these fields for every finish and size.

The fields are 65% off, 75% off, and each discount with either 18% or 9% added afterward.

For a listed price of 1,000, the six results are 350.00, 250.00, 413.00, 295.00, 381.50, and 272.50.

The app applies the discount first and adds the percentage to that amount. It rounds only the final result to two decimal places.

The CSV export includes all six fields. Missing prices remain blank, and rates per inch keep their original basis.

## Source data

The original filenames and PDF contents remain unchanged.

| Source file | PDF pages | Content |
| --- | ---: | --- |
| `door-handles-knobs.pdf` | 31 | Door handle and knob pictures and specifications |
| `sofa-legs.pdf` | 41 | Sofa leg pictures and specifications |
| `Door handle price list.pdf` | 2 | Door handle and knob prices |
| `SOFA LEG (1).pdf` | 8 | Sofa leg prices |
| `profile handles.pdf` | 4 | Profile handles, concealed handles, and folding brackets |

The website opens these PDFs from Supabase Storage. Vercel deployments exclude the local copies.

Prices follow the printed lists. The PDFs do not state a currency, so the dashboard does not add a currency symbol.

GST is extra. Prices can change without notice. The Documents page includes the original terms and conditions.

Models `DH-1001` through `DH-1003` use rates per inch. These rates do not represent the total price of a handle.

A blank price cell means that the source lists no price. It does not mean zero or indicate stock availability.

Catalog models `1203`, `1231`, and `1244` have no matching listed prices.

Model `2605` lists `5755` for 10 inches. Sofa model `1510` lists `110` for finish A at 6 inches. The dashboard preserves and flags both values.

Models `1254` through `1257` use merged size cells. The dashboard labels their price size as unspecified.

The scanned catalogs use OCR, which reads text from pictures. This text can contain errors. Original images and PDF pages remain available.

## Tests

```sh
npm test
npm run typecheck
npm run build
npm run test:browser
```

Browser tests use installed Google Chrome and a production server on port 4175. They test desktop and phone layouts.

Catalog browser tests require temporary accounts and `DALMIA_TEST_LIVE_AUTH=1`.
Run `node scripts/test-auth-accounts.mjs create` from the repository root before these tests.
Run `node scripts/test-auth-accounts.mjs delete` from the repository root after these tests.
The login wall tests also cover visitors without an account and simulated signup and recovery requests.

The tests cover source integrity, price mappings, separate images, model pages, navigation, search, filters, saved products, CSV downloads, and PDF links.

## Rebuild the source data

Use Python 3 with the packages in `scripts/requirements.txt`.

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/extract.py
npm test
npm run build
```

The extraction script targets these five PDFs. It uses page positions for price columns and reviewed transcriptions for merged profile tables.

Each rebuild also runs `scripts/model-images.py` to create the individual handle crops.

The file `data/source-manifest.json` stores hashes, which identify the original file contents. The script rejects source files with changed hashes.

If a PDF changes, review the extraction rules, transcriptions, and image crop boundaries before updating the manifest.

If you need new OCR results, use macOS with the Swift compiler and Vision framework. Remove stale OCR files only for the changed pages.

```sh
.venv/bin/python scripts/render.py
swiftc scripts/ocr.swift -o /tmp/dalmia-ocr
/tmp/dalmia-ocr public/assets/pages data/ocr
.venv/bin/python scripts/extract.py
npm test
npm run build
```

Supabase stores the public catalog and its media files. Search runs in the browser.

## Product management

Staff use `/manage` to create products, edit prices, upload images, and remove products.
Manufacturers can edit only their assigned products. Only staff can create or delete products.
The database derives search text and price ranges from each saved record.
The editor keeps blank prices and per-inch rates.
Edited price rows retain their original document link and show an edit label.
New rows show that the dashboard supplies their prices.

Each upload uses a new filename. Save the product to publish an uploaded image.
Removing a picture from a product keeps the original file in storage.
Deleting a product removes it from saved collections. The confirmation requires its model name.
The database rejects edits if another editor changes the product first.

Product cards load their destination when selected. They do not prefetch all visible product pages.
During rapid test navigation, Next.js can log “The destination stream closed early.” when the browser cancels a response.
The catalog and account tests pass without browser page errors.
