import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBierAnZpk5ZVhks8-KyCvokTlcO_q1hEY',
  authDomain: 'hualway.firebaseapp.com',
  projectId: 'hualway',
  storageBucket: 'hualway.firebasestorage.app',
  messagingSenderId: '947307182394',
  appId: '1:947307182394:web:552800ccca0406bc94f803',
  measurementId: 'G-MGTD5W0YG2'
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);

// Analytics is not available in every browser or local preview environment.
export const firebaseAnalytics =
  typeof window === 'undefined'
    ? Promise.resolve(null)
    : isSupported()
        .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
        .catch(() => null);
