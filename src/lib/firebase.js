import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyBZztsP27Mz2xhpy82fpkB2S3TBLHw2kEg',
  authDomain: 'lappies-8ec60.firebaseapp.com',
  projectId: 'lappies-8ec60',
  storageBucket: 'lappies-8ec60.firebasestorage.app',
  messagingSenderId: '121103639109',
  appId: '1:121103639109:web:1a8fdc59c3aa7d8b34392c',
  measurementId: 'G-MQ7LCV2PVC'
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Analytics is not available in every browser or local preview environment.
export const firebaseAnalytics =
  typeof window === 'undefined'
    ? Promise.resolve(null)
    : isSupported()
        .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
        .catch(() => null);
