'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
  X,
  Loader2,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ParsedProduct {
  productCode: string;
  description: string;
  barcode: string;
  unitOfMeasure: string;
  purchasePrice: string;
  sellPrice: string;
  packSize: string;
  weight: string;
  width: string;
  height: string;
  depth: string;
  minOrderQty: string;
  productGroup: string;
  notes: string;
}

function UploadContent() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('id') || '';

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const parseCSV = (text: string): ParsedProduct[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Skip header row
    const dataLines = lines.slice(1);

    return dataLines.map(line => {
      // Handle quoted CSV values
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      return {
        productCode: values[0] || '',
        description: values[1] || '',
        barcode: values[2] || '',
        unitOfMeasure: values[3] || 'Each',
        purchasePrice: values[4] || '',
        sellPrice: values[5] || '',
        packSize: values[6] || '1',
        weight: values[7] || '',
        width: values[8] || '',
        height: values[9] || '',
        depth: values[10] || '',
        minOrderQty: values[11] || '1',
        productGroup: values[12] || '',
        notes: values[13] || '',
      };
    }).filter(p => p.productCode || p.description);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setError(null);
    setUploadSuccess(false);

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);
    };
    reader.readAsText(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setUploadSuccess(false);
  };

  const handleSubmit = async () => {
    if (!file || parsedData.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/applications/products-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          products: parsedData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const validProducts = parsedData.filter(
    p => p.productCode && p.description && p.purchasePrice
  );

  const incompleteProducts = parsedData.filter(
    p => (p.productCode || p.description) && (!p.productCode || !p.description || !p.purchasePrice)
  );

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
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Upload Your Product Catalog
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Upload your completed product template. We&apos;ll review it and get your
              products ready for our system.
            </p>
          </motion.div>

          {uploadSuccess ? (
            <motion.div
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Products Uploaded Successfully!
              </h2>
              <p className="text-gray-600 mb-6">
                We&apos;ve received {validProducts.length} products. Our team will review
                your catalog and be in touch within 2-3 business days.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Return to Homepage
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Download Template */}
              <motion.div
                className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-800 font-medium">
                      Need the template? Download it first.
                    </span>
                  </div>
                  <Link
                    href="/apply"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Download size={16} />
                    Get Template via Application
                  </Link>
                </div>
              </motion.div>

              {/* Upload Area */}
              <motion.div
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {!file ? (
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-colors ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Drag and drop your CSV file here
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">or</p>
                    <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors">
                      <Upload size={16} />
                      Choose File
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-4">
                      Accepted format: CSV (.csv)
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* File Info */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {parsedData.length} products found
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeFile}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Validation Summary */}
                    <div className="grid sm:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-emerald-50 rounded-lg">
                        <div className="flex items-center gap-2 text-emerald-700 font-medium mb-1">
                          <CheckCircle size={16} />
                          Valid Products
                        </div>
                        <p className="text-2xl font-bold text-emerald-800">
                          {validProducts.length}
                        </p>
                      </div>
                      {incompleteProducts.length > 0 && (
                        <div className="p-4 bg-amber-50 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
                            <AlertCircle size={16} />
                            Incomplete
                          </div>
                          <p className="text-2xl font-bold text-amber-800">
                            {incompleteProducts.length}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Preview Table */}
                    {validProducts.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-medium text-gray-900 mb-3">Preview</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 font-medium text-gray-600">
                                  Code
                                </th>
                                <th className="text-left py-2 px-3 font-medium text-gray-600">
                                  Description
                                </th>
                                <th className="text-left py-2 px-3 font-medium text-gray-600">
                                  Barcode
                                </th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">
                                  Purchase Price
                                </th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">
                                  Sell Price
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {validProducts.slice(0, 5).map((product, index) => (
                                <tr key={index} className="border-b border-gray-100">
                                  <td className="py-2 px-3 text-gray-900">
                                    {product.productCode}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">
                                    {product.description}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">
                                    {product.barcode || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right text-gray-900">
                                    ${product.purchasePrice}
                                  </td>
                                  <td className="py-2 px-3 text-right text-gray-900">
                                    ${product.sellPrice}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {validProducts.length > 5 && (
                            <p className="text-sm text-gray-500 mt-2 text-center">
                              + {validProducts.length - 5} more products
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-lg mb-6">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertCircle size={16} />
                          <span>{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      onClick={handleSubmit}
                      disabled={validProducts.length === 0 || isUploading}
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={20} />
                          Upload {validProducts.length} Products
                        </>
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}
