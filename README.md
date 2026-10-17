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

Set these in Vercel Project → Settings → Environment Variables, then redeploy. Do not use service-account private keys in frontend variables. Enable Anonymous Authentication in Firebase Console, then deploy the repository's rules with `firebase deploy --only firestore:rules` after selecting your Firebase project in the Firebase CLI. The rules are not deployed by Vercel. Without Firebase configuration and deployed rules, quizzes persist only in the same browser's local storage and sync between tabs on that browser; that is not cross-device sync.

## Quiz integrity, recovery, images and sound
- The leaderboard starts empty and only contains real quiz attempts; the demo simulator and seeded sample scores have been removed. Legacy seeded demo data is ignored.
- Unfinished creator drafts and an in-progress quiz are saved to this browser's local storage and restored after refresh. Published quizzes and real attempts are also saved locally.
- Remote images are optional. Failed images fall back to themed emoji/gradient cards; actor/cartoon option cards use a visual fallback instead of unrelated stock photos.
- Short Web Audio effects use softer, capped envelopes and melodic success sounds. Browsers require a user gesture before audio can play.

## Cloud scoreboard and security notes\n- Quiz metadata is created once and then treated as immutable by the supplied Firestore rules. Creator PINs are not written into the public cloud document. Keep the PIN private; it is a convenience gate in the browser, not strong identity verification.\n- Each scoreboard attempt is stored as its own document under `quizzes/{quizId}/attempts/{attemptId}` with a stable ID. Concurrent players no longer overwrite the entire attempts array, duplicate retries are idempotent, and the parent quiz document stays small. Up to 500 recent attempts are subscribed for display.\n- The current app still evaluates answers in the browser, and the published quiz payload contains correct-answer IDs. A determined visitor can inspect them or forge a score. Firestore rules validate shape and bounds, but **do not make client-computed scores trustworthy**. Do not use this scoreboard for prizes or sensitive decisions. A trusted Cloud Function/Cloud Run scoring endpoint that keeps answer keys server-side is required before claiming anti-cheat security.\n- Firestore rules require signed-in anonymous users and block quiz updates/deletes. Existing Firebase projects must deploy the rules and enable Anonymous Authentication; otherwise cloud writes will fail and local saving remains available.\n\n## Share links
Share links use the current deployed origin and query parameters (`/?id=...`). The quiz ID is restored from the URL. A quiz created on one device still needs Firebase configured for other devices to retrieve it.

## Verification limitation
A real production Firebase integration and authenticated multi-user flow cannot be verified without the project's Firebase config and Firestore rules.


## Live question and answer photography
Question banners and answer cards now attempt a relevant, openly licensed image search through the Wikimedia Commons API. The photo source link and available author/license metadata are shown on the card. If online search is unavailable or a result fails to load, the existing Unsplash image or themed card fallback remains in place. The app does not require an image API key.