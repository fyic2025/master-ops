'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { TrendingUp, Quote } from 'lucide-react';

const caseStudies = [
  {
    brand: 'Teelixir',
    logo: 'https://teelixir.com.au/cdn/shop/files/teelixir_white_1.png?v=1708180588&width=140',
    logoBg: 'bg-gray-900',
    achievements: [
      '340% wholesale revenue growth in 18 months',
      'Expanded from 12 to 180+ retail stockists',
      'Now stocked in major health food chains nationally',
    ],
    quote: 'Brand Connections got us in front of retailers we\'d been trying to reach for years. The ROI on our $900 investment has been incredible.',
    author: 'Julze, Founder',
  },
  {
    brand: 'Ausganica',
    logo: 'https://ausganica.com.au/cdn/shop/files/AusWebLogo3small_green-01_200x.png?v=1614323612',
    logoBg: 'bg-white',
    achievements: [
      'Launched into Australian market from zero presence',
      '85 retail partnerships established in first 6 months',
      'Export orders to 3 new international markets',
    ],
    quote: 'Their retailer database and targeted campaigns opened doors we didn\'t know existed.',
    author: 'Brand Owner',
  },
  {
    brand: 'Your Brand',
    logoText: '?',
    logoBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    achievements: [
      '200% increase in wholesale orders year-over-year',
      'Featured in 4 major retail buying group catalogues',
      'Reduced customer acquisition cost by 60%',
    ],
    quote: 'Professional, connected, and they actually understand the wholesale game.',
    author: 'Could Be You',
    isPlaceholder: true,
  },
];

export default function CaseStudyTiles() {
  return (
    <section id="success-stories" className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            className="inline-block px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Success Stories
          </motion.span>
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Brands We&apos;ve Helped Grow
          </motion.h2>
          <motion.p
            className="mt-4 text-lg text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            We don&apos;t just talk about growth—we&apos;ve built and scaled brands ourselves.
            Here&apos;s what our partners have achieved.
          </motion.p>
        </div>

        {/* Case Study Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {caseStudies.map((study, index) => (
            <motion.div
              key={study.brand}
              className={`bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 ${
                study.isPlaceholder ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Brand Header */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-16 h-16 rounded-xl ${study.logoBg} flex items-center justify-center p-2 overflow-hidden`}
                >
                  {study.logo ? (
                    <Image
                      src={study.logo}
                      alt={`${study.brand} logo`}
                      width={120}
                      height={40}
                      className="w-full h-auto object-contain"
                    />
                  ) : (
                    <span className="text-white font-bold text-2xl">{study.logoText}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900">{study.brand}</h3>
                  {study.isPlaceholder && (
                    <span className="text-sm text-blue-600 font-medium">This could be you</span>
                  )}
                </div>
              </div>

              {/* Achievements */}
              <ul className="space-y-3 mb-6">
                {study.achievements.map((achievement, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-gray-600 text-sm">{achievement}</span>
                  </li>
                ))}
              </ul>

              {/* Quote */}
              <div className="pt-6 border-t border-gray-100">
                <div className="flex gap-3">
                  <Quote className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  <div>
                    <p className="text-gray-600 italic text-sm">&ldquo;{study.quote}&rdquo;</p>
                    <p className="text-gray-500 text-sm mt-2">— {study.author}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
