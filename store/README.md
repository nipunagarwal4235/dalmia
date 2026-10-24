# Store release

Both apps use the bundle ID `com.dalmiahardware.catalog`. They are version 2.0.0, build 3.

## Before either release

1. Restore the Supabase project. The host `qjaryhukmpodadrcfopb.supabase.co` does not resolve, so images, sign-in, and sync fail. Reviewers reject apps that cannot sign in.
2. Apply `supabase/migrations/20261025120000_delete_own_account.sql`. Both stores require in-app account deletion, and the Delete account buttons call this function.
3. Deploy the web app. The listings need https://dalmia-blush.vercel.app/privacy, and the website's account page has the web deletion option that Google Play asks for.
4. Create a reviewer account (customer role) and put its email and password in both review forms.
5. Take screenshots after images load again. Use the iPhone 18 Pro Max simulator (6.9-inch), the iPad Pro 13-inch simulator (the app runs on iPad), and an Android phone.

## Google Play

The upload key is `android-app/dalmia-upload.jks`, and its passwords are in `android-app/keystore.properties`. Git ignores both files. Back them up somewhere safe outside this folder. If the key is lost, Play support can reset the upload key, which takes several days.

Build the bundle from `android-app/`:

```sh
./gradlew :app:bundleRelease
```

Upload `app/build/outputs/bundle/release/app-release.aab` in Play Console. Enroll in Play App Signing when asked. Start with Internal testing.

For each later release, raise `versionCode` in `android-app/app/build.gradle.kts`.

Play Console answers:

- **App category:** Business. **Contains ads:** No.
- **Privacy policy:** https://dalmia-blush.vercel.app/privacy
- **Data safety:** The app collects email address, name, user IDs, and other user-generated content (company name and saved products). This data is linked to the account. It is used only for app functionality and account management, it is not shared, and it is encrypted in transit. Users can request deletion.
- **Account deletion URL:** https://dalmia-blush.vercel.app/account
- **Target audience:** 18 and over. **Content rating:** complete the questionnaire; the app has no user-to-user content.
- **Graphics:** the icon is `store/play-icon-512.png`. Play also needs a 1024×500 feature graphic and at least two phone screenshots.
- **New personal developer accounts** must run a closed test with at least 12 testers for 14 days before production. Organization accounts skip this step.

## App Store

You need an Apple Developer Program membership and a Mac signed in to that account in Xcode.

1. Add `DEVELOPMENT_TEAM = <your team ID>` to `ios-app/Secrets.xcconfig`.
2. In App Store Connect, create the app with bundle ID `com.dalmiahardware.catalog`.
3. Archive and upload from `ios-app/`:

```sh
xcodebuild -project Dalmia.xcodeproj -scheme Dalmia -configuration Release -destination 'generic/platform=iOS' -archivePath build/Dalmia.xcarchive -allowProvisioningUpdates archive
xcodebuild -exportArchive -archivePath build/Dalmia.xcarchive -exportOptionsPlist ExportOptions.plist -allowProvisioningUpdates
```

You can also open the project in Xcode and choose Product, then Archive, then Distribute App. Upload sets the next build number automatically.

App Store Connect answers:

- **Category:** Business. **Price:** Free.
- **Privacy policy URL:** https://dalmia-blush.vercel.app/privacy
- **App Privacy:** collects email address, name, user ID, and other user content. All of it is linked to the user, used for app functionality, and not used for tracking. This matches `ios-app/Dalmia/PrivacyInfo.xcprivacy`.
- **Export compliance:** the app uses only standard HTTPS. `ITSAppUsesNonExemptEncryption` is already set to NO.
- **Age rating:** 4+.
- **Sign-in information:** the reviewer account from step 4 above.

## Listing text

**Name:** Dalmia Hardware

**Subtitle (App Store) / short description (Play):** Browse the Dalmia hardware catalogue

**Description:**

Browse the full Dalmia Hardware catalogue of door handles, knobs, sofa legs, profile handles, concealed handles, and brackets.

- Swipe through products one at a time. Swipe right to save a product, or swipe left to see the next one.
- Search by model number, finish, or keyword, and filter by category.
- See every finish and size with its listed price, plus 65% and 75% discounted prices with 18% or 9% added.
- Open the original catalogue page for any product.
- Sign in to keep your saved products on the website and on all your devices.

**Keywords (App Store):** door handles,knobs,sofa legs,profile handles,hardware,catalogue,Rajkot,cabinet,brackets

**Support URL:** https://dalmia-blush.vercel.app/privacy (public, with contact details; the rest of the site needs sign-in)
