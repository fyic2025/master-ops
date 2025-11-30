'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, Clock, ArrowRight, Download, FileSpreadsheet, Upload } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ProductResult {
  name: string;
  rrp: string;
  includesGst: boolean;
  result?: {
    distributorPrice: number;
    retailerPrice: number;
    brandMargin: number;
    viable: boolean;
  };
}

export default function ThankYouPage() {
  const [brandName, setBrandName] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [applicationNumber, setApplicationNumber] = useState<number>(0);
  const [products, setProducts] = useState<ProductResult[]>([]);

  useEffect(() => {
    const applicationData = sessionStorage.getItem('applicationData');
    if (applicationData) {
      const data = JSON.parse(applicationData);
      setBrandName(data.brandName || '');
      setApplicationId(data.applicationId || '');

      // Fetch application number from API
      if (data.applicationId) {
        fetch(`/api/applications/number?id=${data.applicationId}`)
          .then(res => res.json())
          .then(result => {
            if (result.number) {
              setApplicationNumber(result.number);
            }
          })
          .catch(() => {
            // Fallback: generate from timestamp
            setApplicationNumber(Math.floor(Date.now() / 1000) % 10000);
          });
      }
    }

    const priceTestResults = sessionStorage.getItem('priceTestResults');
    if (priceTestResults) {
      const data = JSON.parse(priceTestResults);
      setProducts(data.products || []);
    }
  }, []);

  const downloadUnleashedCSV = () => {
    // Generate file prefix - Brandconnections_XX where XX is application number
    const filePrefix = `Brandconnections_${applicationNumber || Math.floor(Date.now() / 1000) % 10000}`;

    // Create Unleashed-ready CSV format
    const headers = [
      'Product Code',
      'Product Description',
      'Barcode',
      'Image URL',
      'Unit of Measure',
      'RRP (inc GST)',
      'GST Applicable',
      'Default Purchase Price',
      'Default Sell Price',
      'Pack Size',
      'Weight (kg)',
      'Width (cm)',
      'Height (cm)',
      'Depth (cm)',
      'Minimum Order Qty',
      'Product Group',
      'Notes'
    ];

    // Pre-fill with products from price test
    const rows = products
      .filter(p => p.name && p.result)
      .map((p, index) => {
        // Calculate RRP inc GST
        const rrpValue = parseFloat(p.rrp) || 0;
        const rrpIncGst = p.includesGst ? rrpValue : rrpValue * 1.1;

        return [
          `BC${applicationNumber || '000'}-${String(index + 1).padStart(3, '0')}`, // Product Code: BC41-001
          p.name, // Description
          '', // Barcode - to be filled by customer
          '', // Image URL - to be filled by customer
          'Each', // Unit of Measure
          rrpIncGst.toFixed(2), // RRP (always inc GST)
          'Yes', // GST Applicable (Yes/No)
          p.result?.distributorPrice?.toFixed(2) || '', // Purchase Price (what you sell to us)
          p.result?.retailerPrice?.toFixed(2) || '', // Sell Price (what retailers pay)
          '1', // Pack Size
          '', // Weight
          '', // Width
          '', // Height
          '', // Depth
          '1', // Minimum Order Qty
          brandName || '', // Product Group (use brand name)
          '' // Notes
        ];
      });

    // Add empty rows for additional products
    for (let i = 0; i < 10; i++) {
      const rowNum = products.filter(p => p.name && p.result).length + i + 1;
      rows.push([
        `BC${applicationNumber || '000'}-${String(rowNum).padStart(3, '0')}`, // Pre-fill product code
        '', // Description
        '', // Barcode
        '', // Image URL
        'Each', // Unit of Measure
        '', // RRP
        'Yes', // GST Applicable
        '', // Purchase Price
        '', // Sell Price
        '1', // Pack Size
        '', '', '', '', // Dimensions
        '1', // Min Order Qty
        brandName || '', // Product Group
        '' // Notes
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filePrefix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-8"
          >
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Application Submitted!
          </motion.h1>

          <motion.p
            className="text-lg text-gray-600 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {brandName
              ? `Thanks for submitting ${brandName}! We're excited to review your application.`
              : "Thanks for your application! We're excited to review it."}
          </motion.p>

          {/* What Happens Next */}
          <motion.div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-left mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">What Happens Next</h2>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Confirmation Email</h3>
                  <p className="text-gray-600 text-sm">
                    You&apos;ll receive a confirmation email with your application details within the next few minutes.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Application Review</h3>
                  <p className="text-gray-600 text-sm">
                    Our team will review your application within 2-3 business days. We&apos;ll assess your products, pricing, and market fit.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Decision & Next Steps</h3>
                  <p className="text-gray-600 text-sm">
                    If approved, we&apos;ll send you onboarding details including payment instructions for your $900 investment and consignment stock requirements.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Product Template Download */}
          <motion.div
            className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="font-medium text-emerald-900">Speed Up Your Onboarding</h3>
            </div>
            <p className="text-sm text-emerald-700 mb-4">
              Download your product template pre-filled with pricing from your test.
              Complete the missing details (barcodes, weights, etc.) and upload when ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={downloadUnleashedCSV}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Download size={16} />
                Download Product Template
              </button>
              <Link
                href={`/upload${applicationId ? `?id=${applicationId}` : ''}`}
                className="inline-flex items-center justify-center gap-2 bg-white border border-emerald-300 hover:border-emerald-400 text-emerald-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Upload size={16} />
                Upload Completed CSV
              </Link>
            </div>
          </motion.div>

          {/* Resource Download */}
          <motion.div
            className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <Download className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">While You Wait</h3>
            </div>
            <p className="text-sm text-blue-700 mb-4">
              Download our free Growth Guide to learn strategies for wholesale success.
            </p>
            <Link
              href="/resources"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Get the Growth Guide
              <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Return to Homepage
            </Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
