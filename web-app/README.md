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

Next.js builds a separate page for every model. React handles search, filters, and saved products. Next.js serves and optimizes the product images.

The application keeps its data in JSON files. It does not need a database or the previous custom Node.js server.

## Pages and features

| Address | Purpose |
| --- | --- |
| `/` | Search and filter products |
| `/models/door-handles-2601` | View one model, its image, prices, and source links |
| `/documents` | Search source pages and open the original PDFs |
| `/shortlist` | View saved products |

Search accepts `DH1501`, `DH-1501`, and `DH 1501`. Sofa model `1501` and concealed handle `DH-1501` remain separate products.

All matching products appear on one page, including saved products. Document searches also show every matching page.

Filters cover category, size, finish, and data availability. CSV export includes the current results and their source price rows.

The browser stores the shortlist on this computer. Saved products from the previous dashboard remain available at the same local address.

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

The build copies these PDFs into `public/documents/` for Next.js to serve. The generated copies are excluded from Git.

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

The site uses local files. It does not send document contents or search text to an external service.
