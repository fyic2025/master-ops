/**
 * Elevate Wholesale - Retailer Signup Form Integration
 *
 * Add this script to your Shopify page:
 * https://elevatewholesale.com.au/pages/retailer-signup
 *
 * This intercepts form submission and sends data to Supabase Edge Function
 */

(function() {
  'use strict';

  // Configuration
  const SUPABASE_FUNCTION_URL = 'https://xioudaqfmkdpkgujxehv.supabase.co/functions/v1/form-intake';
  const WEBHOOK_SECRET = 'elevate_wholesale_2025_secure';

  // Find the retailer signup form
  // Update this selector to match your actual form
  const formSelector = 'form[action*="contact"], form.contact-form, #retailer-signup-form';

  function initFormHandler() {
    const form = document.querySelector(formSelector);

    if (!form) {
      console.error('Retailer signup form not found. Update the formSelector.');
      return;
    }

    console.log('✅ Retailer signup form integration loaded');

    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
      const originalButtonText = submitButton ? submitButton.textContent : '';

      // Disable submit button to prevent double submission
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
      }

      try {
        // Collect form data
        const formData = new FormData(form);

        // Map form fields to expected API format
        // IMPORTANT: Update these field names to match your actual form
        const payload = {
          email: formData.get('contact[email]') || formData.get('email'),
          firstname: formData.get('contact[first_name]') || formData.get('first_name') || formData.get('firstname'),
          lastname: formData.get('contact[last_name]') || formData.get('last_name') || formData.get('lastname'),
          phone: formData.get('contact[phone]') || formData.get('phone'),
          business_name: formData.get('contact[company]') || formData.get('business_name') || formData.get('company'),
          abn: formData.get('contact[abn]') || formData.get('abn'),
          business_type: formData.get('contact[business_type]') || formData.get('business_type'),
          website: formData.get('contact[website]') || formData.get('website'),

          // Address fields
          street_address: formData.get('contact[address1]') || formData.get('address') || formData.get('street_address'),
          city: formData.get('contact[city]') || formData.get('city'),
          state: formData.get('contact[province]') || formData.get('state'),
          postcode: formData.get('contact[zip]') || formData.get('postcode'),
          country: formData.get('contact[country]') || formData.get('country') || 'Australia',

          // Additional fields
          product_interests: formData.get('contact[product_interests]') || formData.get('product_interests'),
          estimated_order_volume: formData.get('contact[order_volume]') || formData.get('estimated_order_volume'),
          referral_source: formData.get('contact[referral]') || formData.get('referral_source'),
          notes: formData.get('contact[note]') || formData.get('message') || formData.get('notes'),

          // Metadata
          lead_source: 'Shopify Retailer Signup',
          webhook_secret: WEBHOOK_SECRET
        };

        // Remove null/undefined values
        Object.keys(payload).forEach(key => {
          if (payload[key] === null || payload[key] === undefined || payload[key] === '') {
            delete payload[key];
          }
        });

        console.log('📤 Sending data to Supabase:', payload);

        // Send to Supabase Edge Function
        const response = await fetch(SUPABASE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log('✅ Form submitted successfully:', result);

          // Show success message
          showMessage('success', 'Thank you! Your application has been submitted. We\'ll be in touch soon.');

          // Reset form
          form.reset();

          // Optional: Redirect to thank you page
          // window.location.href = '/pages/thank-you';

        } else {
          throw new Error(result.error || 'Submission failed');
        }

      } catch (error) {
        console.error('❌ Form submission error:', error);
        showMessage('error', 'Sorry, there was an error submitting your application. Please try again or contact us directly.');
      } finally {
        // Re-enable submit button
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
      }
    });
  }

  function showMessage(type, message) {
    // Remove any existing messages
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message form-message--${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      ${type === 'success'
        ? 'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;'
        : 'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
      }
    `;

    // Insert message above form
    const form = document.querySelector(formSelector);
    if (form) {
      form.parentNode.insertBefore(messageDiv, form);

      // Auto-remove after 5 seconds for success messages
      if (type === 'success') {
        setTimeout(() => messageDiv.remove(), 5000);
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFormHandler);
  } else {
    initFormHandler();
  }

})();
