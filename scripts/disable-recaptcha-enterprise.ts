/**
 * One-time script to disable reCAPTCHA Enterprise for Firebase Phone Auth.
 *
 * Firebase Auth SDK v11+ automatically uses reCAPTCHA Enterprise when the
 * project has it configured, causing 401 errors if the Enterprise API isn't
 * properly provisioned. Disabling it lets the SDK fall back to standard
 * reCAPTCHA v2 (free, no limits).
 *
 * Usage: npx tsx scripts/disable-recaptcha-enterprise.ts
 *
 * Requires env vars: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,
 *                    FIREBASE_ADMIN_PRIVATE_KEY
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { GoogleAuth } from 'google-auth-library'

// Load env from .env file
import { config } from 'dotenv'
config()

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing required env vars: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY')
  process.exit(1)
}

async function main() {
  console.log(`Project: ${projectId}`)
  console.log('Disabling reCAPTCHA Enterprise for Phone Auth...\n')

  // Create authenticated client using service account credentials
  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })

  const client = await auth.getClient()
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=recaptchaConfig`

  const body = {
    recaptchaConfig: {
      phoneEnforcementState: 'OFF',
      useSmsTollFraudProtection: false,
    },
  }

  try {
    const response = await client.request({
      url,
      method: 'PATCH',
      data: body,
      headers: { 'Content-Type': 'application/json' },
    })

    const data = response.data as Record<string, unknown>
    console.log('Success! reCAPTCHA Enterprise disabled for Phone Auth.')
    console.log('\nCurrent recaptchaConfig:')
    console.log(JSON.stringify(data.recaptchaConfig ?? data, null, 2))
  } catch (err: any) {
    console.error('Failed to update config:', err.response?.data ?? err.message)
    process.exit(1)
  }
}

main()
