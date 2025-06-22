// Centralized Email Service for Ganeshdeep Knitwear
class EmailService {
    constructor() {
        this.isInitialized = false;
        this.config = {
            publicKey: "aLg3g2Ge58mA-HpUU",
            contactServiceId: "service_y0l00o8",
            contactTemplateId: "template_7dkofl8", // Contact form template
            orderServiceId: "service_y0l00o8", // Use same service for orders
            orderTemplateId: "template_odtxmhm" // Order confirmation template
        };
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            if (typeof emailjs === 'undefined') {
                throw new Error('EmailJS library not loaded');
            }
            
            emailjs.init({
                publicKey: this.config.publicKey,
            });
            
            this.isInitialized = true;
            console.log('EmailJS initialized successfully');
        } catch (error) {
            console.error('Failed to initialize EmailJS:', error);
            throw error;
        }
    }

    async sendContactEmail(formData) {
        await this.init();
        
        const templateParams = {
            name: formData.name, // Changed from contact_name to name
            email_id: formData.email, // Changed from contact_email to email_id
            message: formData.message, // Changed from contact_message to message
            // Note: Your template doesn't seem to use subject, but we can include it in the message if needed
            subject: formData.subject // Keep this for potential future use
        };

        try {
            const response = await emailjs.send(
                this.config.contactServiceId,
                this.config.contactTemplateId,
                templateParams
            );
            console.log('Contact email sent successfully:', response);
            return { success: true, response };
        } catch (error) {
            console.error('Failed to send contact email:', error);
            return { success: false, error: error.text || error.message };
        }
    }

    async sendOrderConfirmation(orderData) {
        await this.init();
        
        const templateParams = {
            customer_name: orderData.customerName,
            email: orderData.customerEmail, // Changed from customer_email to email to match template
            order_id: orderData.orderId,
            orders: this.formatOrderItemsForTemplate(orderData.items), // Changed to orders array
            customer_phone: orderData.customerPhone,
            customer_address: orderData.customerAddress,
            order_date: new Date().toLocaleDateString(),
            company_name: "Ganeshdeep Knitwear"
        };

        try {
            const response = await emailjs.send(
                this.config.orderServiceId,
                this.config.orderTemplateId,
                templateParams
            );
            console.log('Order confirmation email sent successfully:', response);
            return { success: true, response };
        } catch (error) {
            console.error('Failed to send order confirmation email:', error);
            return { success: false, error: error.text || error.message };
        }
    }

    // Format order items as array for EmailJS template
    formatOrderItemsForTemplate(items) {
        return items.map(item => {
            let image_url = '';
            if (Array.isArray(item.product_images) && item.product_images.length > 0) {
                const sortedImages = item.product_images.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
                image_url = sortedImages[0]?.image_url || '';
            }
            return {
                name: item.title,
                units: item.qty,
                color: item.color || 'Not specified',
                image_url
            };
        });
    }

    // Keep the old method for backward compatibility (if needed elsewhere)
    formatOrderItems(items) {
        return items.map(item => 
            `${item.title} (Qty: ${item.qty}${item.color ? `, Color: ${item.color}` : ''})`
        ).join('\n');
    }

    // Utility method to show user-friendly status messages
    displayStatus(element, success, message) {
        if (!element) return;
        
        element.className = success ? 'alert alert-success' : 'alert alert-danger';
        element.textContent = message;
        element.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
        if (success) {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }
}

// Create a singleton instance
const emailService = new EmailService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = emailService;
}

// Make available globally
window.emailService = emailService; 