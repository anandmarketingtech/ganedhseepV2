# Email Setup Instructions for Ganeshdeep Knitwear

This document provides instructions for setting up email functionality using EmailJS.

## Overview

The website uses a centralized email service (`js/email-service.js`) that handles two types of emails:
1. **Contact Form Emails** - When customers send messages via the contact form
2. **Order Confirmation Emails** - When customers place orders for products

## EmailJS Configuration

### Current Configuration
- **Public Key**: `aLg3g2Ge58mA-HpUU`
- **Service ID**: `service_y0l00o8`
- **Contact Template ID**: `template_7dkofl8`
- **Order Template ID**: `template_odtxmhm`

### Required EmailJS Templates

#### 1. Contact Form Template (`template_7dkofl8`)
**Template Variables:**
- `{{name}}` - Customer's name
- `{{email_id}}` - Customer's email address
- `{{message}}` - Message content (includes subject line)
- `{{subject}}` - Subject (available but not used in current template)

**Template Format:**
Your current template uses a nice HTML format with customer icon and structured layout. The message field includes both the subject and message content combined.

#### 2. Order Confirmation Template (`template_odtxmhm`)
**Template Variables:**
- `{{customer_name}}` - Customer's full name
- `{{email}}` - Customer's email address (used in footer)
- `{{order_id}}` - Unique order identifier
- `{{orders}}` - Array of order items with the following structure:
  - `{{name}}` - Product name
  - `{{units}}` - Quantity ordered
  - `{{color}}` - Product color
  - `{{image_url}}` - Product image URL
- `{{customer_phone}}` - Customer's phone number
- `{{customer_address}}` - Customer's delivery address
- `{{order_date}}` - Date when order was placed
- `{{company_name}}` - Company name (Ganeshdeep Knitwear)

**Template Format:**
The template uses the format you provided with `{{#orders}}` loops to iterate through order items. Each order item has:
- `{{name}}` for product name
- `{{units}}` for quantity
- `{{color}}` for selected color
- `{{image_url}}` for product image

**Note**: The template should be exactly as you've configured it in EmailJS dashboard, using the HTML format with the orders loop.

## Setup Steps

1. **Login to EmailJS Dashboard**
   - Go to https://www.emailjs.com/
   - Login with your account

2. **Create/Verify Service**
   - Ensure service `service_y0l00o8` exists
   - Configure with your email provider (Gmail, Outlook, etc.)

3. **Create Order Confirmation Template**
   - Create a new template with ID: `template_order_confirm`
   - Use the sample template above
   - Configure the template variables

4. **Test Email Functionality**
   - Test contact form on `/contact.html`
   - Test order placement on `/products.html`

## Email Flow

### Contact Form Process:
1. User fills out contact form
2. Form validation occurs
3. `emailService.sendContactEmail()` is called
4. Email sent via EmailJS to business email
5. Success/error message displayed to user

### Order Confirmation Process:
1. User places order through products page
2. Order saved to Supabase database
3. `emailService.sendOrderConfirmation()` is called
4. Email sent to customer via EmailJS
5. Success message includes email confirmation status

## Error Handling

The email service includes comprehensive error handling:
- Email service unavailable
- EmailJS library not loaded
- Invalid template configurations
- Network errors during sending

## Files Modified

- `js/email-service.js` - Centralized email service
- `contact.html` - Updated to use centralized service
- `js/products.js` - Added order confirmation emails
- `products.html` - Added EmailJS script inclusion
- `email.html` - Removed (redundant)

## Troubleshooting

### Common Issues:
1. **Template not found**: Ensure template IDs match in EmailJS dashboard
2. **Service not configured**: Verify email service setup in EmailJS
3. **Public key invalid**: Check public key in EmailJS account settings
4. **Rate limiting**: EmailJS has sending limits on free accounts

### Debug Steps:
1. Check browser console for error messages
2. Verify EmailJS dashboard for sending logs
3. Test with simple template first
4. Ensure all template variables are provided 