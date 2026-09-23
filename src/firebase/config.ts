/**
 * Firebase web config for the ATLAS Cloud project.
 *
 * The live product in this runtime uses Better Auth + Postgres (see README).
 * These public client keys are kept here so a later Cloud migration can
 * reuse the same project without embedding a service account.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyDVJaZL_cy6QJsyIrULqg1lIpSIVh4zidA",
  authDomain: "atlas-16069.firebaseapp.com",
  projectId: "atlas-16069",
  storageBucket: "atlas-16069.firebasestorage.app",
  messagingSenderId: "945244537643",
  appId: "1:945244537643:web:c7b46dd64a618b47b5bb6e",
  measurementId: "G-BK470050PH",
} as const;
