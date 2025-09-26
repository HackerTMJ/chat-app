'use client'

import Link from 'next/link'
import { MessageCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageCircle size={20} className="text-blue-600" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ChatApp
              </span>
            </div>
            
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 lg:p-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Terms of Service
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                By accessing and using ChatApp, you accept and agree to be bound by the terms and provisions of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Description of Service
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                ChatApp is a real-time messaging platform that allows users to create chat rooms, 
                send messages, and communicate with other users. The service is provided "as is" without warranties of any kind.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. User Accounts
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                To use ChatApp, you must create an account and provide accurate information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                <li>You must be at least 13 years old to create an account</li>
                <li>You are responsible for maintaining the security of your account</li>
                <li>You must not share your account credentials with others</li>
                <li>You are responsible for all activities under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Acceptable Use Policy
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                When using ChatApp, you agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                <li>Send spam, harassment, or abusive messages</li>
                <li>Share illegal, harmful, or inappropriate content</li>
                <li>Impersonate other users or entities</li>
                <li>Attempt to hack, disrupt, or interfere with the service</li>
                <li>Use the service for commercial purposes without permission</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Content and Messages
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                By sending messages through ChatApp:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                <li>You retain ownership of your content</li>
                <li>You grant us a license to store and transmit your messages</li>
                <li>You are responsible for the content you share</li>
                <li>We may remove content that violates these terms</li>
                <li>Messages may be stored for service operation purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Privacy and Data Protection
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your privacy is important to us. Please review our Privacy Policy to understand 
                how we collect, use, and protect your information. By using ChatApp, you consent 
                to the collection and use of your data as described in our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Service Availability
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We strive to maintain service availability, but cannot guarantee uninterrupted access:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                <li>Service may be temporarily unavailable for maintenance</li>
                <li>We may modify or discontinue features without notice</li>
                <li>We are not liable for service interruptions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Intellectual Property
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                ChatApp and all related materials are protected by intellectual property laws:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                <li>The ChatApp service and software are owned by us</li>
                <li>You may not copy, modify, or distribute our software</li>
                <li>Trademarks and logos remain our property</li>
                <li>User-generated content remains owned by users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Limitation of Liability
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                To the fullest extent permitted by law, ChatApp shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
                whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Termination
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Either party may terminate this agreement:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                <li>You may delete your account at any time</li>
                <li>We may terminate accounts that violate these terms</li>
                <li>Termination does not affect rights that have already accrued</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                11. Changes to Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We reserve the right to modify these terms at any time. We will notify users of material changes 
                by posting the updated terms on this page. Continued use of the service after changes constitutes acceptance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                12. Governing Law
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                These terms shall be governed by and construed in accordance with the laws of the jurisdiction 
                where ChatApp is operated, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                13. Contact Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300">
                  <strong>Email:</strong> legal@chatapp.com<br />
                  <strong>Address:</strong> 123 Chat Street, Digital City, DC 12345
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}