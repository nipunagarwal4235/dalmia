# Shared catalog database

One Supabase project supplies the catalog to the web app and the iOS and Android apps.
It stores 149 products, five source documents, and 86 catalog pages.
Product records include variants, prices, units, image paths, and source references.
The database preserves missing prices and the unspecified currency.

The hosted project is [dalmia-shared](https://supabase.com/dashboard/project/qjaryhukmpodadrcfopb) in the Mumbai region, `ap-south-1`.
It belongs to `nipunagarwal4235's Org`.
Both app environment files point to `https://qjaryhukmpodadrcfopb.supabase.co`.
Vercel also stores this connection for production, preview, and development.
The [live website](https://dalmia-blush.vercel.app) uses the shared database.
The iOS app reads the connection from `ios-app/Secrets.xcconfig`, and the Android app from `android-app/local.properties`.
The ignored `.env.supabase.local` file contains the database password with owner-only file access.

## Data and access

The `catalog_products` table stores each product in a `data` JSON field.
JSON stores the nested source record without changing its structure.
The generated `model` and `category` columns support database filters.
The `catalog_documents` and `catalog_pages` tables store source records.
The `catalog_settings` table stores terms, currency, and the price note.

The `get_catalog` database function returns one consistent catalog snapshot.
The web app requests the full catalog on each server request.
The iOS and Android apps omit machine-read page text and refresh the catalog once per minute while open.
They store the downloaded catalog on the device for offline use.
Before the first download, it uses the bundled catalog.

Row-level security controls which records each database role can access.
Public visitors can read the catalog but cannot change it.
Signed-in users receive the write permissions assigned to their roles.
See [accounts and access](AUTH.md) for the seven roles, first-admin setup, and email delivery configuration.
Never put a database password or service-role key in an app environment variable.

Supabase Storage serves 368 catalog images and five PDFs from the public `catalog-media` bucket.
The database stores relative file paths and metadata.
Both apps resolve these paths to the same bucket through their Supabase project URL.
The iOS and Android apps cache pictures downloaded from Supabase. All apps require Supabase Storage for catalog images and have no local image fallback.
Original image files remain in the web source folder for source comparisons and Storage uploads. Vercel deployments exclude these local images.
The `saved_products` table stores each signed-in account's collection.
Database policies prevent other accounts, including staff, from reading or changing that collection.
Both apps keep separate account caches and retry offline changes.

## Catalog media

The Storage migration creates a public bucket with a 20 MiB limit for each file.
It accepts JPEG images, PNG images, and PDFs.
Public visitors can read files but cannot upload, replace, or delete them.
Authorized editors can upload new product images into folders for products that they can edit.
Client accounts cannot replace or delete stored files.
Use the authenticated Supabase CLI or project dashboard to manage files.

From the repository root, stage the source files and upload them to the linked project:

```sh
node scripts/catalog-media.mjs stage /private/tmp/dalmia-catalog-media
npx --yes supabase@2.118.0 storage cp --recursive /private/tmp/dalmia-catalog-media/assets ss:///catalog-media/assets --linked --jobs 6 --cache-control max-age=86400 --experimental
npx --yes supabase@2.118.0 storage cp --recursive /private/tmp/dalmia-catalog-media/documents ss:///catalog-media/documents --linked --jobs 2 --cache-control max-age=86400 --experimental
node scripts/catalog-media.mjs verify
```

The final command downloads every public file and compares its bytes and content type with the local original.
It writes the file sizes and SHA-256 hashes to `media-manifest.json` after all comparisons pass.
A hash identifies file contents.
After a web production build, run this command from `web-app`:

```sh
DALMIA_TEST_LIVE_MEDIA=1 npm run test:browser -- media.spec.ts
```

These tests cover Storage images and PDF downloads on the website.

## Create the hosted database

The project above already exists.
For this repository, reuse it with `npx --yes supabase@2.118.0 link --project-ref qjaryhukmpodadrcfopb`.
Use the creation steps below only for a separate environment.

From the repository root, sign in to Supabase:

```sh
npx --yes supabase@2.118.0 login
npx --yes supabase@2.118.0 orgs list
npx --yes supabase@2.118.0 projects list
```

Select the organization that owns Dalmia Hardware.
Create one project named `dalmia-shared` in the Mumbai region, `ap-south-1`.
Use the CLI prompt to enter the database password.

```sh
npx --yes supabase@2.118.0 projects create dalmia-shared --org-id YOUR_ORGANIZATION_ID --region ap-south-1
```

Use the project reference from the creation result:

```sh
npx --yes supabase@2.118.0 link --project-ref YOUR_PROJECT_REF
npx --yes supabase@2.118.0 db push --include-seed
```

The migration creates the tables and access policies.
The seed inserts the initial catalog records.
Repeated seed runs preserve existing database edits.
Do not run `db reset --linked` against the hosted project because it deletes database data.

## Connect the apps

Use the same Supabase project URL and publishable key in every app.
Get the publishable key from the project dashboard.
The publishable key permits only the access granted by the database policies.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the web app.
Copy `web-app/.env.example` to `web-app/.env.local` for local development, and set the same variables in Vercel before the next deployment.
Set `SUPABASE_HOST` and `SUPABASE_PUBLISHABLE_KEY` in `ios-app/Secrets.xcconfig`.
Set `supabase.url` and `supabase.publishableKey` in `android-app/local.properties`.

Both apps require their Supabase project URL to load catalog media. A missing URL produces an error instead of local image links.
If a configured database request fails, the website shows its error page.
The iOS and Android apps keep their last usable catalog when a request fails.

## Catalog changes

After deployment, edit catalog records in Supabase so that both apps receive the change.
Keep existing product IDs because saved products refer to them.
Set a unique `position` value for each new record.
Keep the generated `model` and `category` columns unchanged because PostgreSQL derives them from `data`.
Upload new images to `catalog-media/assets/products/` before you reference their relative paths in the database.
Use a new filename when replacing an image so that cached copies do not hide the change.

The original JSON files remain the offline snapshot and initial import source.
To regenerate the initial seed from those files, run this command from the repository root:

```sh
node scripts/generate-catalog-seed.mjs
```

This command prepares initial data for a new database.
It does not export live database changes into the offline snapshot.

## Tests

From the repository root, run the database tests:

```sh
npm --prefix supabase ci
npm --prefix supabase test
```

The tests use PGlite, an embedded PostgreSQL engine.
They test complete catalog import, access permissions, repeated seed runs, and catalogs with more than 1,000 products.
They do not require Docker or a hosted database.
The live API test passed after deployment on September 27, 2026.
It found matching full and compact responses and denied public writes on all four tables.
To repeat the live test, run this command from the repository root:

```sh
node scripts/verify-shared-catalog.mjs
```

Add `--initial-import` to compare the database with the original JSON files before you edit live catalog data.

Supabase documents the [CLI deployment workflow](https://supabase.com/docs/guides/local-development/cli-workflows) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
