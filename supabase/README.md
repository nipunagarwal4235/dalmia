# Shared catalog database

One Supabase project supplies the catalog to the web app and the mobile app.
It stores 149 products, five source documents, and 86 catalog pages.
Product records include variants, prices, units, image paths, and source references.
The database preserves missing prices and the unspecified currency.

The hosted project is [dalmia-shared](https://supabase.com/dashboard/project/qjaryhukmpodadrcfopb) in the Mumbai region, `ap-south-1`.
It belongs to `nipunagarwal4235's Org`.
Both app environment files point to `https://qjaryhukmpodadrcfopb.supabase.co`.
Vercel also stores this connection for production, preview, and development.
The [live website](https://dalmia-blush.vercel.app) uses the shared database.
Both EAS build profiles inherit the public connection from the `base` profile in `mobile-app/eas.json`.
The ignored `.env.supabase.local` file contains the database password with owner-only file access.

## Data and access

The `catalog_products` table stores each product in a `data` JSON field.
JSON stores the nested source record without changing its structure.
The generated `model` and `category` columns support database filters.
The `catalog_documents` and `catalog_pages` tables store source records.
The `catalog_settings` table stores terms, currency, and the price note.

The `get_catalog` database function returns one consistent catalog snapshot.
The web app requests the full catalog on each server request.
The mobile app omits machine-read page text and refreshes the catalog once per minute while active.
The mobile app stores the downloaded catalog on the device for offline use.
Before the first download, it uses the bundled catalog.

Row-level security controls which records each database role can access.
Public and signed-in app users can read the catalog but cannot change it.
Use the Supabase dashboard or a trusted server to edit records.
Never put a database password or service-role key in an app environment variable.

Images and PDFs remain in the existing web assets.
The database stores their paths and metadata.
The mobile app uses bundled pictures for existing models and web URLs for new image paths.
Likes remain on each device because neither app includes a shared sign-in flow.

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

Copy each app's `.env.example` file to `.env.local` in the same folder.
Use the same Supabase project URL and publishable key in both files.
Get the publishable key from the project dashboard.
The publishable key permits only the access granted by the database policies.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the web app.
Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the mobile app.
Set the web variables in Vercel before the next deployment.
For this project, both EAS profiles already include the mobile variables.
Restart the apps after you change their environment files.
If an Expo export retains old variables, run `npm run export:web -- --clear` from `mobile-app`.

Without these variables, both apps use their bundled catalog files.
If a configured database request fails, the website shows its error page.
The mobile app retains its last usable catalog when a request fails.

## Catalog changes

After deployment, edit catalog records in Supabase so that both apps receive the change.
Keep existing product IDs because saved products refer to them.
Set a unique `position` value for each new record.
Keep the generated `model` and `category` columns unchanged because PostgreSQL derives them from `data`.
Upload new image files to the web assets before you reference their paths in the database.

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
It found matching app responses and denied public writes on all four tables.
To repeat the live test, run this command from the repository root:

```sh
node scripts/verify-shared-catalog.mjs
```

Add `--initial-import` to compare the database with the original JSON files before you edit live catalog data.

To test mobile downloads and offline recovery, run these commands from `mobile-app`:

```sh
EXPO_PUBLIC_SUPABASE_URL=https://catalog-test.supabase.co EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test npm run export:web -- --clear
EXPO_PUBLIC_SUPABASE_URL=https://catalog-test.supabase.co npm run test:browser -- catalog-sync.spec.ts
npm run export:web -- --clear
```

The browser test intercepts requests to the test URL and supplies test data.
The final command restores an export with the normal environment.

To test the hosted catalog from the mobile app, run this command from `mobile-app` after the normal export:

```sh
DALMIA_TEST_LIVE_DATABASE=1 npm run test:browser -- catalog-live.spec.ts
```

This test passed on both phone screen sizes after deployment.
It confirms that the app downloads the hosted catalog and stores it on the device.

Supabase documents the [CLI deployment workflow](https://supabase.com/docs/guides/local-development/cli-workflows) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
