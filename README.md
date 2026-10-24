# dalmia

The `web-app/` folder contains the Next.js dashboard, source PDFs, catalog data, and images.

The `ios-app/` folder contains the native iPhone app (SwiftUI). The `android-app/` folder contains the native Android app (Jetpack Compose).

The `supabase/` folder contains the shared catalog database and its tests.

All apps read the same Supabase catalog when their environment variables are set.
See [supabase/README.md](supabase/README.md) for setup and deployment.

## Start the web application

Run these commands from this folder:

```sh
cd web-app
npm run dev
```

Open http://127.0.0.1:4173 in your browser.

See [web-app/README.md](web-app/README.md) for production commands and tests.

## Native apps

Run `node scripts/sync-native-apps.mjs` after the web catalog or brand artwork changes. It copies both into the native apps.

iPhone: copy `ios-app/Secrets.example.xcconfig` to `ios-app/Secrets.xcconfig` and fill in the Supabase host and publishable key. Open `ios-app/Dalmia.xcodeproj` in Xcode, choose your team under Signing, and run. To check the catalog logic, run this from `ios-app/`:

```sh
mkdir -p build && swiftc -enable-bare-slash-regex Dalmia/Catalog.swift Checks/main.swift -o build/checks && build/checks
```

Android: add `supabase.url=` and `supabase.publishableKey=` to `android-app/local.properties`. Then run these from `android-app/`:

```sh
./gradlew :app:testDebugUnitTest
./gradlew :app:installDebug
```

Signed release builds read `android-app/keystore.properties`, which holds `storeFile`, `storePassword`, `keyAlias` and `keyPassword`.

See [store/README.md](store/README.md) for App Store and Google Play release steps.
