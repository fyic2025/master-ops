import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsPage() {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
            <p className="text-sm text-gray-500 mb-8">Last updated: December 2024</p>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 mb-4">
                By accessing and using the Brand Connections website and services, you agree to
                be bound by these Terms of Service. If you do not agree to these terms, please
                do not use our services.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Services Description</h2>
              <p className="text-gray-600 mb-4">
                Brand Connections provides wholesale distribution services that connect brands
                with retailers across Australia. Our services include:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Brand application and onboarding process</li>
                <li>Product catalog management</li>
                <li>Retailer network access</li>
                <li>Distribution and fulfillment coordination</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Partner Application</h2>
              <p className="text-gray-600 mb-4">
                To become a Brand Connections partner:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>You must complete our application process</li>
                <li>Provide accurate and complete information about your brand and products</li>
                <li>Meet our pricing and margin requirements</li>
                <li>Pay the one-time partnership investment of $900 (if approved)</li>
                <li>Provide consignment stock as required</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Partner Responsibilities</h2>
              <p className="text-gray-600 mb-4">
                As a Brand Connections partner, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Maintain product quality and consistency</li>
                <li>Provide accurate product information and pricing</li>
                <li>Maintain adequate stock levels</li>
                <li>Respond promptly to inquiries and orders</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not engage in activities that could harm our reputation</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Pricing and Payment</h2>
              <p className="text-gray-600 mb-4">
                Our pricing structure is based on industry-standard wholesale margins:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
                <li>Retailers receive 40% margin on RRP (ex GST)</li>
                <li>Distributors (Brand Connections) receive 30% margin</li>
                <li>Payment terms will be outlined in your partner agreement</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Intellectual Property</h2>
              <p className="text-gray-600 mb-4">
                You retain ownership of your brand, trademarks, and product intellectual property.
                By becoming a partner, you grant Brand Connections a non-exclusive license to use
                your brand materials for marketing and distribution purposes.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Confidentiality</h2>
              <p className="text-gray-600 mb-4">
                Both parties agree to keep confidential any proprietary information shared
                during the partnership, including pricing, customer data, and business strategies.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-600 mb-4">
                Brand Connections shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages arising from your use of our services or
                partnership with us.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Termination</h2>
              <p className="text-gray-600 mb-4">
                Either party may terminate the partnership with 30 days written notice.
                Upon termination, unsold consignment stock will be returned to the brand.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Governing Law</h2>
              <p className="text-gray-600 mb-4">
                These terms are governed by the laws of Victoria, Australia. Any disputes
                shall be resolved in the courts of Victoria.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Changes to Terms</h2>
              <p className="text-gray-600 mb-4">
                We reserve the right to modify these terms at any time. We will notify
                partners of any material changes via email.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">12. Contact</h2>
              <p className="text-gray-600 mb-4">
                For questions about these terms, please contact us at:
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Email:</strong> hello@brandconnections.com.au
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
