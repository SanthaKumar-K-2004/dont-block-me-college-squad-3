# Firebase setup for College Squad 3.0

This project uses Firebase Authentication and Cloud Firestore for links that work across devices. A Vercel deployment by itself does not create a Firebase project or deploy Firestore rules.

## 1. Create or locate a Firebase project
1. Open https://console.firebase.google.com/ and create a project, or select the existing project used by this app.
2. In Project settings → General → Your apps, register a Web App.
3. Copy its Web App config values into a single JSON object. The frontend config is not a service-account key.

Example shape (replace every placeholder):
```json
{"apiKey":"YOUR_WEB_API_KEY","authDomain":"YOUR_PROJECT.firebaseapp.com","projectId":"YOUR_PROJECT_ID","appId":"YOUR_WEB_APP_ID"}
```

## 2. Enable authentication and Firestore
1. Authentication → Sign-in method → enable **Anonymous**.
2. Create a Cloud Firestore database.
3. From a trusted development environment, install Firebase CLI, run `firebase login`, then `firebase use --add` and select this project.
4. Review the repository's `firestore.rules` and deploy them with `firebase deploy --only firestore:rules`.

Do not deploy open test rules and do not put service-account private keys in the browser or Vite environment variables.

## 3. Configure Vercel
In the Vercel project → Settings → Environment Variables, add:

- `VITE_FIREBASE_CONFIG`: the full JSON object above, as a single-line JSON string.
- `VITE_FIREBASE_APP_ID`: optional namespace used for the app's Firestore path. If omitted, the app uses its built-in default namespace; keep this value consistent across all deployments.

Apply to Production (and Preview if desired), save, and redeploy. Environment changes do not modify an already-built deployment.

## 4. Verify the live flow
1. Open the production URL and check that cloud status becomes live.
2. Create a quiz and choose the correct answer for each question.
3. Copy the link to a second browser/device that is not using the creator's local storage.
4. Submit a real attempt from the second device and verify it appears in the creator's scoreboard.
5. Test a rejected write and verify the UI explains the error without losing the local draft.

## Security limits to understand
- The public quiz document includes answer IDs because the current app grades answers in the browser. A determined player can inspect those answers.
- Firestore rules validate document shape and bounds, but cannot independently prove a score is correct while the client is trusted to calculate it. Strong anti-cheat requires moving answer keys and score validation to a trusted backend (for example, callable Cloud Functions) and keeping answer keys out of public quiz documents.
- Creator PINs are a convenience gate in the browser, not a secure authentication boundary.
- Anonymous sign-in identifies a browser session but is not proof of a real-world identity.
