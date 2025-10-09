import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDFwEIR17p1xuk1GAEZMoNsdDGeFO_JMzs",
  authDomain: "limva-c4226.firebaseapp.com",
  projectId: "limva-c4226",
  storageBucket: "limva-c4226.firebasestorage.app",
  messagingSenderId: "628046910567",
  appId: "1:628046910567:web:fcb66171b1188da91070c2",
  measurementId: "G-VRSMS0GTEX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
