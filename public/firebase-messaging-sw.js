/* eslint-disable no-undef */
// Firebase Messaging service worker (uses compat SDK as recommended for SW)

importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCRqXlc15nLSb_yWwpgcMIpc3BwoMFuR4E',
  authDomain: 'jeewan-jyoti-digital-care.firebaseapp.com',
  projectId: 'jeewan-jyoti-digital-care',
  storageBucket: 'jeewan-jyoti-digital-care.firebasestorage.app',
  messagingSenderId: '851998918583',
  appId: '1:851998918583:web:dab7664a8ebc3ba531ca32',
  measurementId: 'G-LDMV7W4EFV'
});

const messaging = firebase.messaging();

const API_BASE_URL = 'https://jeewanjyoti-backend.smart.org.np';

function resolveImageUrl(url) {
  if (!url) return undefined;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
}

// Optional: display notifications when app is in background
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload?.notification?.title || 'New Notification';
  const image = resolveImageUrl(payload?.notification?.image || payload?.data?.image);
  const notificationOptions = {
    body: payload?.notification?.body || '',
    icon: '/favicon.ico',
    image
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});


