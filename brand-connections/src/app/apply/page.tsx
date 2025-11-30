'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Upload, Check, Building2, Globe, FileText, Package } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const applicationSchema = z.object({
  contactName: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(8, 'Phone number is required'),
  abn: z.string().min(11, 'Valid ABN is required').max(14),
  brandName: z.string().min(2, 'Brand name is required'),
  website: z.string().url('Valid website URL is required').or(z.string().length(0)),
  brandSummary: z.string().min(50, 'Please provide at least 50 characters describing your brand'),
  currentDistributors: z.string().optional(),
  hasSamples: z.boolean(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export default function ApplyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      hasSamples: false,
    },
  });

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);

    try {
      // Submit to API
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: data.contactName,
          email: data.email,
          phone: data.phone,
          brandName: data.brandName,
          website: data.website || '',
          // Get UTM params from URL if present
          utmSource: new URLSearchParams(window.location.search).get('utm_source'),
          utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
          utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign'),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application');
      }

      // Store form data and application ID in sessionStorage for the price test page
      sessionStorage.setItem('applicationData', JSON.stringify({
        ...data,
        applicationId: result.applicationId,
      }));

      // Navigate to price test
      router.push('/apply/price-test');
    } catch (error) {
      console.error('Submission error:', error);
      alert('There was an error submitting your application. Please try again.');
      setIsSubmitting(false);
    }
  };

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

          {/* Progress Indicator */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <span className="font-medium text-gray-900">Brand Details</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <span className="text-gray-500">Price Test</span>
            </div>
          </div>

          {/* Form Card */}
          <motion.div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Tell Us About Your Brand
              </h1>
              <p className="text-gray-600">
                This takes about 3 minutes. After submitting, you&apos;ll take our pricing test
                to see if your products are ready for wholesale.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Contact Information
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      {...register('contactName')}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.contactName ? 'border-red-300' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      placeholder="John Smith"
                    />
                    {errors.contactName && (
                      <p className="mt-1 text-sm text-red-600">{errors.contactName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      {...register('email')}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.email ? 'border-red-300' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      placeholder="john@yourbrand.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      {...register('phone')}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.phone ? 'border-red-300' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      placeholder="0400 000 000"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ABN *
                    </label>
                    <input
                      type="text"
                      {...register('abn')}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.abn ? 'border-red-300' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      placeholder="XX XXX XXX XXX"
                    />
                    {errors.abn && (
                      <p className="mt-1 text-sm text-red-600">{errors.abn.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Brand Information */}
              <div className="space-y-4 pt-6 border-t border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  Brand Information
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      {...register('brandName')}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.brandName ? 'border-red-300' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      placeholder="Your Brand"
                    />
                    {errors.brandName && (
                      <p className="mt-1 text-sm text-red-600">{errors.brandName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      {...register('website')}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.website ? 'border-red-300' : 'border-gray-200'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      placeholder="https://yourbrand.com"
                    />
                    {errors.website && (
                      <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Summary *
                  </label>
                  <textarea
                    {...register('brandSummary')}
                    rows={4}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.brandSummary ? 'border-red-300' : 'border-gray-200'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none`}
                    placeholder="Tell us about your brand, products, and unique selling points. What makes your products special? Who is your target customer?"
                  />
                  {errors.brandSummary && (
                    <p className="mt-1 text-sm text-red-600">{errors.brandSummary.message}</p>
                  )}
                </div>
              </div>

              {/* Distribution */}
              <div className="space-y-4 pt-6 border-t border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Current Distribution
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Distributors or Retailers
                  </label>
                  <textarea
                    {...register('currentDistributors')}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Please give us an idea of who carries your product so far and what locations (optional)"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        {...register('hasSamples')}
                        className="sr-only peer"
                      />
                      <div className="w-6 h-6 border-2 border-gray-300 rounded peer-checked:border-blue-600 peer-checked:bg-blue-600 transition-all">
                        <Check className="w-4 h-4 text-white absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100" />
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">
                        I have samples to provide prospective retailers
                      </span>
                      <p className="text-sm text-gray-500">
                        Samples help retailers get to know your product before purchase
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
                >
                  {isSubmitting ? (
                    'Processing...'
                  ) : (
                    <>
                      Submit & Take the Pricing Test
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <p className="text-center text-sm text-gray-500 mt-4">
                  Next: Our calculator will show if your pricing works for wholesale
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
