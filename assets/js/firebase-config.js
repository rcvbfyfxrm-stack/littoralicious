/**
 * Littoralicious — Firebase Configuration
 *
 * Setup:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (e.g., "littoralicious")
 * 3. Add a Web app (Project Settings > General > Your apps > Add app)
 * 4. Copy the config values below
 * 5. Enable Firestore Database (Build > Firestore > Create database > Start in test mode)
 */

const firebaseConfig = {
    apiKey: 'AIzaSyBIbFq4FtYsoz3_GAoQaJAOynaaouooYFE',
    authDomain: 'littoralicious-web-eceed.firebaseapp.com',
    projectId: 'littoralicious-web-eceed',
    storageBucket: 'littoralicious-web-eceed.firebasestorage.app',
    messagingSenderId: '1024688297116',
    appId: '1:1024688297116:web:e208f3c7f71019268ec959',
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = typeof firebase.storage === 'function' ? firebase.storage() : null;
