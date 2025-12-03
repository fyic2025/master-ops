#!/usr/bin/env node
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

const newContent = String.raw`{%- liquid
  assign tax_included_t = 'products.tax_included' | t

  assign current_variant = product.selected_or_first_available_variant
  assign compare_enabled = false
  if current_variant.compare_at_price > current_variant.price
    assign compare_enabled = true
  endif

  unless settings.quick-add--enabled
    render 'section-assets', name: 'product-price', type: 'script'
  endunless
-%}

<product-price-root class="product-price--root" data-id="{{ id }}">
  <div class="product-price--wrapper">
    <div class="product-price--original" data-item='accent-text'>
      {{ current_variant.price | money }}
    </div>

    <div
      class="product-price--compare"
      data-item='light-accent-text'
      {% unless compare_enabled %}
        style="display:none;"
      {% else %}
        style="display:inline-block;"
      {% endunless %}
    >
      {%- if compare_enabled -%}
        {{- current_variant.compare_at_price | money -}}
      {%- endif -%}
    </div>
  </div>

  {%- assign rrp_value = current_variant.metafields.custom.rrp.value -%}
  {%- if rrp_value -%}
    <div class="product-price--rrp" data-item="small-text" style="margin-top: 8px; color: #666; font-size: 14px;">
      RRP: ` + '$' + `{{ rrp_value }}
      {%- if current_variant.metafields.custom.has_gst.value == true -%}
        (inc GST)
      {%- elsif current_variant.metafields.custom.has_gst.value == false -%}
        (GST-free)
      {%- endif -%}
    </div>
  {%- endif -%}

  <div
    class="product-price--unit-container"
    data-item="small-text"
    {% if current_variant.unit_price_measurement %}
      style="display:flex;"
    {% else %}
      style="display:none;"
    {% endif %}
  >
    <span class="product-price--unit-price">
      {{- current_variant.unit_price | money -}}
    </span>/
    {%- if current_variant.unit_price_measurement.reference_value != 1 -%}
      <span class="product-price--reference-value">
        {{- current_variant.unit_price_measurement.reference_value -}}
      </span>
    {%- endif -%}
    <span class="product-price--reference-unit">
      {{- current_variant.unit_price_measurement.reference_unit -}}
    </span>
  </div>

  {%- if cart.taxes_included -%}
    <div class="product-price--tax" data-item="small-text">
      {{- tax_included_t -}}
    </div>
  {%- endif -%}
</product-price-root>`;

async function updateAsset() {
  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);

  const hostname = url.replace('https://', '').replace('/', '');
  const themeId = '153752731891';

  const data = JSON.stringify({
    asset: {
      key: 'snippets/product-price.liquid',
      value: newContent
    }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path: '/admin/api/2024-01/themes/' + themeId + '/assets.json',
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Theme updated successfully!');
        } else {
          console.log('Error:', body);
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

updateAsset();
