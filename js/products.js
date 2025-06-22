import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const elements = {
        productsContainer: document.querySelector('.sonar-portfolio'),
        // Modals
        productModal: document.getElementById('productModal'),
        cartModal: document.getElementById('cartModal'),
        cartModalOverlay: document.getElementById('cartModalOverlay'),
        buyNowModal: document.getElementById('buyNowModal'),
        // Modal Content
        modalImg: document.querySelector('.modal-product-img'),
        modalTitle: document.querySelector('.modal-product-title'),
        modalQtyInput: document.getElementById('modal-qty'),
        // Modal Color Dropdown
        modalColorGroup: document.getElementById('modal-color-group'),
        modalColorDropdown: document.getElementById('modal-color-dropdown'),
        modalColorDropdownBtn: document.getElementById('modal-color-dropdown-btn'),
        modalColorDropdownList: document.getElementById('modal-color-dropdown-list'),
        modalColorDropdownSelected: document.getElementById('modal-color-dropdown-selected'),
        // Cart
        cartBtn: document.getElementById('cartBtn'),
        closeCartModal: document.getElementById('closeCartModal'),
        cartItemsDiv: document.getElementById('cartItems'),
        cartCount: document.getElementById('cartCount'),
        cartBuyNowBtn: document.getElementById('cartBuyNowBtn'),
        // Buy Now Form
        buyNowForm: document.getElementById('buyNowForm'),
        closeBuyNowModal: document.getElementById('closeBuyNowModal'),
        buyNowSubmitBtn: document.getElementById('buyNowSubmitBtn'),
        buyNowLoader: document.getElementById('buyNowLoader'),
        // 3D Models
        modelViewer1: document.getElementById("modelViewer1"),
        modelViewer2: document.getElementById("modelViewer2"),
    };

    let cart = [];
    let currentKeyboardHandler = null; // Store keyboard handler for cleanup

    // --- UTILITY FUNCTIONS ---
    const getColorsFromSwatch = (containerId) => {
        const swatches = document.querySelectorAll(`#${containerId} .color-swatch`);
        return Array.from(swatches).map(swatch => swatch.getAttribute('data-color'));
    };

    const cartKey = (id, color) => `${id}|${(color || '')}`;

    // --- CART LOGIC ---
    const loadCart = () => {
        try {
            const saved = localStorage.getItem('knitwear_cart');
            cart = saved ? JSON.parse(saved) : [];
            
            // Check if cart has old structure (with 'img' property instead of 'product_images')
            const hasOldStructure = cart.some(item => item.img && !item.product_images);
            if (hasOldStructure) {
                console.log('Clearing old cart structure');
                cart = [];
                saveCart();
            }
        } catch (e) {
            console.error("Failed to load cart from localStorage", e);
            cart = [];
        }
        updateCartUI();
    };

    const saveCart = () => {
        localStorage.setItem('knitwear_cart', JSON.stringify(cart));
    };

    const addToCart = (item) => {
        const key = cartKey(item.id, item.color);
        const existingItem = cart.find(i => cartKey(i.id, i.color) === key);
        if (existingItem) {
            existingItem.qty += item.qty;
        } else {
            cart.push({ ...item });
        }
        updateCartUI();
        saveCart();
    };

    const updateCartUI = () => {
        if (!elements.cartItemsDiv || !elements.cartCount || !elements.cartBuyNowBtn) return;
        
        const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
        elements.cartCount.textContent = totalQty;
        elements.cartCount.style.display = totalQty > 0 ? 'block' : 'none';

        if (cart.length === 0) {
            elements.cartItemsDiv.innerHTML = '<div id="cartEmptyMsg">Your cart is empty.</div>';
            elements.cartBuyNowBtn.disabled = true;
        } else {
            elements.cartItemsDiv.innerHTML = cart.map((item, idx) => {
                // Debug logging
                console.log('Cart item:', item);
                console.log('Cart item product_images:', item.product_images);
                
                let images = [];
                if (Array.isArray(item.product_images)) {
                    images = item.product_images;
                } else if (typeof item.product_images === 'string') {
                    try {
                        images = JSON.parse(item.product_images);
                    } catch (e) {
                        console.error('Failed to parse product_images:', e);
                        images = [];
                    }
                }
                if (!Array.isArray(images)) images = [];
                
                console.log('Processed images array:', images);
                
                const sortedImages = images.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
                const primaryImage = sortedImages[0]?.image_url || 'img/placeholder.jpg';
                
                console.log('Primary image URL:', primaryImage);
                
                return `
                <div class="cart-item" data-idx="${idx}">
                   <img src="${primaryImage}" alt="${item.title}">
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-meta">
                            <span>Qty: ${item.qty}</span>
                            ${item.color ? `
                            <span class="cart-item-color">
                                <span class="cart-item-color-swatch" style="background-color:${item.color};"></span>
                                ${item.color}
                            </span>` : ''}
                        </div>
                    </div>
                    <button class="cart-item-remove" title="Remove">&times;</button>
                </div>
            `;
            }).join('');
            elements.cartBuyNowBtn.disabled = false;
        }
    };

    const removeFromCart = (idx) => {
        cart.splice(idx, 1);
        updateCartUI();
        saveCart();
    };

    // --- MODAL LOGIC ---
    const openModal = (imgSrc, title, productId, allImages = []) => {
        if (!elements.productModal) return;

        const productElement = document.querySelector(`[data-id="${productId}"]`);
        const description = productElement ? productElement.dataset.description : '';

        elements.productModal.dataset.productId = productId;
        elements.modalTitle.textContent = title;
        elements.modalQtyInput.value = 1;
        
        // Add description to modal
        const descriptionElement = elements.productModal.querySelector('.modal-product-description');
        if (descriptionElement) {
            descriptionElement.textContent = description || 'No description available.';
        }
        
        // Handle multiple images - create gallery
        setupModalImageGallery(imgSrc, allImages);
        
        setupModalColors();
        
        document.body.classList.add('modal-open');
        elements.productModal.style.display = 'flex';
    };

    const setupModalImageGallery = (primaryImage, allImages = []) => {
        const modalImageContainer = elements.productModal.querySelector('.modal-image-container');
        const modalImg = elements.modalImg;
        
        if (!modalImageContainer || !modalImg) return;

        // Clear existing gallery
        modalImageContainer.innerHTML = '';

        // If we have multiple images, create a gallery
        if (allImages && allImages.length > 1) {
            // Main image display
            const mainImageDiv = document.createElement('div');
            mainImageDiv.className = 'modal-main-image';
            mainImageDiv.style.cssText = `
                position: relative;
                width: 100%;
                height: 400px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 15px;
            `;
            
            const mainImg = document.createElement('img');
            mainImg.src = primaryImage;
            mainImg.alt = 'Product';
            mainImg.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 8px;
                transition: opacity 0.3s;
            `;
            
            // Navigation arrows
            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '‹';
            prevBtn.className = 'modal-nav-btn modal-prev-btn';
            prevBtn.style.cssText = `
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(0,0,0,0.7);
                color: white;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
            `;
            
            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '›';
            nextBtn.className = 'modal-nav-btn modal-next-btn';
            nextBtn.style.cssText = `
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(0,0,0,0.7);
                color: white;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
            `;
            
            mainImageDiv.appendChild(mainImg);
            mainImageDiv.appendChild(prevBtn);
            mainImageDiv.appendChild(nextBtn);
            
            // Thumbnail gallery
            const thumbnailDiv = document.createElement('div');
            thumbnailDiv.className = 'modal-thumbnails';
            thumbnailDiv.style.cssText = `
                display: flex;
                gap: 8px;
                justify-content: center;
                flex-wrap: wrap;
                max-width: 100%;
            `;
            
            allImages.forEach((image, index) => {
                const thumb = document.createElement('img');
                thumb.src = image;
                thumb.alt = `Product ${index + 1}`;
                thumb.style.cssText = `
                    width: 60px;
                    height: 60px;
                    object-fit: cover;
                    border-radius: 6px;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: border-color 0.2s;
                    ${index === 0 ? 'border-color: #0078d7;' : ''}
                `;
                
                thumb.addEventListener('click', () => {
                    mainImg.src = image;
                    // Update active thumbnail
                    thumbnailDiv.querySelectorAll('img').forEach((t, i) => {
                        t.style.borderColor = i === index ? '#0078d7' : 'transparent';
                    });
                });
                
                thumbnailDiv.appendChild(thumb);
            });
            
            // Navigation functionality
            let currentIndex = 0;
            
            const updateImage = (index) => {
                if (index < 0) index = allImages.length - 1;
                if (index >= allImages.length) index = 0;
                
                currentIndex = index;
                mainImg.src = allImages[index];
                
                // Update active thumbnail
                thumbnailDiv.querySelectorAll('img').forEach((t, i) => {
                    t.style.borderColor = i === index ? '#0078d7' : 'transparent';
                });
            };
            
            prevBtn.addEventListener('click', () => updateImage(currentIndex - 1));
            nextBtn.addEventListener('click', () => updateImage(currentIndex + 1));
            
            // Keyboard navigation
            const handleKeyDown = (e) => {
                if (e.key === 'ArrowLeft') updateImage(currentIndex - 1);
                if (e.key === 'ArrowRight') updateImage(currentIndex + 1);
            };
            
            document.addEventListener('keydown', handleKeyDown);
            currentKeyboardHandler = handleKeyDown; // Store for cleanup
            
            modalImageContainer.appendChild(mainImageDiv);
            modalImageContainer.appendChild(thumbnailDiv);
            
        } else {
            // Single image display
            modalImg.src = primaryImage;
            modalImg.style.display = 'block';
        }
    };

    const closeModal = () => {
        if (!elements.productModal) return;
        
        // Clean up keyboard event listeners if they were added
        if (currentKeyboardHandler) {
            document.removeEventListener('keydown', currentKeyboardHandler);
            currentKeyboardHandler = null;
        }
        
        elements.productModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    const setupModalColors = () => {
        const colors = getColorsFromSwatch('colorSwatchContainer2');
        if (!elements.modalColorGroup || !elements.modalColorDropdownList || !elements.modalColorDropdownSelected) return;

        if (colors.length > 0) {
            elements.modalColorDropdownList.innerHTML = colors.map(color => `
                <div class="shadcn-dropdown-option" data-color="${color}">
                    <span class="shadcn-dropdown-swatch" style="background:${color};"></span>
                    <span>${color}</span>
                </div>
            `).join('');
            setModalColor(colors[0]);
            elements.modalColorGroup.style.display = 'block';
        } else {
            elements.modalColorGroup.style.display = 'none';
        }
    };
    
    const setModalColor = (color) => {
        if (!elements.modalColorDropdownSelected || !elements.modalColorDropdownBtn || !elements.modalImg) return;
        elements.modalColorDropdownSelected.innerHTML = `
            <span class="shadcn-dropdown-swatch" style="background:${color};"></span>
            <span>${color}</span>`;
        elements.modalColorDropdownBtn.setAttribute('data-color', color);
        elements.modalImg.style.backgroundColor = color;
    };

    const getModalColor = () => elements.modalColorDropdownBtn.getAttribute('data-color') || '';
    
    // --- EMAIL FUNCTIONS ---
    const sendOrderConfirmationEmail = async (orderData, customerData) => {
        try {
            // Check if emailService is available
            if (typeof window.emailService === 'undefined') {
                console.warn('Email service not available, skipping order confirmation email');
                return { success: false, error: 'Email service not loaded' };
            }

            const emailData = {
                customerName: customerData.name,
                customerEmail: customerData.email,
                customerPhone: customerData.phone,
                customerAddress: customerData.address,
                orderId: orderData.id,
                items: cart
            };

            const result = await window.emailService.sendOrderConfirmation(emailData);
            
            if (result.success) {
                console.log('Order confirmation email sent successfully');
            } else {
                console.error('Failed to send order confirmation email:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('Error sending order confirmation email:', error);
            return { success: false, error: error.message };
        }
    };
    
    // --- API & DATA LOADING ---
    async function loadProducts() {
        if (!elements.productsContainer) return;

        // Reset any previous styles
        elements.productsContainer.removeAttribute('style');
        elements.productsContainer.className = 'row sonar-portfolio';
        
        // Show a loading message while fetching products
        elements.productsContainer.innerHTML = `
            <div class="container-fluid">
                <div style="width: 100%; text-align: center; padding: 2em;">Loading products...</div>
            </div>
        `;

        try {
            const { data: products, error } = await supabase
                .from('products')
                .select(`
                    *,
                    product_images (
                        id,
                        image_url,
                        "order"
                    )
                `)
                .order('order', { ascending: true })
                .order('order', { foreignTable: 'product_images', ascending: true });
            if (error) throw error;

            // Debug: Log the products data structure
            console.log('Products loaded from database:', products);

            // Render products
            renderProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            elements.productsContainer.innerHTML = `
                <div class="container-fluid">
                    <div style="width: 100%; text-align: center; padding: 2em;">Error loading products. Please try again later.</div>
                </div>
            `;
        }
    }

    function renderProducts(products) {
        if (!elements.productsContainer) return;

        if (!products || products.length === 0) {
            elements.productsContainer.innerHTML = `
                <div class="container-fluid">
                    <div style="width: 100%; text-align: center; padding: 2em;">No products available at the moment.</div>
                </div>
            `;
            return;
        }

        const productsHtml = products.map(product => {
            // Get the first image (primary image) for the product
            const sortedImages = product.product_images?.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
            const primaryImage = sortedImages[0]?.image_url || '';
            
            // Get all image URLs for the modal gallery, but store the full objects for the cart
            const allImageUrls = sortedImages.map(img => img.image_url);

            return `
                <div class="single_gallery_item">
                    <a class="gallery-img" 
                       data-img="${primaryImage}" 
                       data-title="${product.name}" 
                       data-id="${product.id}" 
                       data-description="${product.description || ''}"
                       data-images='${JSON.stringify(sortedImages)}'>
                        <img src="${primaryImage}" alt="${product.name}" loading="lazy">
                    </a>
                    <div class="gallery-content">
                        <h4>${product.name}</h4>
                        <button class="add-to-cart-btn" 
                                data-img="${primaryImage}" 
                                data-title="${product.name}" 
                                data-id="${product.id}" 
                                data-description="${product.description || ''}"
                                data-images='${JSON.stringify(sortedImages)}'>
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        elements.productsContainer.innerHTML = `
            <div class="container-fluid">
                <div class="products">${productsHtml}</div>
            </div>
        `;

        // Ensure proper layout after rendering
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        document.documentElement.style.scrollBehavior = 'smooth';
    }

    // Add resize event listener to handle layout changes
    window.addEventListener('resize', () => {
        requestAnimationFrame(() => {
            if (elements.productsContainer) {
                elements.productsContainer.style.height = 'auto';
                elements.productsContainer.style.minHeight = '200px';
            }
        });
    });

    // --- 3D MODEL COLOR LOGIC ---
    function applyMaterialChanges(modelViewer, colorValue) {
        if (!modelViewer || !modelViewer.model || !modelViewer.model.materials) return;
        
        const rgbStringMatch = colorValue.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!rgbStringMatch) return;

        const rgbaColor = [
            parseInt(rgbStringMatch[1], 10) / 255,
            parseInt(rgbStringMatch[2], 10) / 255,
            parseInt(rgbStringMatch[3], 10) / 255,
            1
        ];

        const materials = modelViewer.model.materials;
        const materialToChange = materials.find(m => m.name === "kain.001");

        if (modelViewer.id === "modelViewer2" && materialToChange) {
            materialToChange.pbrMetallicRoughness.setBaseColorFactor(rgbaColor);
        } else {
            materials.forEach(material => {
                material.pbrMetallicRoughness.setBaseColorFactor(rgbaColor);
            });
        }
    }
    
    // --- EVENT LISTENERS ---
    function initEventListeners() {
        // Product Clicks
        elements.productsContainer.addEventListener('click', (e) => {
            const galleryImg = e.target.closest('.gallery-img');
            const cartBtn = e.target.closest('.add-to-cart-btn');
            
            if (galleryImg || cartBtn) {
                e.preventDefault();
                const el = galleryImg || cartBtn;
                
                // Parse the images data and extract URLs for the modal
                let imageUrls = [];
                try {
                    const imagesData = el.dataset.images ? JSON.parse(el.dataset.images) : [];
                    imageUrls = imagesData.map(img => img.image_url);
                } catch (e) {
                    console.error('Error parsing images data:', e);
                    imageUrls = [];
                }
                
                console.log('Opening modal with images:', imageUrls);
                openModal(el.dataset.img, el.dataset.title, el.dataset.id, imageUrls);
            }
        });

        // Modal Controls
        elements.productModal.querySelector('.modal-close').addEventListener('click', closeModal);
        elements.productModal.addEventListener('click', (e) => { if (e.target === elements.productModal) closeModal(); });

        // Quantity Controls
        const qtyButtons = elements.productModal.querySelectorAll('.modal-qty-btn');
        qtyButtons.forEach(button => {
            button.addEventListener('click', () => {
                const input = elements.modalQtyInput;
                const currentValue = parseInt(input.value, 10) || 1;
                if (button.textContent === '+') {
                    input.value = currentValue + 1;
                } else if (button.textContent === '-' && currentValue > 1) {
                    input.value = currentValue - 1;
                }
            });
        });

        elements.productModal.querySelector('.modal-add-to-cart').addEventListener('click', () => {
            const productId = elements.productModal.dataset.productId;
            const productElement = document.querySelector(`.gallery-img[data-id="${productId}"]`);
            
            // Debug: Log what we're about to add to cart
            console.log('Adding to cart - Product Element:', productElement);
            console.log('Adding to cart - Data Images:', productElement?.dataset.images);
            
            const productImages = productElement?.dataset.images ? JSON.parse(productElement.dataset.images) : [];
            console.log('Adding to cart - Parsed Product Images:', productImages);
            
            const cartItem = {
                id: productId,
                title: elements.modalTitle.textContent,
                qty: parseInt(elements.modalQtyInput.value, 10) || 1,
                color: getModalColor(),
                product_images: productImages
            };
            
            console.log('Final cart item being added:', cartItem);
            addToCart(cartItem);
            closeModal();
        });

        elements.productModal.querySelector('.modal-buy-now').addEventListener('click', () => {
            const productId = elements.productModal.dataset.productId;
            const productElement = document.querySelector(`.gallery-img[data-id="${productId}"]`);
            
            const productImages = productElement?.dataset.images ? JSON.parse(productElement.dataset.images) : [];
            
            const cartItem = {
                id: productId,
                title: elements.modalTitle.textContent,
                qty: parseInt(elements.modalQtyInput.value, 10) || 1,
                color: getModalColor(),
                product_images: productImages
            };
            
            addToCart(cartItem);
            closeModal();
            showCartModal();
            elements.buyNowModal.style.display = 'flex';
        });

        // Modal Color Dropdown
        elements.modalColorDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = elements.modalColorDropdownList.style.display === 'block';
            elements.modalColorDropdownList.style.display = isVisible ? 'none' : 'block';
            
            // Ensure dropdown is visible and scrollable
            if (!isVisible) {
                elements.modalColorDropdownList.style.maxHeight = '200px';
                elements.modalColorDropdownList.style.overflowY = 'auto';
            }
        });

        elements.modalColorDropdownList.addEventListener('click', (e) => {
            const option = e.target.closest('.shadcn-dropdown-option');
            if (option) {
                setModalColor(option.dataset.color);
                elements.modalColorDropdownList.style.display = 'none';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!elements.modalColorDropdownBtn.contains(e.target) && 
                !elements.modalColorDropdownList.contains(e.target)) {
                elements.modalColorDropdownList.style.display = 'none';
            }
        });

        // Cart
        const showCartModal = () => {
            elements.cartModal.style.transform = 'translateX(0)';
            elements.cartModal.style.opacity = '1';
            elements.cartModalOverlay.style.display = 'block';
        };
        const hideCartModal = () => {
            elements.cartModal.style.transform = 'translateX(100%)';
            elements.cartModal.style.opacity = '0';
            elements.cartModalOverlay.style.display = 'none';
        };

        elements.cartBtn.addEventListener('click', showCartModal);
        elements.closeCartModal.addEventListener('click', hideCartModal);
        elements.cartModalOverlay.addEventListener('click', hideCartModal);

        elements.cartItemsDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('cart-item-remove')) {
                const itemEl = e.target.closest('.cart-item');
                removeFromCart(parseInt(itemEl.dataset.idx, 10));
            }
        });

        elements.cartBuyNowBtn.addEventListener('click', () => {
            if (cart.length > 0) {
                elements.buyNowModal.style.display = 'flex';
            }
        });

        // Buy Now Form
        elements.closeBuyNowModal.addEventListener('click', () => elements.buyNowModal.style.display = 'none');
        elements.buyNowModal.addEventListener('click', (e) => { if (e.target === elements.buyNowModal) elements.buyNowModal.style.display = 'none'; });

        elements.buyNowForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (cart.length === 0) return alert("Your cart is empty.");

            const buyerData = {
                name: elements.buyNowForm.buyerName.value.trim(),
                email: elements.buyNowForm.buyerEmail.value.trim(),
                phone: elements.buyNowForm.buyerPhone.value.trim(),
                address: elements.buyNowForm.buyerAddress.value.trim(),
            };

            if (!buyerData.name || !buyerData.email) {
                return alert("Please fill out name and email.");
            }

            elements.buyNowSubmitBtn.disabled = true;
            elements.buyNowLoader.style.display = 'inline-block';

            try {
                // Step 1: Upsert customer and get their ID
                const { data: customerData, error: customerError } = await supabase
                    .from('customers')
                    .upsert({ 
                        name: buyerData.name, 
                        email: buyerData.email, 
                        phone: buyerData.phone, 
                        address: buyerData.address 
                    }, { onConflict: 'email' })
                    .select()
                    .single();

                if (customerError) throw customerError;

                const customerId = customerData.id;

                // Step 2: Create an order and get its ID
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .insert({ 
                        customer_id: customerId,
                        status: 'pending' 
                    })
                    .select()
                    .single();
                
                if (orderError) {
                    if (orderError.message.includes('relation "public.orders" does not exist')) {
                        alert("Database configuration issue: The 'orders' table is missing. Please contact support.");
                    }
                    throw orderError;
                }

                const orderId = orderData.id;

                // Step 3: Create order items
                const orderItems = cart.map(item => ({
                    order_id: orderId,
                    product_id: item.id,
                    quantity: item.qty,
                    product_color: item.color
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(orderItems);

                if (itemsError) throw itemsError;

                // Step 4: Send order confirmation email
                const emailResult = await sendOrderConfirmationEmail(orderData, customerData);
                
                // All successful
                let successMessage = "Thank you! Your order has been submitted successfully. We will contact you shortly.";
                if (emailResult.success) {
                    successMessage += " A confirmation email has been sent to your email address.";
                } else {
                    successMessage += " Note: We couldn't send a confirmation email, but your order was received.";
                }
                
                alert(successMessage);
                cart = [];
                saveCart();
                updateCartUI();
                elements.buyNowForm.reset();
                elements.buyNowModal.style.display = 'none';
                hideCartModal();

            } catch (error) {
                console.error('Error creating order:', error);
                alert(`Failed to create order: ${error.message}`);
            } finally {
                elements.buyNowSubmitBtn.disabled = false;
                elements.buyNowLoader.style.display = 'none';
            }
        });

        // Global Listeners
        document.addEventListener('click', () => {
            if (elements.modalColorDropdownList.style.display === 'block') {
                elements.modalColorDropdownList.style.display = 'none';
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                hideCartModal();
                elements.buyNowModal.style.display = 'none';
            }
        });

        // 3D Model Color Swatches
document.querySelectorAll('#colorSwatchContainer2 .color-swatch').forEach(swatch => {
    swatch.addEventListener('click', function () {
        const rgb = this.getAttribute('data-color');
                applyMaterialChanges(elements.modelViewer2, rgb);
        document.querySelectorAll('#colorSwatchContainer2 .color-swatch.active').forEach(el => el.classList.remove('active'));
        this.classList.add('active');
    });
});

        if (elements.modelViewer2) {
            elements.modelViewer2.addEventListener("load", () => {
                const firstSwatch = document.querySelector('#colorSwatchContainer2 .color-swatch');
                if (firstSwatch) {
                    firstSwatch.classList.add('active');
                    applyMaterialChanges(elements.modelViewer2, firstSwatch.getAttribute('data-color'));
                }
            });
        }
    }

    // --- INITIALIZATION ---
    loadProducts();
    loadCart();
    initEventListeners();
});