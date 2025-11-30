import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mb-8">Last updated: December 2024</p>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
              <p className="text-gray-600 mb-4">
                When you apply to become a Brand Connections partner, we collect:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Contact information (name, email, phone number)</li>
                <li>Business information (ABN, brand name, website)</li>
                <li>Product information (pricing, descriptions, barcodes)</li>
                <li>Usage data (how you interact with our website)</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-600 mb-4">
                We use your information to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Process and review your partner application</li>
                <li>Communicate with you about your application status</li>
                <li>Provide our distribution services if approved</li>
                <li>Send relevant updates about our services</li>
                <li>Improve our website and services</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Information Sharing</h2>
              <p className="text-gray-600 mb-4">
                We may share your information with:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Retail partners (if you become an approved brand)</li>
                <li>Service providers who assist our operations</li>
                <li>As required by law or legal process</li>
              </ul>
              <p className="text-gray-600 mb-4">
                We do not sell your personal information to third parties.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2>
              <p className="text-gray-600 mb-4">
                We implement appropriate technical and organizational measures to protect your
                personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Your Rights</h2>
              <p className="text-gray-600 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Opt out of marketing communications</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Cookies</h2>
              <p className="text-gray-600 mb-4">
                Our website uses cookies and similar technologies to improve your experience
                and analyze website traffic. You can control cookie settings through your browser.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Contact Us</h2>
              <p className="text-gray-600 mb-4">
                For privacy-related inquiries, please contact us at:
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Email:</strong> hello@brandconnections.com.au
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Changes to This Policy</h2>
              <p className="text-gray-600 mb-4">
                We may update this privacy policy from time to time. We will notify you of any
                material changes by posting the new policy on this page.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
