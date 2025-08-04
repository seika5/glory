import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    hardcodedProjectId: 'glory-webapp',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'not-set',
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyStart: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30) || 'not-set'
  }, {
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
    },
  });
}