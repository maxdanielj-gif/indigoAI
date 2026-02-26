// Import Firebase scripts from the CDN
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// These values will be replaced or you can hardcode them if you prefer.
// However, for a more dynamic approach, we can fetch them or use a template.
// For now, we'll use placeholders as per the user's guide.

// NOTE: You must update these with your actual Firebase project configuration
// from the Firebase Console.
const firebaseConfig = {
  apiKey: "AIzaSyCnDozzW2iLevr7oJ_XMriUtQ-VuX9WT54",
  authDomain: "gen-lang-client-0184415198.firebaseapp.com",
  projectId: "gen-lang-client-0184415198",
  storageBucket: "gen-lang-client-0184415198.firebasestorage.app",
  messagingSenderId: "490905726047",
  appId: "1:490905726047:web:2d1453f9d6f69cea083fea"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received ', payload);
  const notificationTitle = payload.notification.title || 'New Message';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new notification.',
    icon: '/indigo-icon.png',
    badge: '/indigo-icon.png',
    tag: 'indigo-notification',
    renotify: true,
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
