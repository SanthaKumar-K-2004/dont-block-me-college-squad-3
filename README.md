# DON'T BLOCK ME! College Squad 3.0

React + Vite + Tailwind CSS v4 + Firebase frontend scaffold assembled from the supplied source.

## Run locally
1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev`.
4. Run `npm run build` for a production build.

## Firebase and sync
The app accepts either the host-injected `__firebase_config` or Vite environment variables:
- `VITE_FIREBASE_CONFIG`: the Firebase web app config as a single-line JSON object.
- `VITE_FIREBASE_APP_ID`: optional app namespace.

Set these in Vercel Project → Settings → Environment Variables, then redeploy. Do not use service-account private keys in frontend variables. Configure and test Firestore rules before production use. Without Firebase configuration, quizzes persist only in the same browser's local storage and sync between tabs on that browser; that is not cross-device sync.

## Images and sound
Remote images remain optional visual enhancements. Card images use a themed emoji/gradient fallback; other image slots hide broken image elements instead of showing a broken-image icon. Audio feedback uses a softer, capped Web Audio envelope to reduce harsh or overly loud tones.

## Share links
Share links use the current deployed origin and query parameters (`/?id=...`). The quiz ID is restored from the URL. A quiz created on one device still needs Firebase configured for other devices to retrieve it.

## Verification limitation
A real production Firebase integration and authenticated multi-user flow cannot be verified without the project's Firebase config and Firestore rules.
