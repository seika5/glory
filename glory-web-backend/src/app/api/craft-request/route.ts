import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

interface CraftRequest {
  grid: (string | null)[][];
  weaponType: string;
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const { grid, weaponType }: CraftRequest = await request.json();

    if (!grid || !weaponType) {
      return NextResponse.json({ error: 'Missing grid or weaponType' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const db = getFirestore();

    // Count materials needed from grid
    const materialCounts: { [materialId: string]: number } = {};
    for (const row of grid) {
      for (const materialId of row) {
        if (materialId) {
          materialCounts[materialId] = (materialCounts[materialId] || 0) + 1;
        }
      }
    }

    // Get user's current inventory
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const userData = userDoc.data() as UserInventory;
    const currentMaterials = userData.materials || {};

    // Validate user has enough materials
    for (const [materialId, neededCount] of Object.entries(materialCounts)) {
      const availableCount = currentMaterials[materialId] || 0;
      if (availableCount < neededCount) {
        return NextResponse.json({ 
          error: `Insufficient materials: need ${neededCount} of ${materialId}, have ${availableCount}` 
        }, { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }
    }

    // Deduct materials from user's inventory
    const updates: { [field: string]: number | any } = {};
    for (const [materialId, consumeCount] of Object.entries(materialCounts)) {
      const currentQuantity = currentMaterials[materialId] || 0;
      const newQuantity = Math.max(0, currentQuantity - consumeCount);
      
      if (newQuantity === 0) {
        // Remove the material entirely if quantity becomes 0
        updates[`materials.${materialId}`] = FieldValue.delete();
      } else {
        // Update the quantity if it's still greater than 0
        updates[`materials.${materialId}`] = newQuantity;
      }
    }

    await userDocRef.update(updates);

    // Call crafting API
    console.log(`Crafting ${weaponType} with materials:`, materialCounts);
    
    try {
      const craftingResponse = await fetch('http://localhost:3002/api/craft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grid,
          weaponType
        })
      });

      if (craftingResponse.ok) {
        const craftingData = await craftingResponse.json();
        return NextResponse.json({
          success: craftingData.success,
          weapon: craftingData.weapon
        }, {
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      } else {
        console.error('Crafting API error:', await craftingResponse.text());
        return NextResponse.json({ 
          error: 'Crafting service unavailable' 
        }, { 
          status: 503,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }
    } catch (craftingError) {
      console.error('Failed to call crafting API:', craftingError);
      return NextResponse.json({ 
        error: 'Crafting service unavailable' 
      }, { 
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

  } catch (error) {
    console.error('Error processing craft request:', error);
    return NextResponse.json({ error: 'Failed to process craft request' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
}