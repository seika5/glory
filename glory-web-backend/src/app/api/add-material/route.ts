import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No auth token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const db = getFirestore();
    
    // Get all materials from database
    const materialsSnapshot = await db.collection('materials').get();
    const allMaterials: { id: string; data: Material }[] = [];
    
    materialsSnapshot.forEach(doc => {
      allMaterials.push({
        id: doc.id,
        data: doc.data() as Material
      });
    });

    if (allMaterials.length === 0) {
      return NextResponse.json({ error: 'No materials found in database' }, { status: 500 });
    }

    // Pick random material
    const randomMaterial = allMaterials[Math.floor(Math.random() * allMaterials.length)];
    
    // Get user document
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data() as UserInventory;
      const currentMaterials = userData.materials || {};
      const currentQuantity = currentMaterials[randomMaterial.id] || 0;
      
      // Update user's inventory
      await userDocRef.update({
        [`materials.${randomMaterial.id}`]: currentQuantity + 1
      });
    } else {
      // Create new user document
      await userDocRef.set({
        materials: {
          [randomMaterial.id]: 1
        }
      });
    }

    // Return only safe material data
    return NextResponse.json({
      success: true,
      material: {
        id: randomMaterial.id,
        name: randomMaterial.data.name,
        description: randomMaterial.data.description,
        level: randomMaterial.data.level,
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error adding material:', error);
    return NextResponse.json({ error: 'Failed to add material' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
}