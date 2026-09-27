# dalmia

The `web-app/` folder contains the Next.js dashboard, source PDFs, catalog data, and images.

The `mobile-app/` folder contains the Expo app for Android and iPhone.

The `supabase/` folder contains the shared catalog database and its tests.

Both apps read the same Supabase catalog when their environment variables are set.
See [supabase/README.md](supabase/README.md) for setup and deployment.

## Start the web application

Run these commands from this folder:

```sh
cd web-app
npm run dev
```

Open http://127.0.0.1:4173 in your browser.

See [web-app/README.md](web-app/README.md) for production commands and tests.
