import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDhmNw48VyFLC2m0QkNzWRhf4ZEtVuoBbk",
  authDomain: "glory-webapp.firebaseapp.com",
  projectId: "glory-webapp",
  storageBucket: "glory-webapp.firebasestorage.app",
  messagingSenderId: "789904991997",
  appId: "1:789904991997:web:f81923bbc44aaed3ab0094",
  measurementId: "G-Y8FJYCW56T"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);