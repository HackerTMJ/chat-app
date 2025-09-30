export async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/verify-recaptcha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    const data = await response.json()
    return data.success
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return false
  }
}