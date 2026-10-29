import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBierAnZpk5ZVhks8-KyCvokTlcO_q1hEY',
  authDomain: 'hualway.firebaseapp.com',
  projectId: 'hualway',
  storageBucket: 'hualway.firebasestorage.app',
  messagingSenderId: '947307182394',
  appId: '1:947307182394:web:552800ccca0406bc94f803'
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
