import {AuthShell} from '../../components/auth-shell';

export const metadata = {title: 'Privacy policy · Dalmia Hardware'};

// Linked from the App Store and Google Play listings, so it stays public.
export default function PrivacyPage() {
  return <AuthShell><section className="auth-panel">
    <span className="card-category">DALMIA HARDWARE</span><h1>Privacy policy</h1><p>Last updated 25 October 2026</p>
    <h2>What we collect</h2>
    <p>You can browse the catalog without an account. If you create one, we store your email address, password (hashed), name, company, account roles, and the products you save. The apps also keep your saved products and a copy of the catalog on your device.</p>
    <h2>How we use it</h2>
    <p>We use this information only to sign you in, show your saved products on every device, and give staff and manufacturers the access their roles allow. We do not sell your information, show ads, or track you across other apps and websites.</p>
    <h2>Who processes it</h2>
    <p>Supabase hosts the database, sign-in, and catalog files. Vercel hosts this website. Both process data only to run these services.</p>
    <h2>Deleting your account</h2>
    <p>Choose Delete account on the Account screen in the iPhone or Android app, or on your account page on this website. This permanently removes your account, profile, roles, and saved products. Uninstalling the app removes the data stored on your device.</p>
    <h2>Contact</h2>
    <p>Dalmia Hardware, Rajkot, Gujarat, India. Email <a href="mailto:dalamiahardware@gmail.com">dalamiahardware@gmail.com</a> or call +91 8121525466.</p>
  </section></AuthShell>;
}
