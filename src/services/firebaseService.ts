import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if config is present
const isFirebaseConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId);
const app = isFirebaseConfigValid ? initializeApp(firebaseConfig) : null;
const messaging = (isFirebaseConfigValid && app && typeof window !== 'undefined') ? getMessaging(app) : null;

export const requestNotificationPermission = async (): Promise<{ success: boolean; token?: string; message: string }> => {
  if (!messaging) {
    return { success: false, message: "Firebase Messaging is not initialized. Check Firebase config and environment." };
  }

  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
    return { success: false, message: "VITE_FIREBASE_VAPID_KEY is missing. Push notifications require a VAPID key." };
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, { 
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
      });
      
      if (token) {
        return { success: true, token, message: "Push notifications enabled and token generated." };
      } else {
        return { success: false, message: "Failed to generate FCM token. Check Firebase project settings." };
      }
    } else if (permission === 'denied') {
      return { success: false, message: "Notification permission denied by the user. Please enable it in browser settings." };
    } else {
      return { success: false, message: `Notification permission state: '${permission}'. User dismissed or blocked.` };
    }
  } catch (error: any) {
    console.error('Error requesting notification permission:', error);
    return { success: false, message: `An unexpected error occurred: ${error.message || 'Unknown error'}.` };
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return;
  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground: ', payload);
    callback(payload);
  });
};

export const showNativeNotification = async (title: string, options?: NotificationOptions) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  if (Notification.permission !== 'granted') return;

  try {
    // Try using Service Worker registration first (required for Android/Chrome)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return;
      }
    }
    
    // Fallback to standard constructor (may fail on some mobile browsers)
    new Notification(title, options);
  } catch (error) {
    console.error('Error showing native notification:', error);
  }
};

export default messaging;
