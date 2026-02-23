// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDMOruqoiBTc2cFq4bJ0DDSNMTXG3Pe66I",
  authDomain: "farm-e5a34.firebaseapp.com",
  projectId: "farm-e5a34",
  storageBucket: "farm-e5a34.firebasestorage.app",
  messagingSenderId: "806495577267",
  appId: "1:806495577267:web:97044bee0b1483e17b3cc6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);