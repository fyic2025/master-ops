import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, BrandApplication } from '@/lib/supabase';

// HubSpot configuration
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { contactName, email, phone, brandName, website, categories, currentRetailers } = body;

    if (!contactName || !email || !brandName) {
      return NextResponse.json(
        { error: 'Missing required fields: contactName, email, brandName' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Create application in Supabase
    const application: Partial<BrandApplication> = {
      contact_name: contactName,
      email: email.toLowerCase().trim(),
      phone: phone || undefined,
      brand_name: brandName,
      website: website || undefined,
      categories: categories || [],
      current_retailers: currentRetailers ? parseInt(currentRetailers) : undefined,
      status: 'pending',
      source: 'website',
      utm_source: body.utmSource || undefined,
      utm_medium: body.utmMedium || undefined,
      utm_campaign: body.utmCampaign || undefined,
    };

    const { data, error } = await supabase
      .from('brand_applications')
      .insert(application)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save application' },
        { status: 500 }
      );
    }

    // Sync to HubSpot (async, don't block response)
    if (HUBSPOT_ACCESS_TOKEN) {
      syncToHubSpot(data).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      applicationId: data.id,
      message: 'Application submitted successfully',
    });

  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// HubSpot sync function
async function syncToHubSpot(application: BrandApplication) {
  if (!HUBSPOT_ACCESS_TOKEN) return;

  try {
    // Create or update contact in HubSpot
    const contactResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          email: application.email,
          firstname: application.contact_name.split(' ')[0],
          lastname: application.contact_name.split(' ').slice(1).join(' ') || '',
          phone: application.phone || '',
          company: application.brand_name,
          website: application.website || '',
          brand_connections_status: 'pending',
          brand_connections_source: 'website',
          brand_connections_categories: (application.categories || []).join(', '),
        },
      }),
    });

    if (!contactResponse.ok) {
      // Try to update existing contact if create fails (409 conflict)
      if (contactResponse.status === 409) {
        const searchResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filterGroups: [{
                filters: [{
                  propertyName: 'email',
                  operator: 'EQ',
                  value: application.email,
                }],
              }],
            }),
          }
        );

        const searchData = await searchResponse.json();
        if (searchData.results?.[0]?.id) {
          // Update existing contact
          await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${searchData.results[0].id}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                properties: {
                  brand_connections_status: 'pending',
                  brand_connections_brand: application.brand_name,
                },
              }),
            }
          );

          // Update Supabase with HubSpot ID
          const supabase = createServerClient();
          await supabase
            .from('brand_applications')
            .update({
              hubspot_contact_id: searchData.results[0].id,
              hubspot_synced_at: new Date().toISOString(),
            })
            .eq('id', application.id);
        }
      }
    } else {
      const contactData = await contactResponse.json();

      // Update Supabase with HubSpot ID
      const supabase = createServerClient();
      await supabase
        .from('brand_applications')
        .update({
          hubspot_contact_id: contactData.id,
          hubspot_synced_at: new Date().toISOString(),
        })
        .eq('id', application.id);
    }

  } catch (error) {
    console.error('HubSpot sync error:', error);
  }
}
