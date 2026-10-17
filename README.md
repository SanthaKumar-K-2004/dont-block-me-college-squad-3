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

## Quiz integrity, recovery, images and sound
- The leaderboard starts empty and only contains real quiz attempts; the demo simulator and seeded sample scores have been removed. Legacy seeded demo data is ignored.
- Unfinished creator drafts and an in-progress quiz are saved to this browser's local storage and restored after refresh. Published quizzes and real attempts are also saved locally.
- Remote images are optional. Failed images fall back to themed emoji/gradient cards; actor/cartoon option cards use a visual fallback instead of unrelated stock photos.
- Short Web Audio effects use softer, capped envelopes and melodic success sounds. Browsers require a user gesture before audio can play.

## Share links
Share links use the current deployed origin and query parameters (`/?id=...`). The quiz ID is restored from the URL. A quiz created on one device still needs Firebase configured for other devices to retrieve it.

## Verification limitation
A real production Firebase integration and authenticated multi-user flow cannot be verified without the project's Firebase config and Firestore rules.
