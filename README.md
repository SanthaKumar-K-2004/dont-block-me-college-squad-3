# DON'T BLOCK ME! College Squad 3.0

React + Vite + Tailwind CSS v4 + Firebase frontend scaffold assembled from the supplied source.

## Run locally
1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev`.
4. Run `npm run build` for a production build.

## Important Firebase note
The supplied source expects the host to define `__firebase_config` (and optionally `__app_id`). This scaffold intentionally does not invent Firebase credentials. For a production deployment, wire Firebase client config through your chosen host and validate Firestore rules separately. Firebase web config is not a service-account secret, but Firestore security rules must enforce authorization on the server.

## Image behavior
Remote image URLs remain optional visual enhancements. If a URL fails, the cards display a themed emoji/gradient fallback. Images reset loading state when their URL changes, lazy-load, and use async decoding.

## Verification limitation
A real production Firebase integration and authenticated multi-user flow cannot be verified without the project's Firebase config and Firestore rules.
