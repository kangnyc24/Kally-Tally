import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAtFW47BagAa_IdUfQR4_8w",
  authDomain: "kallytally-c48df.firebaseapp.com",
  projectId: "kallytally-c48df",
  storageBucket: "kallytally-c48df.firebasestorage.app",
  messagingSenderId: "273618200976",
  appId: "1:273618200976:web:0e0080b0f218d4c9796b15",
  measurementId: "G-C8X38Z99R8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
