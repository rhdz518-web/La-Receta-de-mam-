// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, increment as firestoreIncrement } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWurxet32JE4noxOzMtyS-EttxyWnRmzs",
  authDomain: "receta-bc982.firebaseapp.com",
  projectId: "receta-bc982",
  storageBucket: "receta-bc982.appspot.com",
  messagingSenderId: "1033564259805",
  appId: "1:1033564259805:web:8ada7ff1631064c31c2234"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export firestore instance and helpers
export const db = getFirestore(app);
export const increment = firestoreIncrement;
