'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, CheckCircle, TrendingUp, Target, Users, FileText } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ResourcesPage() {
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownload = () => {
    // In production, this would trigger a PDF download
    // For now, show a success message
    setDownloadStarted(true);

    // Create a simple text file as placeholder
    const content = `
BRAND CONNECTIONS - WHOLESALE GROWTH GUIDE

========================================
CHAPTER 1: UNDERSTANDING WHOLESALE MARGINS
========================================

The wholesale supply chain typically works like this:

Brand → Distributor → Retailer → Consumer

Standard margins in Australia:
- Retailers need 40% margin (they buy at 60% of RRP ex-GST)
- Distributors need 30% margin (they buy at 70% of retailer price)

Example: $29.95 RRP (inc GST)
- Ex-GST RRP: $27.23
- Retailer buys at: $16.34 (60% of $27.23)
- Distributor buys at: $11.44 (70% of $16.34)
- Your margin: 42% of ex-GST RRP

========================================
CHAPTER 2: PRICING YOUR PRODUCTS FOR WHOLESALE
========================================

Key considerations:
1. Calculate your cost of goods (COGS)
2. Add your desired profit margin
3. Work backwards from RRP to ensure viability
4. Remember: volume makes up for lower margins

Tips for success:
- Price products to allow for standard industry margins
- Consider creating wholesale-specific SKUs if needed
- Bundle products to increase average order value

========================================
CHAPTER 3: PREPARING FOR RETAIL SUCCESS
========================================

What retailers look for:
✓ Professional packaging and labeling
✓ Barcode (EAN/UPC) on every product
✓ Nutritional panels and ingredient lists (if applicable)
✓ Clear shelf life and storage requirements
✓ Marketing materials and product images
✓ Consistent supply capability

========================================
CHAPTER 4: WORKING WITH DISTRIBUTORS
========================================

Benefits of distributor partnerships:
- Access to thousands of retailers
- Established logistics networks
- Credit management handled for you
- Sales representation in market

What distributors expect:
- Minimum order quantities (MOQ)
- Consignment stock arrangements
- Marketing support and samples
- Responsive communication

========================================
CHAPTER 5: GROWING YOUR WHOLESALE BUSINESS
========================================

Strategies for growth:
1. Start with independent retailers
2. Build case studies and testimonials
3. Target buying groups and chains
4. Expand geographically
5. Consider export markets

========================================
READY TO GET STARTED?
========================================

Apply now at brandconnections.com.au/apply

Brand Connections partners with innovative brands
to reach 30,000+ Australian retailers.

Investment: $900 one-time + consignment stock
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Brand-Connections-Wholesale-Growth-Guide.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>

          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Wholesale Growth Guide
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about pricing, margins, and succeeding
              in the Australian wholesale market.
            </p>
          </motion.div>

          {/* Download Card */}
          <motion.div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Free Wholesale Growth Guide
                </h2>
                <p className="text-gray-600 mb-4">
                  A comprehensive guide covering margins, pricing strategies,
                  retailer expectations, and growth tactics.
                </p>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {downloadStarted ? (
                    <>
                      <CheckCircle size={20} />
                      Downloaded!
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      Download Guide
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Quick Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Tips</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Understand Margins
                </h3>
                <p className="text-gray-600 text-sm">
                  Retailers need 40% margin, distributors need 30%. Price your
                  products to accommodate these industry standards.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Start Small, Scale Up
                </h3>
                <p className="text-gray-600 text-sm">
                  Begin with independent retailers to build case studies, then
                  target buying groups and chains.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Prepare Professional Materials
                </h3>
                <p className="text-gray-600 text-sm">
                  Have barcodes, nutritional info, high-quality images, and
                  marketing materials ready for retailers.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Samples Win Sales
                </h3>
                <p className="text-gray-600 text-sm">
                  Be prepared to provide samples to prospective retailers.
                  It&apos;s often the deciding factor in stocking decisions.
                </p>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-gray-600 mb-4">
              Ready to get your products in front of thousands of retailers?
            </p>
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors"
            >
              Apply Now
            </Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
