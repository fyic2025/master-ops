/**
 * Elevate Wholesale - Google Form Webhook Script
 *
 * This script sends form submissions to the Supabase Edge Function for processing.
 *
 * Setup Instructions:
 * 1. Open your Google Form
 * 2. Click the three dots menu → Script editor
 * 3. Delete any existing code
 * 4. Paste this entire script
 * 5. Update the configuration variables below
 * 6. Save the script (Ctrl+S or Cmd+S)
 * 7. Click "Triggers" (clock icon) → Add Trigger
 * 8. Choose: onFormSubmit, From form, On form submit
 * 9. Save and authorize
 */

// ===== CONFIGURATION =====
// Update these values with your actual Supabase project details

const SUPABASE_PROJECT_URL = 'https://your-project-ref.supabase.co'
const SUPABASE_FUNCTION_NAME = 'form-intake'
const WEBHOOK_SECRET = 'your_secret_key_here' // Optional: for webhook authentication

// ===== FORM FIELD MAPPING =====
// Update these to match your actual Google Form question titles

const FIELD_MAPPING = {
  'Email Address': 'email',
  'First Name': 'firstname',
  'Last Name': 'lastname',
  'Phone Number': 'phone',
  'Business Name': 'business_name',
  'ABN': 'abn',
  'Business Type': 'business_type',
  'Website': 'website',
  'Street Address': 'street_address',
  'City': 'city',
  'State/Territory': 'state',
  'Postcode': 'postcode',
  'How did you hear about us?': 'lead_source',
  'Referral Source': 'referral_source',
  'Products interested in': 'product_interests',
  'Estimated monthly order volume': 'estimated_order_volume',
}

// ===== MAIN FUNCTION =====

/**
 * Triggered when a form is submitted
 * @param {Object} e - The form submission event object
 */
function onFormSubmit(e) {
  try {
    console.log('Form submitted, processing...')

    // Extract form responses
    const formData = extractFormData(e.namedValues)

    // Add webhook secret if configured
    if (WEBHOOK_SECRET) {
      formData.webhookSecret = WEBHOOK_SECRET
    }

    // Send to Supabase Edge Function
    const response = sendToSupabase(formData)

    // Log success
    console.log('Form data sent successfully:', response)

    // Optional: Send confirmation email to submitter
    // sendConfirmationEmail(formData.email, formData.firstname)

  } catch (error) {
    console.error('Error processing form submission:', error)

    // Log error to Google Sheets (optional)
    logErrorToSheet(error, e.namedValues)

    // Optionally notify admin
    // sendErrorNotification(error)
  }
}

/**
 * Extract and map form data to API payload format
 * @param {Object} namedValues - Form responses keyed by question title
 * @returns {Object} Mapped form data
 */
function extractFormData(namedValues) {
  const formData = {}

  for (const [questionTitle, internalName] of Object.entries(FIELD_MAPPING)) {
    const value = namedValues[questionTitle]

    if (value && value.length > 0) {
      // Handle array responses (e.g., checkboxes)
      if (Array.isArray(value)) {
        // For multiple choice/checkbox questions
        if (internalName === 'product_interests') {
          formData[internalName] = value // Keep as array
        } else {
          formData[internalName] = value[0] // Take first value for others
        }
      } else {
        formData[internalName] = value
      }
    }
  }

  // Data validation
  if (!formData.email) {
    throw new Error('Email address is required')
  }

  if (!formData.business_name) {
    throw new Error('Business name is required')
  }

  // Format phone number (remove spaces, hyphens)
  if (formData.phone) {
    formData.phone = formData.phone.replace(/[\s\-()]/g, '')
  }

  // Normalize business type
  if (formData.business_type) {
    const typeMap = {
      'Retail Store (Physical Location)': 'Retail Store',
      'Online Store (E-commerce)': 'Online Store',
      'Both Physical and Online': 'Both'
    }
    formData.business_type = typeMap[formData.business_type] || formData.business_type
  }

  return formData
}

/**
 * Send form data to Supabase Edge Function
 * @param {Object} formData - Formatted form data
 * @returns {Object} API response
 */
function sendToSupabase(formData) {
  const url = `${SUPABASE_PROJECT_URL}/functions/v1/${SUPABASE_FUNCTION_NAME}`

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(formData),
    muteHttpExceptions: true, // Don't throw on HTTP errors
  }

  console.log('Sending to:', url)
  console.log('Payload:', JSON.stringify(formData, null, 2))

  const response = UrlFetchApp.fetch(url, options)
  const responseCode = response.getResponseCode()
  const responseBody = response.getContentText()

  console.log('Response code:', responseCode)
  console.log('Response body:', responseBody)

  if (responseCode !== 200) {
    throw new Error(`API returned ${responseCode}: ${responseBody}`)
  }

  return JSON.parse(responseBody)
}

/**
 * Send confirmation email to form submitter
 * @param {string} email - Recipient email
 * @param {string} firstname - Recipient first name
 */
