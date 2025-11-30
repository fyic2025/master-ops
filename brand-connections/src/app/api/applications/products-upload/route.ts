import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

interface UploadedProduct {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, products } = body as {
      applicationId: string;
      products: UploadedProduct[];
    };

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // If we have an application ID, update the application
    if (applicationId) {
      // Verify application exists
      const { data: application } = await supabase
        .from('brand_applications')
        .select('id')
        .eq('id', applicationId)
        .single();

      if (application) {
        // Delete existing products for this application and re-insert
        await supabase
          .from('brand_application_products')
          .delete()
          .eq('application_id', applicationId);
      }
    }

    // Prepare products for insertion
    const productsToInsert = products
      .filter(p => p.productCode && p.description && p.purchasePrice)
      .map(p => ({
        application_id: applicationId || null,
        product_name: p.description,
        product_code: p.productCode,
        barcode: p.barcode || null,
        unit_of_measure: p.unitOfMeasure || 'Each',
        rrp: parseFloat(p.sellPrice) / 0.6 || 0, // Estimate RRP from sell price
        rrp_includes_gst: false,
        distributor_price: parseFloat(p.purchasePrice) || 0,
        retailer_price: parseFloat(p.sellPrice) || 0,
        pack_size: parseInt(p.packSize) || 1,
        weight_kg: p.weight ? parseFloat(p.weight) : null,
        width_cm: p.width ? parseFloat(p.width) : null,
        height_cm: p.height ? parseFloat(p.height) : null,
        depth_cm: p.depth ? parseFloat(p.depth) : null,
        min_order_qty: parseInt(p.minOrderQty) || 1,
        product_group: p.productGroup || null,
        notes: p.notes || null,
        is_viable: true, // Assume viable since they're uploading final catalog
        uploaded_at: new Date().toISOString(),
      }));

    // Insert products - use upsert if application_id exists
    if (applicationId) {
      const { error: insertError } = await supabase
        .from('brand_application_products')
        .insert(productsToInsert);

      if (insertError) {
        console.error('Product insert error:', insertError);
        return NextResponse.json(
          { error: 'Failed to save products' },
          { status: 500 }
        );
      }

      // Update application status
      await supabase
        .from('brand_applications')
        .update({
          status: 'reviewing',
          price_test_completed: true,
          price_test_viable: true,
        })
        .eq('id', applicationId);
    }

    return NextResponse.json({
      success: true,
      productsUploaded: productsToInsert.length,
      message: 'Products uploaded successfully',
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
