// Clerk Authentication Verification Service
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

/**
 * Validates a Clerk user session token against Clerk backend servers
 */
export async function verifyClerkSession(sessionToken) {
  if (!clerkSecretKey) {
    console.log('⚠️ Clerk Secret Key not configured. Bypassing token validation (Local sandbox OTP active).');
    return { success: true, mock: true, userId: 'mock_clerk_user_id' };
  }

  try {
    const res = await fetch(`https://api.clerk.com/v1/sessions/${sessionToken}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Clerk verification returned status ${res.status}`);
    }

    const data = await res.json();
    return { success: true, userId: data.user_id };
  } catch (err) {
    console.error('❌ Clerk session verification failed:', err.message);
    return { success: false, error: err.message };
  }
}
