import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDBBAUN25T6PRPo6wFiBzSP2KC-fyeR6kY",
  authDomain: "rtc-vizag-tracker.firebaseapp.com",
  databaseURL: "https://rtc-vizag-tracker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rtc-vizag-tracker",
  storageBucket: "rtc-vizag-tracker.firebasestorage.app",
  messagingSenderId: "185598594824",
  appId: "1:185598594824:web:67ca8e7518d434729a66bd"
};

const app = initializeApp(firebaseConfig);

// These are the magic lines that were missing. They share the database with your App.
export const database = getDatabase(app);
export { ref, set, onValue };