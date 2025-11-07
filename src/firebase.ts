// @ts-nocheck

// User's provided Firebase project configuration.
const firebaseConfig = {
  apiKey: "AIzaSyCWurxet32JE4noxOzMtyS-EttxyWnRmzs",
  authDomain: "receta-bc982.firebaseapp.com",
  projectId: "receta-bc982",
  storageBucket: "receta-bc982.appspot.com",
  messagingSenderId: "1033564259805",
  appId: "1:1033564259805:web:8ada7ff1631064c31c2234"
};

// Initialize Firebase
// The firebase object is available globally from the scripts in index.html
if (!window.firebase.apps.length) {
    window.firebase.initializeApp(firebaseConfig);
}

export const db = window.firebase.firestore();
export const increment = window.firebase.firestore.FieldValue.increment;
