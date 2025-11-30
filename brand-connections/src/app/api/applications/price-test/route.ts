import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, BrandApplicationProduct } from '@/lib/supabase';

// Pricing calculations
function calculatePricing(rrp: number, includesGst: boolean) {
  const exGstRrp = includesGst ? rrp / 1.1 : rrp;
  const retailerPrice = exGstRrp * 0.60;  // Retailers need 40% margin
  const distributorPrice = retailerPrice * 0.70;  // Distributors need 30% margin
  const brandMargin = (distributorPrice / exGstRrp) * 100;

  return {
    distributorPrice: Math.round(distributorPrice * 100) / 100,
    retailerPrice: Math.round(retailerPrice * 100) / 100,
    brandMargin: Math.round(brandMargin * 10) / 10,
    isViable: brandMargin >= 30,  // Brands need at least 30% to be viable
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, products } = body;

    if (!applicationId || !products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: applicationId, products array' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify application exists
    const { data: application, error: appError } = await supabase
      .from('brand_applications')
      .select('id, brand_name')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Process each product
    const processedProducts: BrandApplicationProduct[] = [];
    let hasViableProduct = false;

    for (const product of products) {
      if (!product.name || !product.rrp) continue;

      const pricing = calculatePricing(
        parseFloat(product.rrp),
        product.includesGst !== false
      );

      const productRecord: BrandApplicationProduct = {
        application_id: applicationId,
        product_name: product.name,
        rrp: parseFloat(product.rrp),
        rrp_includes_gst: product.includesGst !== false,
        distributor_price: pricing.distributorPrice,
        retailer_price: pricing.retailerPrice,
        brand_margin: pricing.brandMargin,
        is_viable: pricing.isViable,
      };

      processedProducts.push(productRecord);

      if (pricing.isViable) {
        hasViableProduct = true;
      }
    }

    // Insert products
    const { error: insertError } = await supabase
      .from('brand_application_products')
      .insert(processedProducts);

    if (insertError) {
      console.error('Product insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save products' },
        { status: 500 }
      );
    }

    // Update application with price test completion status
    const { error: updateError } = await supabase
      .from('brand_applications')
      .update({
        price_test_completed: true,
        price_test_viable: hasViableProduct,
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Application update error:', updateError);
    }

    return NextResponse.json({
      success: true,
      productsAdded: processedProducts.length,
      hasViableProducts: hasViableProduct,
      message: 'Price test completed successfully',
    });

  } catch (error) {
    console.error('Price test submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve price test results
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get('applicationId');

  if (!applicationId) {
    return NextResponse.json(
      { error: 'Missing applicationId parameter' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('brand_application_products')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at');

  if (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    products: data,
    summary: {
      total: data.length,
      viable: data.filter(p => p.is_viable).length,
      averageMargin: data.length > 0
        ? Math.round((data.reduce((sum, p) => sum + (p.brand_margin || 0), 0) / data.length) * 10) / 10
        : 0,
    },
  });
}
