// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDNSugO6RrZLJ4QDSiH_ciopFxe3ynKezc",
    authDomain: "unitlens.firebaseapp.com",
    databaseURL: "https://unitlens-default-rtdb.firebaseio.com",
    projectId: "unitlens",
    storageBucket: "unitlens.firebasestorage.app",
    messagingSenderId: "120676982978",
    appId: "1:120676982978:web:2c9cacae9878cbeb42db5b",
    measurementId: "G-LYZP0JB9XJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);

// Helper function to log crucial activities to Firestore
export const logActivity = async (activityType: string, data: Record<string, any> = {}) => {
    try {
        await addDoc(collection(db, "activities"), {
            type: activityType,
            data,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error logging activity to Firebase:", error);
    }
};