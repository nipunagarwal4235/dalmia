# Accounts and access

Supabase Auth supplies one account for the web app and mobile app.
The apps support email sign-in, registration, password recovery, profile changes, and sign-out.
Passwords require at least 12 characters.
New users must confirm their email address.

Catalog browsing and catalog media remain public.
Account pages require sign-in.
Management pages require the matching database permission.
The mobile Account tab links authorized staff to web management pages.
Existing mobile installations need a new build with secure storage support.

## Roles

Each account can have more than one role.
The account receives the combined permissions of its roles.

- Super admin manages staff, business accounts, role permissions, and the catalog.
- Admin manages business accounts, manufacturer assignments, and the catalog.
- Manufacturer edits assigned products.
- Retailer browses the catalog and edits its own profile.
- Wholesaler browses the catalog and edits its own profile.
- Dealer browses the catalog and edits its own profile.
- Customer browses the catalog and edits its own profile.

Retailer, wholesaler, dealer, and customer start with the same permissions.
Super admins can change their profile permissions separately.
Staff permissions remain limited to staff roles.
Public browsing does not depend on the `catalog.read` permission.
These roles do not add orders, private prices, or inventory features.

## Database rules

The `profiles` table stores each account's name, company, and active status.
The `user_roles` table assigns roles to accounts.
The `permissions` table defines allowed actions.
The `role_permissions` table assigns those actions to roles.
The `product_manufacturers` table assigns products to manufacturers.
The `access_audit` table records role, permission, status, and assignment changes.

Row-level security limits which database records a user can access.
The database reads roles from trusted tables on each request.
It ignores role values in signup metadata.
New accounts always receive the customer role.
Disabled accounts receive no write permissions.

Only super admins can assign staff roles or change staff accounts.
Users cannot change their own access.
The database keeps at least one active super admin.
Database functions serialize access changes to prevent conflicting updates.

Web sessions use cookies that the server validates with Supabase.
Native mobile sessions use Expo SecureStore, which encrypts device credentials.
The app splits long sessions into small secure entries.
Sign-out removes those entries.
The Expo web preview uses browser storage through the Supabase client.

## First super admin

Use the account owner's confirmed email address.
Do not select an owner from Git history or assign access to an unconfirmed email.
No permanent super admin exists until an owner completes this step.

1. Register the owner's account at `/login`.
2. Confirm the email through the link that Supabase sends.
3. Sign in to the Supabase CLI with project administrator access.
4. From the repository root, run the command below with the confirmed address.

```sh
node scripts/bootstrap-super-admin.mjs owner@example.com
```

The command promotes only the first super admin.
It fails if a super admin already exists.
It reads the administrator key into memory and does not save it in an app or file.
Later staff changes use `/admin`.

## Email delivery

Configure a custom email service before opening registration to customers.
SMTP is the protocol that Supabase uses to send email.
Enter the provider credentials privately in the Supabase Auth configuration.

Without custom SMTP, Supabase sends only to project team addresses and limits delivery to two messages per hour.
See the [Supabase SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).
The current implementation does not configure a custom email provider.
Tests create temporary confirmed accounts without sending email.

## Deploy auth configuration

The `auth-config.toml` file declares hosted auth changes only.
It sets the production URL, allowed callback URLs, confirmation rules, and password length.
The CLI leaves undeclared hosted properties unchanged.

Copy this file to `supabase/config.toml` in a separate temporary directory.
From the repository root, preview and apply that directory's configuration:

```sh
npx --yes supabase@2.118.0 config diff --workdir /private/tmp/dalmia-auth-config --project-ref qjaryhukmpodadrcfopb
npx --yes supabase@2.118.0 config push --workdir /private/tmp/dalmia-auth-config --project-ref qjaryhukmpodadrcfopb
```

## Test access

From the repository root, run the database permission tests:

```sh
npm --prefix supabase test
```

The tests cover all roles, forged signup roles, forbidden promotions, account status, product assignments, and first-admin setup.
Mobile unit tests cover secure session storage and failed refresh writes.

For hosted browser tests, create temporary accounts with the signed-in Supabase CLI:

```sh
node scripts/test-auth-accounts.mjs create
```

Build the web app before running its browser tests.
Export the mobile web app before running its browser tests.
From each app folder, run:

```sh
DALMIA_TEST_LIVE_AUTH=1 npm run test:browser -- auth.spec.ts --workers=1
```

After testing, remove the temporary accounts from the repository root:

```sh
node scripts/test-auth-accounts.mjs delete
```

The temporary credentials stay in `/private/tmp/dalmia-auth-fixtures.json` with owner-only access.
The cleanup command removes that file and the test accounts.

## Release tests

Run the web and mobile auth suites one after the other.
They share temporary accounts. A sign-out in one suite invalidates sessions in the other suite.
The web recovery test generates a recovery token through the Supabase CLI and restores the temporary password afterward.
The test does not send email or test delivery to an inbox.

After building the website and exporting the mobile web preview, run this command from `web-app`:

```sh
DALMIA_TEST_LIVE_AUTH=1 DALMIA_TEST_LIVE_SYNC=1 npm run test:browser -- --config playwright.integration.config.ts
```

The tests create one temporary product, upload an image, edit its price, and delete it.
They also test saved-product sync and offline removals between both apps.
From the repository root, remove test artifacts after the suites finish:

```sh
node scripts/cleanup-release-tests.mjs
node scripts/test-auth-accounts.mjs delete
```

Hosted inspection on October 2, 2026 found no custom email service and only temporary test accounts.
The first permanent owner must register and prove access to the selected email before the bootstrap command runs.
