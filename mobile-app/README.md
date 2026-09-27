# Dalmia Hardware mobile

This Expo app shows the 149 Dalmia products as a vertical feed. It uses the brochure logo, charcoal surfaces, silver image panels, and gold accents.

The app includes 148 catalogue pictures, product specifications, listed prices, and six discount calculations. These files work offline.

With Supabase configured, the app downloads the shared catalog and stores it for offline use.
See [the database guide](../supabase/README.md) to connect both apps to the same project.

## Browse and save

Swipe up or down to browse one product at a time.

Swipe right to save the product and advance.

Swipe left to advance. A left swipe does not remove a saved product.

Tap the heart to like or unlike a product. Open the Saved tab to browse your likes.

The app stores likes on the device. It does not sync them with the website or another device.

Search by model number, finish, or keyword. Use category filters to narrow the feed.

Tap the information button to view finishes, sizes, prices, and original document links. PDF links need an internet connection.

The Next and Save buttons also work without gestures. After the final product, these buttons return to the first product.

## Start the app

Use Node.js 24 and Expo SDK 57.

From the repository root, run:

```sh
cd mobile-app
npm ci
npm start
```

Open the project in a compatible Expo Go app or an Android development build.

For a browser preview, run:

```sh
npm run web
```

## Build an Android APK locally

An APK is an Android installation file. Install Java 21 and the Android SDK before building.

Set `JAVA_HOME` to the JDK folder. Set `ANDROID_HOME` to the Android SDK folder.

Install Android SDK Platform 36, Build Tools 36.0.0, NDK 27.1.12297006, and CMake 3.22.1.

From `mobile-app`, run:

```sh
npm run build:apk:local
```

The command creates `builds/dalmia-hardware.apk`. This release APK includes the JavaScript bundle and works without a development server.

The default build supports Android ARM64 and ARMv7 devices. Set `DALMIA_ANDROID_ARCHITECTURES` to change the target architectures.

The build creates a private signing key and password file in `.credentials/`. Keep a secure backup of that folder for future APK updates.

Git excludes `.credentials/`, native build folders, and APK files.

## Build with Expo EAS

EAS is Expo's cloud build service. Sign in to Expo before using it.

From `mobile-app`, run:

```sh
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile preview
```

The preview profile produces an APK. The production profile produces an Android App Bundle for a later store release.

Local and cloud builds must use the same signing key to update an installed app. Import the local key through EAS credentials management before switching build services.

## Update the catalogue

Supabase supplies the live catalog when the app connects to a database.
The web app supplies the bundled offline snapshot, images, pricing calculations, and branding.

From `mobile-app`, run:

```sh
npm run sync:catalog
npm test
```

The script copies the catalogue and primary image for each model from `../web-app`. It generates static image imports for offline bundling.

Model 1202 has no picture in the supplied catalogue. The app marks its picture as unavailable.

Missing prices remain blank. Per-inch rates keep their original meaning. The supplied documents do not state a currency.

## Tests

From `mobile-app`, run:

```sh
npm run typecheck
npm test
npx expo-doctor
npm run export:web
npm run test:browser
npm run export:android
```

Browser tests need Python 3 and Google Chrome. They test touch swipes, vertical scrolling, saved products after reload, search, prices, and two phone screen sizes.

Browser tests exercise the Expo web preview. They do not replace testing the APK on an Android device.
