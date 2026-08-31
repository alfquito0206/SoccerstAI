import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBzmJEURNloS7EgfyCGh1-2cyQt5R1hIKQ',
  authDomain: 'soccerstai.firebaseapp.com',
  projectId: 'soccerstai',
  storageBucket: 'soccerstai.firebasestorage.app',
  messagingSenderId: '396705829263',
  appId: '1:396705829263:web:baa9b2ede4716c9b40fbfa',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
