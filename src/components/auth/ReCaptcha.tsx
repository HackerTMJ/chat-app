'use client'

import { useRef, forwardRef, useImperativeHandle } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'

interface ReCaptchaProps {
  onVerify: (token: string | null) => void
  theme?: 'light' | 'dark'
}

export interface ReCaptchaRef {
  reset: () => void
  execute: () => void
}

export const ReCaptcha = forwardRef<ReCaptchaRef, ReCaptchaProps>(
  ({ onVerify, theme = 'light' }, ref) => {
    const recaptchaRef = useRef<ReCAPTCHA>(null)

    useImperativeHandle(ref, () => ({
      reset: () => recaptchaRef.current?.reset(),
      execute: () => recaptchaRef.current?.execute()
    }))

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

    if (!siteKey) {
      console.warn('reCAPTCHA site key not found')
      return null
    }

    return (
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={siteKey}
        onChange={onVerify}
        size="invisible"
      />
    )
  }
)

ReCaptcha.displayName = 'ReCaptcha'