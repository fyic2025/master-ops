'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Mail, Target, ShoppingCart, Users } from 'lucide-react';

const included = [
  { icon: Users, text: '50,000+ Australian retailer database access' },
  { icon: Target, text: 'Tailored business development campaigns' },
  { icon: Mail, text: 'Email marketing to your target niches' },
  { icon: ShoppingCart, text: 'Full order processing and fulfillment coordination' },
];

const requirements = [
  '$900 one-time investment upon approval',
  '24 units of each product on consignment',
  'Samples to share with prospective retailers',
];

export default function Investment() {
  return (
    <section id="pricing" className="py-20 sm:py-28 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium mb-6">
              Your Investment
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Low Entry. High Impact.
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Get in front of thousands of retailers for less than the cost of a single
              trade show booth. We buy products from you at distributor prices—you only
              pay for results.
            </p>

            {/* What's Included */}
            <div className="space-y-4 mb-8">
              {included.map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-gray-200">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Card */}
          <motion.div
            className="bg-white rounded-3xl p-8 sm:p-10 text-gray-900"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-8">
              <div className="text-sm text-gray-500 mb-2">One-Time Investment</div>
              <div className="text-5xl font-bold text-gray-900">
                $900
                <span className="text-lg font-normal text-gray-500 ml-2">AUD</span>
              </div>
              <div className="text-gray-500 mt-2">Plus consignment stock</div>
            </div>

            <div className="space-y-4 mb-8">
              {requirements.map((req, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-gray-600">{req}</span>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-8">
              <p className="text-sm text-blue-800">
                <strong>How it works:</strong> We market your products to our retailer network.
                Each month, we pay you distributor prices for products sold from your consignment stock.
              </p>
            </div>

            <Link
              href="/apply"
              className="group w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              Start Your Application
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <p className="text-center text-sm text-gray-500 mt-4">
              3-minute application • Instant price test results
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
