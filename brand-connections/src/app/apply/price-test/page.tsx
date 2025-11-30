'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Plus, Trash2, Check, X, Calculator, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Product {
  id: string;
  name: string;
  size: string;
  rrp: string;
  includesGst: boolean;
}

interface PricingResult {
  distributorPrice: number;
  retailerPrice: number;
  rrp: number;
  brandMargin: number;
  viable: boolean;
}

function calculatePricing(rrp: number, includesGst: boolean): PricingResult {
  // Remove GST if included to get ex-GST price
  const exGstRrp = includesGst ? rrp / 1.1 : rrp;

  // Retailer needs 40% margin: Retailer buys at 60% of RRP
  const retailerPrice = exGstRrp * 0.60;

  // Distributor needs 30% margin: Distributor buys at 70% of retailer price
  const distributorPrice = retailerPrice * 0.70;

  // Brand margin = what's left after distributor cut
  const brandMargin = (distributorPrice / exGstRrp) * 100;

  return {
    distributorPrice,
    retailerPrice,
    rrp: exGstRrp,
    brandMargin,
    viable: brandMargin >= 30, // Brand should retain at least 30% of RRP
  };
}

export default function PriceTestPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: '', size: '', rrp: '', includesGst: true },
  ]);
  const [applicationData, setApplicationData] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // Get application data from sessionStorage
    const stored = sessionStorage.getItem('applicationData');
    if (stored) {
      setApplicationData(JSON.parse(stored));
    }
  }, []);

  const addProduct = () => {
    setProducts([
      ...products,
      { id: Date.now().toString(), name: '', size: '', rrp: '', includesGst: true },
    ]);
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const updateProduct = (id: string, field: keyof Product, value: string | boolean) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const getProductResult = (product: Product): PricingResult | null => {
    const rrp = parseFloat(product.rrp);
    if (isNaN(rrp) || rrp <= 0) return null;
    return calculatePricing(rrp, product.includesGst);
  };

  const allProductsViable = products.every((p) => {
    const result = getProductResult(p);
    return result && result.viable;
  });

  const hasValidProducts = products.some((p) => {
    const rrp = parseFloat(p.rrp);
    return p.name && !isNaN(rrp) && rrp > 0;
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Calculate results for display
    setShowResults(true);

    try {
      // Get application ID from sessionStorage
      const applicationId = applicationData?.applicationId as string;

      if (applicationId && hasValidProducts) {
        // Submit price test results to API
        const validProducts = products.filter((p) => {
          const rrp = parseFloat(p.rrp);
          return p.name && !isNaN(rrp) && rrp > 0;
        });

        await fetch('/api/applications/price-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId,
            products: validProducts.map((p) => ({
              name: p.name,
              rrp: parseFloat(p.rrp),
              includesGst: p.includesGst,
            })),
          }),
        });
      }

      // Store results in sessionStorage for thank you page
      sessionStorage.setItem(
        'priceTestResults',
        JSON.stringify({
          products: products.map((p) => ({
            ...p,
            result: getProductResult(p),
          })),
          applicationData,
        })
      );

      // Always go to thank you page after submitting
      router.push('/thank-you');
    } catch (error) {
      console.error('Price test submission error:', error);
      // Still navigate to thank you even if API fails
      router.push('/thank-you');
    }

    setIsSubmitting(false);
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Application
          </Link>

          {/* Progress Indicator */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check size={16} />
              </div>
              <span className="text-gray-500">Brand Details</span>
            </div>
            <div className="flex-1 h-0.5 bg-blue-600" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <span className="font-medium text-gray-900">Price Test</span>
            </div>
          </div>

          {/* Info Banner */}
          <motion.div
            className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex gap-3">
              <Calculator className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">How Wholesale Margins Work</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Retailers need 40% margin (ex GST) and distributors need 30% margin.
                  These are industry-standard margins for successful wholesale brands.
                  Enter your products below to see if your pricing is ready for wholesale.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Products Form */}
          <motion.div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Take the Price Test
            </h1>

            <div className="space-y-6">
              {products.map((product, index) => {
                const result = getProductResult(product);

                return (
                  <div
                    key={product.id}
                    className={`p-4 sm:p-6 rounded-xl border ${
                      showResults && result
                        ? result.viable
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900">Product {index + 1}</h3>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Name
                        </label>
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Organic Tea"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Size
                        </label>
                        <input
                          type="text"
                          value={product.size}
                          onChange={(e) => updateProduct(product.id, 'size', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., 250g"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          RRP ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={product.rrp}
                          onChange={(e) => updateProduct(product.id, 'rrp', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="29.95"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          GST Included?
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateProduct(product.id, 'includesGst', true)}
                            className={`flex-1 px-4 py-2.5 rounded-lg border font-medium transition-all ${
                              product.includesGst
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateProduct(product.id, 'includesGst', false)}
                            className={`flex-1 px-4 py-2.5 rounded-lg border font-medium transition-all ${
                              !product.includesGst
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Results */}
                    {showResults && result && (
                      <motion.div
                        className="mt-4 pt-4 border-t border-gray-200"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                      >
                        <div className="grid sm:grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 bg-white rounded-lg">
                            <div className="text-sm text-gray-500">Distributor Price</div>
                            <div className="text-lg font-bold text-gray-900">
                              ${result.distributorPrice.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400">We buy at this</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <div className="text-sm text-gray-500">Retailer Price</div>
                            <div className="text-lg font-bold text-gray-900">
                              ${result.retailerPrice.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400">What retailers pay</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <div className="text-sm text-gray-500">RRP (ex GST)</div>
                            <div className="text-lg font-bold text-gray-900">
                              ${result.rrp.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400">Consumer price</div>
                          </div>
                        </div>

                        <div
                          className={`flex items-center gap-2 p-3 rounded-lg ${
                            result.viable
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {result.viable ? (
                            <>
                              <Check className="w-5 h-5" />
                              <span className="font-medium">
                                Margins work for wholesale success
                              </span>
                            </>
                          ) : (
                            <>
                              <X className="w-5 h-5" />
                              <span className="font-medium">
                                Margins may need adjustment for wholesale
                              </span>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Product Button */}
            <button
              type="button"
              onClick={addProduct}
              className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <Plus size={18} />
              Add Another Product
            </button>

            {/* Warning if margins don't work */}
            {showResults && !allProductsViable && hasValidProducts && (
              <motion.div
                className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-900">
                      Some products may need pricing adjustment
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Don&apos;t worry—we can still review your application. Many brands adjust their
                      pricing strategy for wholesale success. Submit your application and we&apos;ll
                      discuss options.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Submit Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {!showResults ? (
                <button
                  type="button"
                  onClick={() => setShowResults(true)}
                  disabled={!hasValidProducts}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
                >
                  <Calculator size={20} />
                  Calculate My Pricing
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="group flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
                >
                  {isSubmitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight
                        size={20}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
