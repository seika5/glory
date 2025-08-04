import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../lib/firebase-admin';

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
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const db = getAdminFirestore();
    
    // Check if user document already exists
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      // Create new user document with empty materials
      await userDocRef.set({
        materials: {},
        createdAt: new Date().toISOString(),
        email: decodedToken.email || '',
        displayName: decodedToken.name || ''
      });
      
      console.log(`Created new user document for ${userId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'User initialized',
      userId: userId
    }, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error initializing user:', error);
    return NextResponse.json({ error: 'Failed to initialize user' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
}