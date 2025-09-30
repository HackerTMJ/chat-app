# reCAPTCHA Setup Guide

## 1. Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "Create" to add a new site
3. Choose reCAPTCHA type:
   - **v2 "I'm not a robot" Checkbox** (recommended for this implementation)
   - Or **v3** for invisible reCAPTCHA
4. Add your domain(s):
   - `localhost` (for development)
   - Your production domain
5. Accept terms and submit
6. Copy the **Site Key** and **Secret Key**

## 2. Environment Variables

Add these to your `.env.local` file:

```env
# reCAPTCHA Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key-here
RECAPTCHA_SECRET_KEY=your-secret-key-here
```

## 3. Features Added

- ✅ reCAPTCHA component with dark theme support
- ✅ Integration with login page
- ✅ Server-side verification API
- ✅ Error handling and validation
- ✅ Loading states and user feedback

## 4. Usage

The reCAPTCHA is now required on the login page. Users must complete the verification before they can sign in with Google.

## 5. Customization

You can customize the reCAPTCHA component:

```tsx
<ReCaptcha
  onVerify={setRecaptchaToken}
  theme="light" // or "dark"
/>
```

## 6. Testing

- Development: Works with `localhost`
- Production: Add your domain to reCAPTCHA admin console