import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

let app: any = null;

export function getFirebaseAdmin() {
  if (app) return app;
  
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  try {
    // Use the service account JSON file directly
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    
    console.log('Initializing Firebase Admin with service account file:', serviceAccountPath);

    app = initializeApp({
      credential: cert(serviceAccountPath),
      projectId: "glory-webapp"
    });

    console.log('Firebase Admin initialized successfully');
    return app;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

export function getAdminAuth() {
  getFirebaseAdmin();
  return getAuth();
}

export function getAdminFirestore() {
  getFirebaseAdmin();
  return getFirestore();
}