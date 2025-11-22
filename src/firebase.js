// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC96nSQTIfR8oCwAThQvNrlUc493JXiQlg",
  authDomain: "easydeliver-3aaa8.firebaseapp.com",
  databaseURL: "https://easydeliver-3aaa8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "easydeliver-3aaa8",
  storageBucket: "easydeliver-3aaa8.firebasestorage.app",
  messagingSenderId: "433659437888",
  appId: "1:433659437888:web:aaf934d3efb2d2350910a5",
  measurementId: "G-47YC00R5R7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db, analytics };

