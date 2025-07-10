
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from '@firebase/firestore';
import { getStorage } from 'firebase/storage';

// ##################################################################
// #  IMPORTANT: REPLACE WITH YOUR ACTUAL FIREBASE CONFIGURATION    #
// ##################################################################
// For a production app, use environment variables to store this information.
const firebaseConfig = {
  apiKey: "AIzaSyAQf8SV7qf8FQkh7ayvRlBPR1-fRJ6d3Ks", // Corrected API Key
  authDomain: "schoolmaps-6a5f3.firebaseapp.com",
  projectId: "schoolmaps-6a5f3",
  storageBucket: "schoolmaps-6a5f3.firebasestorage.app",
  messagingSenderId: "336929063264",
  appId: "1:336929063264:web:b633f4f66fd1b204899e05",
  measurementId: "G-8KKCCFBFSL"
};

// Application ID (used for Firestore collection paths as per user guidelines)
// Ensure this matches the appId in your firebaseConfig.
export const appId = firebaseConfig.appId;

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Firestore with explicit offline persistence enabled
const db = getFirestore(app);

// Enable offline persistence. 
// `forceOwnership: true` allows persistence to work correctly in multiple tabs,
// with the last opened tab taking control.
enableIndexedDbPersistence(db, { forceOwnership: true })
  .then(() => {
    console.log("Firestore offline persistence successfully enabled.");
  })
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn('Firestore persistence failed: could not gain exclusive access. This can happen with multiple tabs open. Some offline features may not work as expected.');
      } else if (err.code == 'unimplemented') {
          console.warn('Firestore persistence is not supported in this browser. The app will function online only.');
      } else {
          console.error("An error occurred while enabling Firestore persistence:", err);
      }
  });

export { db };
