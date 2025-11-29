/**
 * Buy Organics Online - Checkout Error Tracker
 *
 * This script captures all checkout-related errors and sends them to Supabase
 * for logging and email notification. It captures errors that don't appear in
 * BigCommerce store logs.
 *
 * INSTALLATION:
 * 1. Add this script to your BigCommerce theme's footer or checkout template
 * 2. Configure the ENDPOINT_URL with your Supabase Edge Function URL
 * 3. Optionally set a WEBHOOK_SECRET for security
 *
 * CAPTURES:
 * - Add to cart failures
 * - Shipping address validation errors
 * - Shipping method/quote errors
 * - Payment processing errors
 * - Checkout validation errors
 * - JavaScript errors on checkout pages
 * - AJAX/API request failures
 */

(function() {
  'use strict';

  // =============================================================================
  // CONFIGURATION - UPDATE THESE VALUES
  // =============================================================================

  // Your Supabase Edge Function URL
  const ENDPOINT_URL = 'https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/checkout-error-collector';

  // Optional: Webhook secret for authentication
  const WEBHOOK_SECRET = '';

  // Enable debug logging to console
  const DEBUG = false;

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  function log(...args) {
    if (DEBUG) console.log('[BOO Error Tracker]', ...args);
  }

  function getSessionId() {
    let sessionId = sessionStorage.getItem('boo_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('boo_session_id', sessionId);
    }
    return sessionId;
  }

  function getCartId() {
    // BigCommerce stores cart ID in various places
    const cartIdFromUrl = window.location.pathname.match(/\/cart\/([a-f0-9-]+)/i);
    if (cartIdFromUrl) return cartIdFromUrl[1];

    // Check for cart ID in cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'SHOP_CART_ID' || name === 'cart_id') return value;
    }

    // Check BigCommerce context
    if (window.BCData && window.BCData.cart_id) return window.BCData.cart_id;

    return null;
  }

  function getCustomerDetails() {
    // Try to get customer info from various sources
    const customer = {
      email: null,
      name: null,
      phone: null
    };

    // From BigCommerce customer object
    if (window.BCData && window.BCData.customer) {
      customer.email = window.BCData.customer.email;
      customer.name = window.BCData.customer.name;
    }

    // From checkout form fields
    const emailField = document.querySelector('input[name="email"], input[type="email"], #email, #customerEmail');
    if (emailField && emailField.value) customer.email = emailField.value;

    const nameFields = document.querySelectorAll('input[name*="name"], input[name="firstName"], input[name="lastName"]');
    const names = [];
    nameFields.forEach(field => {
      if (field.value) names.push(field.value);
    });
    if (names.length > 0) customer.name = names.join(' ');

    const phoneField = document.querySelector('input[name="phone"], input[type="tel"], #phone');
    if (phoneField && phoneField.value) customer.phone = phoneField.value;

    return customer;
  }

  function getShippingAddress() {
    const address = {};

    // Common field mappings
    const fieldMappings = {
      first_name: ['firstName', 'first_name', 'shipping-first-name', 'shippingFirstName'],
      last_name: ['lastName', 'last_name', 'shipping-last-name', 'shippingLastName'],
      company: ['company', 'companyName', 'shipping-company'],
      address1: ['address1', 'addressLine1', 'street', 'shipping-address1', 'streetAddress'],
      address2: ['address2', 'addressLine2', 'apt', 'shipping-address2'],
      city: ['city', 'suburb', 'shipping-city'],
      state: ['state', 'province', 'stateOrProvince', 'shipping-state'],
      postcode: ['postcode', 'postalCode', 'zip', 'zipCode', 'shipping-postcode'],
      country: ['country', 'countryCode', 'shipping-country'],
      phone: ['phone', 'telephone', 'shipping-phone']
    };

    for (const [key, names] of Object.entries(fieldMappings)) {
      for (const name of names) {
        const field = document.querySelector(`input[name="${name}"], input[name*="${name}"], select[name="${name}"], #${name}`);
        if (field && field.value) {
          address[key] = field.value;
          break;
        }
      }
    }

    return Object.keys(address).length > 0 ? address : null;
  }

  function getCartContents() {
    // Try to get cart from BigCommerce's API
    const products = [];

    // From page data
    if (window.BCData && window.BCData.cart && window.BCData.cart.items) {
      window.BCData.cart.items.forEach(item => {
        products.push({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          variant: item.variant
        });
      });
      return {
        products,
        cart_value: window.BCData.cart.subtotal || window.BCData.cart.grand_total,
        cart_weight: window.BCData.cart.weight
      };
    }

    // From DOM (mini cart or cart page)
    const cartItems = document.querySelectorAll('.cart-item, [data-cart-item], .cartItem');
    cartItems.forEach(item => {
      const nameEl = item.querySelector('.cart-item-name, .product-name, [data-product-name]');
      const qtyEl = item.querySelector('.cart-item-qty input, .quantity input, [data-quantity]');
      const priceEl = item.querySelector('.cart-item-price, .price, [data-price]');

      if (nameEl) {
        products.push({
          name: nameEl.textContent.trim(),
          quantity: qtyEl ? parseInt(qtyEl.value || qtyEl.textContent) : 1,
          price: priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) : 0
        });
      }
    });

    // Get cart total
    const totalEl = document.querySelector('.cart-total, .grandTotal, [data-cart-total]');
    const cartValue = totalEl ? parseFloat(totalEl.textContent.replace(/[^0-9.]/g, '')) : null;

    return {
      products: products.length > 0 ? products : null,
      cart_value: cartValue
    };
  }

  // =============================================================================
  // ERROR REPORTING
  // =============================================================================

  function sendError(errorType, errorMessage, extraData = {}) {
    const customer = getCustomerDetails();
    const cartData = getCartContents();

    const payload = {
      error_type: errorType,
      error_message: errorMessage,
      error_code: extraData.error_code || null,
      error_stack: extraData.error_stack || null,

      // Customer details
      customer_email: customer.email,
      customer_name: customer.name,
      customer_phone: customer.phone,

      // Cart contents
      cart_id: getCartId(),
      products: cartData.products,
      cart_value: cartData.cart_value,
      cart_weight: cartData.cart_weight,

      // Shipping address
      shipping_address: getShippingAddress(),

      // Technical context
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      session_id: getSessionId(),
      referrer: document.referrer,

      // Auth
      webhook_secret: WEBHOOK_SECRET || undefined
    };

    // Merge extra data
    Object.assign(payload, extraData);

    log('Sending error:', payload);

    // Send to endpoint
    fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET || ''
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (response.ok) {
        log('Error reported successfully');
      } else {
        console.error('[BOO Error Tracker] Failed to report error:', response.status);
      }
    })
    .catch(err => {
      console.error('[BOO Error Tracker] Failed to send error:', err);
    });
  }

  // =============================================================================
  // ERROR INTERCEPTORS
  // =============================================================================

  // 1. Intercept AJAX/Fetch errors
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args)
      .then(response => {
        // Check for cart/checkout related errors
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;

        if (!response.ok && isCheckoutRelatedUrl(url)) {
          response.clone().text().then(body => {
            let errorMessage = `API Error: ${response.status} ${response.statusText}`;
            let errorType = 'unknown';

            try {
              const data = JSON.parse(body);
              if (data.error || data.message || data.errors) {
                errorMessage = data.error || data.message || JSON.stringify(data.errors);
              }
            } catch (e) {
              if (body) errorMessage += ' - ' + body.substring(0, 200);
            }

            // Determine error type from URL
            if (url.includes('/cart')) errorType = 'add_to_cart';
            else if (url.includes('/shipping')) errorType = 'shipping_method';
            else if (url.includes('/address')) errorType = 'shipping_address';
            else if (url.includes('/payment') || url.includes('/order')) errorType = 'payment';
            else if (url.includes('/checkout')) errorType = 'validation';

            sendError(errorType, errorMessage, {
              error_code: response.status.toString(),
              api_url: url
            });
          });
        }
        return response;
      })
      .catch(error => {
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
        if (isCheckoutRelatedUrl(url)) {
          sendError('unknown', `Network error: ${error.message}`, {
            api_url: url,
            error_stack: error.stack
          });
        }
        throw error;
      });
  };

  // 2. Intercept XMLHttpRequest errors
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      if (this.status >= 400 && isCheckoutRelatedUrl(this._url)) {
        let errorMessage = `XHR Error: ${this.status} ${this.statusText}`;
        let errorType = 'unknown';

        try {
          const data = JSON.parse(this.responseText);
          if (data.error || data.message || data.errors) {
            errorMessage = data.error || data.message || JSON.stringify(data.errors);
          }
        } catch (e) {
          if (this.responseText) errorMessage += ' - ' + this.responseText.substring(0, 200);
        }

        // Determine error type
        const url = this._url;
        if (url.includes('/cart')) errorType = 'add_to_cart';
        else if (url.includes('/shipping')) errorType = 'shipping_method';
        else if (url.includes('/address')) errorType = 'shipping_address';
        else if (url.includes('/payment') || url.includes('/order')) errorType = 'payment';
        else if (url.includes('/checkout')) errorType = 'validation';

        sendError(errorType, errorMessage, {
          error_code: this.status.toString(),
          api_url: url
        });
      }
    });

    this.addEventListener('error', function() {
      if (isCheckoutRelatedUrl(this._url)) {
        sendError('unknown', 'Network request failed', {
          api_url: this._url
        });
      }
    });

    return originalXHRSend.apply(this, args);
  };

  // 3. Listen for BigCommerce-specific error events
  document.addEventListener('DOMContentLoaded', function() {

    // Watch for error messages appearing in the DOM
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            // Check for error message elements
            const errorSelectors = [
              '.alertBox--error',
              '.alert-error',
              '.error-message',
              '.form-error',
              '.checkout-error',
              '[data-error-message]',
              '.cart-error',
              '.shipping-error',
              '.payment-error'
            ];

            for (const selector of errorSelectors) {
              const errorEl = node.matches(selector) ? node : node.querySelector(selector);
              if (errorEl) {
                const errorText = errorEl.textContent.trim();
                if (errorText && errorText.length > 5) {
                  // Determine error type from context
                  let errorType = 'unknown';
                  const pageUrl = window.location.href.toLowerCase();

                  if (pageUrl.includes('/cart') || errorText.toLowerCase().includes('cart')) {
                    errorType = 'add_to_cart';
                  } else if (pageUrl.includes('/checkout')) {
                    if (errorText.toLowerCase().includes('shipping') || errorText.toLowerCase().includes('delivery')) {
                      errorType = 'shipping_method';
                    } else if (errorText.toLowerCase().includes('address') || errorText.toLowerCase().includes('postcode')) {
                      errorType = 'shipping_address';
                    } else if (errorText.toLowerCase().includes('payment') || errorText.toLowerCase().includes('card')) {
                      errorType = 'payment';
                    } else {
                      errorType = 'validation';
                    }
                  }

                  sendError(errorType, errorText);
                }
              }
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 4. Listen for form submission errors
    document.querySelectorAll('form').forEach(function(form) {
      form.addEventListener('submit', function(e) {
        // Store form data in case of error
        window._lastFormData = new FormData(form);
      });
    });

    // 5. Track "Add to Cart" button clicks
    document.addEventListener('click', function(e) {
      const button = e.target.closest('[data-action="add"], .add-to-cart, #add-to-cart, button[type="submit"][name*="add"]');
      if (button) {
        log('Add to cart clicked');
        window._addToCartAttempted = true;
        window._addToCartTime = Date.now();

        // Check for error after a delay
        setTimeout(function() {
          if (window._addToCartAttempted) {
            // Check if there's an error message visible
            const errorEl = document.querySelector('.alertBox--error, .alert-error, .error-message');
            if (errorEl && errorEl.offsetParent !== null) {
              const errorText = errorEl.textContent.trim();
              if (errorText && errorText.length > 5) {
                sendError('add_to_cart', errorText);
              }
            }
            window._addToCartAttempted = false;
          }
        }, 3000);
      }
    });
  });

  // 4. Catch JavaScript errors on checkout pages
  if (isCheckoutPage()) {
    window.addEventListener('error', function(event) {
      sendError('unknown', `JavaScript Error: ${event.message}`, {
        error_code: 'JS_ERROR',
        error_stack: event.error ? event.error.stack : `${event.filename}:${event.lineno}:${event.colno}`
      });
    });

    window.addEventListener('unhandledrejection', function(event) {
      sendError('unknown', `Unhandled Promise Rejection: ${event.reason}`, {
        error_code: 'PROMISE_REJECTION',
        error_stack: event.reason && event.reason.stack
      });
    });
  }

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  function isCheckoutRelatedUrl(url) {
    if (!url) return false;
    const checkoutPatterns = [
      '/cart',
      '/checkout',
      '/api/storefront/cart',
      '/api/storefront/checkout',
      '/remote/v1/cart',
      '/remote/v1/shipping',
      '/internalapi/v1/checkout',
      '/customer',
      '/shipping-quote',
      '/payment'
    ];
    return checkoutPatterns.some(pattern => url.includes(pattern));
  }

  function isCheckoutPage() {
    const url = window.location.href.toLowerCase();
    return url.includes('/cart') ||
           url.includes('/checkout') ||
           url.includes('/payment') ||
           url.includes('/shipping');
  }

  // =============================================================================
  // SPECIFIC ERROR HANDLERS
  // =============================================================================

  // Handle "Cannot add to cart" specific errors
  window.BOOErrorTracker = {
    reportAddToCartError: function(productName, errorMessage) {
      sendError('add_to_cart', errorMessage || 'Cannot add product to cart', {
        product_name: productName
      });
    },

    reportShippingError: function(errorMessage, address) {
      sendError('shipping_address', errorMessage, {
        shipping_address: address
      });
    },

    reportPaymentError: function(errorMessage, paymentMethod) {
      sendError('payment', errorMessage, {
        payment_method: paymentMethod
      });
    },

    reportCustomError: function(errorType, errorMessage, extraData) {
      sendError(errorType, errorMessage, extraData);
    }
  };

  log('Checkout Error Tracker initialized');

})();
