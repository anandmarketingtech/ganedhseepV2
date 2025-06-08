const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/send-email', async (req, res) => {
  try {
    console.log('Received request:', req.body); // Log the request body for debugging
    const { name, email, message, phone, address, cart, subject, type } = req.body;

    // Validate cart data
    if (cart) {
      console.log('Cart data received:', JSON.stringify(cart));
      if (!Array.isArray(cart)) {
        console.warn('Cart data is not an array:', cart);
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid cart data format. Cart must be an array.'
        });
      }
      
      if (cart.length === 0) {
        console.warn('Empty cart received');
        // We can still process the order, but log a warning
      }
    }

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Use 'service' instead of host/port
      auth: {
        user: process.env.EMAIL_USER || 'orders.notification.ganeshdeep@gmail.com',
        pass: process.env.EMAIL_PASS || 'mmha rwbu fqfv iopb'
      }
    });

    // Generate CSS for better styling
    const emailCSS = `
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
      .container { max-width: 600px; margin: 0 auto; }
      h2 { color: #23232b; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-top: 20px; }
      p { margin: 8px 0; line-height: 1.6; }
      .info-row { display: flex; margin-bottom: 8px; }
      .info-label { font-weight: bold; width: 100px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th { background-color: #23232b; color: white; text-align: left; padding: 10px; }
      td { padding: 10px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; }
      .color-preview { display: inline-block; width: 16px; height: 16px; border-radius: 3px; margin-right: 5px; vertical-align: middle; border: 1px solid #ddd; }
    `;

    let emailSubject, htmlBody;

    // Format date/time
    const timestamp = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Handle different email types
    if (type === 'contact') {
      // Contact form email
      emailSubject = `New Contact Form Message: ${subject}`;
      
      // Format message with proper escaping and line breaks
      const formattedMessage = message ? message.replace(/\n/g, '<br>') : '';

      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Contact Form Submission</title>
          <style>${emailCSS}</style>
        </head>
        <body>
          <div class="container">
            <h2>New Contact Form Message</h2>
            
            <div class="info-section">
              <div class="info-row"><span class="info-label">Name:</span> <span>${name}</span></div>
              <div class="info-row"><span class="info-label">Email:</span> <span>${email}</span></div>
              ${phone ? `<div class="info-row"><span class="info-label">Phone:</span> <span>${phone}</span></div>` : ''}
              ${subject ? `<div class="info-row"><span class="info-label">Subject:</span> <span>${subject}</span></div>` : ''}
              <div class="info-row"><span class="info-label">Date:</span> <span>${timestamp}</span></div>
            </div>

            <h2>Message</h2>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #23232b;">
              ${formattedMessage}
            </div>

            <div class="footer">
              <p>This email was sent from your website contact form. Please respond to the sender directly.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (cart && Array.isArray(cart)) {
      // Order email with tabular data
      emailSubject = `New Order from ${name}`;
      
      // Remove price calculation and price column
      htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>New Order</title>
          <style>${emailCSS}</style>
        </head>
        <body>
          <div class="container">
            <h2>New Order Details</h2>
            
            <div class="info-section">
              <div class="info-row"><span class="info-label">Name:</span> <span>${name}</span></div>
              <div class="info-row"><span class="info-label">Email:</span> <span>${email}</span></div>
              ${phone ? `<div class="info-row"><span class="info-label">Phone:</span> <span>${phone}</span></div>` : ''}
              ${address ? `<div class="info-row"><span class="info-label">Address:</span> <span>${address}</span></div>` : ''}
              <div class="info-row"><span class="info-label">Date:</span> <span>${timestamp}</span></div>
            </div>

            <h2>Order Items</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 10%;">Image</th>
                  <th style="width: 45%;">Product</th>
                  <th style="width: 20%;">Quantity</th>
                  <th style="width: 25%;">Color</th>
                </tr>
              </thead>
              <tbody>
                ${cart.map(item => `
                  <tr>
                    <td>
                      ${item.image || item.img ? `<img src="${item.image || item.img}" alt="Product" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #eee;">` : ''}
                    </td>
                    <td>${item.title || 'Unknown Product'}</td>
                    <td>${item.qty || 1}</td>
                    <td>
                      ${item.color ? 
                        `<span class="color-preview" style="background-color:${item.color}"></span> ${item.color}` : 
                        'N/A'
                      }
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>This is an automated email sent from your website. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request. Missing required fields.'
      });
    }

    // Send the mail and handle response
    const info = await transporter.sendMail({
      from: 'orders.notification.ganeshdeep@gmail.com', // Use authenticated address
      to: 'pdangol2058@gmail.com', // Replace with your destination email
      subject: emailSubject,
      html: htmlBody,
    });

    console.log('Email sent successfully:', info.messageId);
    
    // Send a success response
    return res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully!',
      messageId: info.messageId
    });
    
  } catch (err) {
    console.error('Email error:', err); // Add error logging
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to send email: ' + (err.message || 'Unknown error'),
      error: err.message
    });
  }
});

// Dummy API for testing
app.get('/test-api', (req, res) => {
  res.json({ success: true, message: 'Test API is working!' });
});

// Add error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).json({ success: false, message: 'Server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`SMTP server running on http://localhost:${PORT}`);
});