function sendConfirmationEmail(email, firstname) {
  const subject = 'Thank you for your interest in Elevate Wholesale'
  const body = `
Hi ${firstname || 'there'},

Thank you for submitting your information to Elevate Wholesale!

We're processing your trial account request and you'll receive a welcome email with login details within the next few minutes.

If you don't receive an email within 10 minutes, please check your spam folder or contact us at sales@elevatewholesale.com.au.

Best regards,
The Elevate Wholesale Team
  `.trim()

  try {
    MailApp.sendEmail(email, subject, body)
    console.log('Confirmation email sent to:', email)
  } catch (error) {
    console.error('Failed to send confirmation email:', error)
  }
}

/**
 * Log errors to a separate Google Sheet for debugging
 * @param {Error} error - The error object
 * @param {Object} formData - The original form submission data
 */
function logErrorToSheet(error, formData) {
  try {
    // Get or create error log sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    let errorSheet = spreadsheet.getSheetByName('Error Log')

    if (!errorSheet) {
      errorSheet = spreadsheet.insertSheet('Error Log')
      errorSheet.appendRow(['Timestamp', 'Error Message', 'Form Data', 'Stack Trace'])
      errorSheet.getRange('A1:D1').setFontWeight('bold')
    }

    // Log error
    errorSheet.appendRow([
      new Date(),
      error.message,
      JSON.stringify(formData),
      error.stack || 'N/A'
    ])

    console.log('Error logged to Error Log sheet')
  } catch (loggingError) {
    console.error('Failed to log error to sheet:', loggingError)
  }
}

/**
 * Send error notification email to admin
 * @param {Error} error - The error object
 */
function sendErrorNotification(error) {
  const ADMIN_EMAIL = 'admin@elevatewholesale.com.au' // Update this

  const subject = '⚠️ Google Form Webhook Error'
  const body = `
An error occurred while processing a form submission:

Error: ${error.message}

Stack Trace:
${error.stack || 'N/A'}

Time: ${new Date().toISOString()}

Please check the Error Log sheet in the Google Form responses spreadsheet for full details.
  `.trim()

  try {
    MailApp.sendEmail(ADMIN_EMAIL, subject, body)
  } catch (emailError) {
    console.error('Failed to send error notification:', emailError)
  }
}

// ===== TESTING FUNCTIONS =====

/**
 * Test the webhook with sample data
 * Run this function manually to test the integration
 */
function testWebhook() {
  console.log('Starting webhook test...')

  const testData = {
    email: 'test@example.com',
    firstname: 'John',
    lastname: 'Smith',
    phone: '0400000000',
    business_name: 'Test Boutique',
    abn: '12 345 678 901',
    business_type: 'Retail Store',
    website: 'https://testboutique.com.au',
    street_address: '123 Test St',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    lead_source: 'Google Search',
    estimated_order_volume: '$1000-$5000',
  }

  if (WEBHOOK_SECRET) {
    testData.webhookSecret = WEBHOOK_SECRET
  }

  try {
    const response = sendToSupabase(testData)
    console.log('Test successful!')
    console.log('Response:', JSON.stringify(response, null, 2))
  } catch (error) {
    console.error('Test failed:', error)
  }
}

/**
 * List all form questions to help with field mapping
 * Run this function to see the exact question titles in your form
 */
function listFormQuestions() {
  const form = FormApp.getActiveForm()
  const items = form.getItems()

  console.log('Form Questions:')
  console.log('==============')

  items.forEach((item, index) => {
    console.log(`${index + 1}. "${item.getTitle()}" (${item.getType()})`)
  })

  console.log('\nUpdate the FIELD_MAPPING object with these exact question titles.')
}

// ===== INSTALLATION VERIFICATION =====

/**
 * Verify the installation and configuration
 * Run this function after setup to check everything is configured correctly
 */
function verifyInstallation() {
  console.log('Verifying installation...')
  console.log('========================')

  // Check configuration
  if (SUPABASE_PROJECT_URL === 'https://your-project-ref.supabase.co') {
    console.error('❌ SUPABASE_PROJECT_URL not configured!')
  } else {
    console.log('✓ SUPABASE_PROJECT_URL configured')
  }

  if (WEBHOOK_SECRET === 'your_secret_key_here') {
    console.warn('⚠️  WEBHOOK_SECRET not configured (optional but recommended)')
  } else {
    console.log('✓ WEBHOOK_SECRET configured')
  }

  // Check form connection
  try {
    const form = FormApp.getActiveForm()
    console.log(`✓ Connected to form: "${form.getTitle()}"`)
    console.log(`  Form has ${form.getItems().length} questions`)
  } catch (error) {
    console.error('❌ Could not access form:', error.message)
  }

  // Check trigger
  const triggers = ScriptApp.getProjectTriggers()
  const formTrigger = triggers.find(t => t.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT)

  if (formTrigger) {
    console.log('✓ Form submit trigger installed')
  } else {
    console.error('❌ Form submit trigger NOT installed!')
    console.error('   Please add a trigger: Triggers → Add Trigger → onFormSubmit → From form → On form submit')
  }

  console.log('\nRun testWebhook() to test the integration with sample data.')
}
