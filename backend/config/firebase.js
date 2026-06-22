// config/firebase.js
const admin = require('firebase-admin');
const logger = require('./logger');

let firebaseApp = null;

const initializeFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info('✅ Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    logger.error('❌ Firebase initialization failed:', error.message);
    throw error;
  }
};

const getMessaging = () => {
  if (!firebaseApp) initializeFirebase();
  return admin.messaging();
};

module.exports = { initializeFirebase, getMessaging };
