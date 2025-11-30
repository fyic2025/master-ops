'use client';

import { motion } from 'framer-motion';
import { ClipboardCheck, Calculator, Handshake, Rocket } from 'lucide-react';

const steps = [
  {
    icon: ClipboardCheck,
    step: '01',
    title: 'Apply Online',
    description: 'Complete our simple 3-minute application with your brand details and product information.',
  },
  {
    icon: Calculator,
    step: '02',
    title: 'Take the Price Test',
    description: 'Our calculator shows if your pricing works for wholesale margins. Instant feedback, no guesswork.',
  },
  {
    icon: Handshake,
    step: '03',
    title: 'Get Approved',
    description: 'Once approved, send us 24 units of each product on consignment plus your $900 investment.',
  },
  {
    icon: Rocket,
    step: '04',
    title: 'Reach Retailers',
    description: 'We market your brand to 50,000+ retailers. You fulfil orders and get paid monthly for what sells.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            className="inline-block px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Simple Process
          </motion.span>
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            How It Works
          </motion.h2>
          <motion.p
            className="mt-4 text-lg text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            From application to retailer shelves in four simple steps.
          </motion.p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              className="relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Connector line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-blue-200 to-blue-100" />
              )}

              <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 relative">
                {/* Step number */}
                <span className="absolute top-4 right-4 text-5xl font-bold text-gray-100">
                  {step.step}
                </span>

                {/* Icon */}
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6 relative z-10">
                  <step.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
