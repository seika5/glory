import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Initialize Firebase Admin (server-side)
if (!getApps().length) {
  const serviceAccount = {
    projectId: "glory-webapp",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  };
  
  console.log('Initializing Firebase Admin with project:', serviceAccount.projectId);
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "glory-webapp"
  });
}

interface Material {
  id: string;
  name: string;
  description: string;
  lore: string;
  statPoints: number;
  effectPoints: number;
  elementalChancePoints: number;
  level: number;
  elementalDistribution: number[];
}

interface UserInventory {
  materials: { [materialId: string]: number };
}

interface SafeMaterial {
  id: string;
  name: string;
  description: string;
  level: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No auth token provided' }, { 
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user's inventory from Firestore
    const db = getAdminFirestore();
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      // Create empty inventory if user doesn't exist
      await userDocRef.set({ materials: {} });
      return NextResponse.json({ inventory: [] }, {
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const userData = userDoc.data() as UserInventory;
    const materials = userData.materials || {};

    // Get material details for items in inventory
    const inventoryItems: { material: SafeMaterial; quantity: number }[] = [];
    
    for (const [materialId, quantity] of Object.entries(materials)) {
      if (quantity > 0) {
        const materialDoc = await db.collection('materials').doc(materialId).get();
        if (materialDoc.exists) {
          const materialData = materialDoc.data() as Material;
          // Only return safe data to frontend
          inventoryItems.push({
            material: {
              id: materialDoc.id,
              name: materialData.name,
              description: materialData.description,
              level: materialData.level,
            },
            quantity: quantity
          });
        }
      }
    }

    return NextResponse.json({ inventory: inventoryItems }, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
}