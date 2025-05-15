document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded'); // Debug: DOM loaded

  const emailForm = document.getElementById("emailForm");
  const buyNowForm = document.getElementById("buyNowForm");

  console.log('emailForm:', emailForm); // Debug: Check if emailForm exists
  console.log('buyNowForm:', buyNowForm); // Debug: Check if buyNowForm exists

  // Contact form handler
  if (emailForm) { // Check if form exists before adding listener
    console.log('Attaching submit handler to emailForm'); // Debug: Handler attached
    emailForm.addEventListener("submit", function (e) {
      e.preventDefault();
      console.log('emailForm submit event triggered'); // Debug: Submit triggered

      const name = document.getElementById("name")?.value.trim() || '';
      const email = document.getElementById("email_id")?.value.trim() || '';
      const message = document.getElementById("message")?.value.trim() || '';
      const status = document.getElementById("status");

      if (!name || !email || !message) {
        if (status) {
          status.textContent = "Please fill out all fields.";
          status.style.color = "red";
        }
        return;
      }

      fetch('http://localhost:3001/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && status) {
          status.textContent = "Message sent successfully!";
          status.style.color = "green";
          emailForm.reset();
        } else if (status) {
          status.textContent = data.message || "Failed to send message. Try again.";
          status.style.color = "red";
        }
      })
      .catch((err) => {
        console.error('Form submission error:', err);
        if (status) {
          status.textContent = "Failed to send message. Try again.";
          status.style.color = "red";
        }
      });
    });
  }
  
  // Buy now form handler - only attach debug listener if not already handled elsewhere
  if (buyNowForm && !buyNowForm.hasAttribute('data-mail-js-initialized')) {
    console.log('Attaching debug listener to buyNowForm from mail.js'); // Debug: Handler attached
    buyNowForm.setAttribute('data-mail-js-initialized', 'true');
    
    // Add a debug check before any form submission to ensure cart data is available
    buyNowForm.addEventListener("submit", function(e) {
      // Don't prevent default here to allow the main handler in products.html to work
      // This is just for debug purposes
      
      // We're adding this validator in mail.js as an additional safeguard
      const cartCheck = JSON.parse(localStorage.getItem('knitwear_cart') || '[]');
      console.log('Cart data check in mail.js:', cartCheck);
      
      // Log form data being submitted
      const formData = {
        name: this.buyerName?.value.trim() || '',
        email: this.buyerEmail?.value.trim() || '',
        phone: this.buyerPhone?.value.trim() || '',
        address: this.buyerAddress?.value.trim() || ''
      };
      console.log('Form data being submitted:', formData);
    }, { passive: true }); // Make this a passive listener to avoid conflict
  }

  // Contact Form Handling
  const contactForm = document.getElementById('contactForm');
  
  if (contactForm) {
    // Form validation and submission
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(contactForm);
      const formObject = {};
      formData.forEach((value, key) => {
        formObject[key] = value;
      });
      
      // Validate form
      const errors = validateForm(formObject);
      
      if (Object.keys(errors).length > 0) {
        // Show error messages
        displayErrorMessages(errors);
      } else {
        // Show loading state
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Sending...';
        submitBtn.disabled = true;
        
        // Simulate form submission (replace with actual AJAX call)
        setTimeout(() => {
          // Success state
          submitBtn.innerHTML = originalBtnText;
          submitBtn.disabled = false;
          
          // Clear form
          contactForm.reset();
          
          // Show success message
          displaySuccessMessage('Thank you! Your message has been sent successfully.');
          
          // Add to results table if it exists
          addToResultsTable(formObject);
        }, 1500);
      }
    });
  }
  
  // Add table row for contact form submissions
  function addToResultsTable(data) {
    const resultsTable = document.getElementById('formResultsTable');
    if (!resultsTable) return;
    
    const tbody = resultsTable.querySelector('tbody');
    const tr = document.createElement('tr');
    
    const timestamp = new Date().toLocaleString();
    
    tr.innerHTML = `
      <td>${data.name || ''}</td>
      <td>${data.email || ''}</td>
      <td>${data.subject || ''}</td>
      <td>${timestamp}</td>
    `;
    
    tbody.appendChild(tr);
  }
  
  // Display success message
  function displaySuccessMessage(message) {
    const formMessageDiv = document.getElementById('formMessage');
    if (!formMessageDiv) return;
    
    formMessageDiv.className = 'form-message success';
    formMessageDiv.textContent = message;
    formMessageDiv.style.display = 'block';
    
    // Scroll to message
    formMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Hide after 5 seconds
    setTimeout(() => {
      formMessageDiv.style.display = 'none';
    }, 5000);
  }
  
  // Display error messages
  function displayErrorMessages(errors) {
    // Remove all existing error messages
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    
    // Add new error messages
    Object.entries(errors).forEach(([field, message]) => {
      const input = document.querySelector(`[name="${field}"]`);
      if (input) {
        input.classList.add('error');
        
        const errorSpan = document.createElement('span');
        errorSpan.className = 'error-message';
        errorSpan.textContent = message;
        
        input.parentNode.appendChild(errorSpan);
      }
    });
    
    // Scroll to first error
    const firstErrorField = document.querySelector('.error');
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstErrorField.focus();
    }
  }
  
  // Form validation
  function validateForm(data) {
    const errors = {};
    
    // Name validation
    if (!data.name || data.name.trim() === '') {
      errors.name = 'Name is required';
    }
    
    // Email validation
    if (!data.email || data.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!isValidEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Subject validation
    if (!data.subject || data.subject.trim() === '') {
      errors.subject = 'Subject is required';
    }
    
    // Message validation
    if (!data.message || data.message.trim() === '') {
      errors.message = 'Message is required';
    } else if (data.message.length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }
    
    return errors;
  }
  
  // Email validation helper
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Color theme handling for mail form
  const themeToggle = document.getElementById('mailThemeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const formContainer = document.querySelector('.contact-form-container');
      if (formContainer) {
        formContainer.classList.toggle('dark-theme');
      }
    });
  }
});