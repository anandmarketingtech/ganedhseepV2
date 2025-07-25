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
        modalPrice: document.querySelector('.modal-product-price'),
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
        // Order Summary
        orderSummary: document.getElementById('orderSummary'),
        orderItems: document.getElementById('orderItems'),
        orderTotal: document.getElementById('orderTotal'),
        // 3D Models
        modelViewer1: document.getElementById("modelViewer1"),
        modelViewer2: document.getElementById("modelViewer2"),
    };

    let cart = [];
    let currentKeyboardHandler = null;
    let allProducts = []; // Store all products for pagination
    let productsPerPage = 0; // 0 means load all
    let isLoading = false;
    let hasMoreProducts = false;
    let imageObserver = null;
    
    // Currency state
    let currentCurrency = localStorage.getItem('selectedCurrency') || 'NPR';
    let exchangeRates = { NPR: 1 }; // Base currency
    let isUpdatingRates = false;

    // Color state
    let allColors = []; // Store all available colors
    let currentProductColors = []; // Store colors for current product

    // --- COLOR FUNCTIONS ---
    
    // Fetch all colors from database
    async function fetchAllColors() {
        try {
            const { data: colors, error } = await supabase
                .from('colors')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            allColors = colors || [];
            console.log('Fetched colors:', allColors);
            return allColors;
        } catch (error) {
            console.error('Error fetching colors:', error);
            return [];
        }
    }

    // Fetch colors for a specific product
    async function fetchProductColors(productId) {
        try {
            const { data: productColors, error } = await supabase
                .from('product_colors')
                .select(`
                    id,
                    is_multi_color,
                    is_default,
                    colors (
                        id,
                        name,
                        hex_code
                    )
                `)
                .eq('product_id', productId)
                .order('is_default', { ascending: false }); // Default color first
            
            if (error) throw error;
            
            return productColors || [];
        } catch (error) {
            console.error('Error fetching product colors:', error);
            return [];
        }
    }

    // Fetch images for a specific product and color
    async function fetchProductImagesByColor(productId, productColorId = null) {
        try {
            let query = supabase
                .from('product_images')
                .select('*')
                .eq('product_id', productId)
                .order('order');
            
            if (productColorId) {
                query = query.eq('product_color_id', productColorId);
            } else {
                // If no color specified, get images without color association
                query = query.is('product_color_id', null);
            }
            
            const { data: images, error } = await query;
            
            if (error) throw error;
            
            return images || [];
        } catch (error) {
            console.error('Error fetching product images by color:', error);
            return [];
        }
    }

    // Update 3D model colors from database
    async function update3DModelColors() {
        try {
            await fetchAllColors();
            const colorContainer = document.getElementById('colorSwatchContainer2');
            
            if (!colorContainer || allColors.length === 0) return;
            
            // Clear existing swatches
            colorContainer.innerHTML = '';
            
            // Create swatches from database colors
            allColors.forEach((color, index) => {
                const swatch = document.createElement('div');
                swatch.className = 'color-swatch';
                swatch.setAttribute('data-color', color.hex_code || `rgb(128, 128, 128)`);
                swatch.setAttribute('data-color-id', color.id);
                swatch.setAttribute('data-color-name', color.name);
                swatch.style.backgroundColor = color.hex_code || '#808080';
                swatch.title = color.name;
                
                // Add click handler
                swatch.addEventListener('click', function () {
                    const colorValue = this.getAttribute('data-color');
                    applyMaterialChanges(elements.modelViewer2, colorValue);
                    document.querySelectorAll('#colorSwatchContainer2 .color-swatch.active').forEach(el => el.classList.remove('active'));
                    this.classList.add('active');
                });
                
                colorContainer.appendChild(swatch);
            });
            
            // Set first color as active
            const firstSwatch = colorContainer.querySelector('.color-swatch');
            if (firstSwatch) {
                firstSwatch.classList.add('active');
                if (elements.modelViewer2 && elements.modelViewer2.model) {
                    applyMaterialChanges(elements.modelViewer2, firstSwatch.getAttribute('data-color'));
                }
            }
            
        } catch (error) {
            console.error('Error updating 3D model colors:', error);
        }
    }

    // --- LAZY LOADING UTILITIES ---
    const createImageObserver = () => {
        if ('IntersectionObserver' in window) {
            imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        
                        if (src) {
                            // Create a new image to preload
                            const newImg = new Image();
                            newImg.onload = () => {
                                img.src = src;
                                img.classList.remove('lazy-loading');
                                img.classList.add('lazy-loaded');
                            };
                            newImg.onerror = () => {
                                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjhmOWZhIi8+CjxyZWN0IHg9Ijc1IiB5PSI3NSIgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNlOWVjZWYiIHN0cm9rZT0iI2RlZTJlNiIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iOCIvPgo8Y2lyY2xlIGN4PSIxMTAiIGN5PSIxMTAiIHI9IjE1IiBmaWxsPSIjYWRiNWJkIi8+CjxwYXRoIGQ9Ik03NSAyMDBMMTI1IDE1MEwxNzUgMTgwTDIyNSAxMzBMMjI1IDIyNUw3NSAyMjVaIiBmaWxsPSIjY2VkNGRhIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNmM3NTdkIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiPlByb2R1Y3QgSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
                                img.classList.remove('lazy-loading');
                                img.classList.add('lazy-error');
                            };
                            newImg.src = src;
                        }
                        
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });
        }
        return imageObserver;
    };

    const observeImage = (img) => {
        if (imageObserver) {
            imageObserver.observe(img);
        } else {
            // Fallback for browsers without IntersectionObserver
            img.src = img.dataset.src || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjhmOWZhIi8+CjxyZWN0IHg9Ijc1IiB5PSI3NSIgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNlOWVjZWYiIHN0cm9rZT0iI2RlZTJlNiIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iOCIvPgo8Y2lyY2xlIGN4PSIxMTAiIGN5PSIxMTAiIHI9IjE1IiBmaWxsPSIjYWRiNWJkIi8+CjxwYXRoIGQ9Ik03NSAyMDBMMTI1IDE1MEwxNzUgMTgwTDIyNSAxMzBMMjI1IDIyNUw3NSAyMjVaIiBmaWxsPSIjY2VkNGRhIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNmM3NTdkIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiPlByb2R1Y3QgSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
        }
    };

    // Create skeleton loader HTML
    const createSkeletonLoader = () => `
        <div class="skeleton-loader">
            <div class="skeleton-item">
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-button"></div>
                </div>
            </div>
        </div>
    `;

    // --- UTILITY FUNCTIONS ---
    const cartKey = (id, color) => `${id}|${(color || '')}`;

    // --- CURRENCY CONVERSION FUNCTIONS ---
    
    // Fetch exchange rates from API and cache in database
    async function fetchExchangeRates() {
        if (isUpdatingRates) return;
        isUpdatingRates = true;
        
        try {
            const response = await fetch('https://v6.exchangerate-api.com/v6/7397ee4c761a45e0a6344edb/latest/NPR');
            const data = await response.json();
            
            if (data.result === 'success') {
                const targetCurrencies = ['USD', 'AUD', 'GBP', 'AED'];
                const ratesToSave = [];
                
                // Extract rates for our target currencies
                targetCurrencies.forEach(currency => {
                    if (data.conversion_rates[currency]) {
                        exchangeRates[currency] = data.conversion_rates[currency];
                        ratesToSave.push({
                            target_currency: currency,
                            rate: data.conversion_rates[currency]
                        });
                    }
                });
                
                // Save to database
                if (ratesToSave.length > 0) {
                    const { error } = await supabase
                        .from('exchange_rates')
                        .upsert(ratesToSave, { onConflict: 'target_currency' });
                    
                    if (error) {
                        console.warn('Failed to save exchange rates to database:', error);
                    } else {
                        console.log('Exchange rates updated successfully');
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
        } finally {
            isUpdatingRates = false;
        }
    }
    
    // Get exchange rate for a target currency (with caching)
    async function getExchangeRate(targetCurrency) {
        if (targetCurrency === 'NPR') return 1;
        
        // Check if we have a cached rate
        if (exchangeRates[targetCurrency]) {
            return exchangeRates[targetCurrency];
        }
        
        try {
            // Try to get from database first
            const { data, error } = await supabase
                .from('exchange_rates')
                .select('*')
                .eq('target_currency', targetCurrency)
                .single();

            const isFresh = data && new Date(data.updated_at).getTime() > Date.now() - 12 * 60 * 60 * 1000; // 12 hours

            if (isFresh) {
                exchangeRates[targetCurrency] = data.rate;
                return data.rate;
            }
            
            // If not fresh or doesn't exist, fetch from API
            await fetchExchangeRates();
            return exchangeRates[targetCurrency] || 1;
            
        } catch (error) {
            console.error('Error getting exchange rate:', error);
            return 1; // Fallback to 1:1 conversion
        }
    }
    
    // Convert price from NPR to target currency
    function convertPrice(nprPrice, rate) {
        return (parseFloat(nprPrice) * rate).toFixed(2);
    }
    
    // Format currency display with symbol
    function formatCurrency(amount, currency) {
        const symbols = {
            NPR: 'Rs. ',
            USD: '$',
            AUD: 'A$',
            GBP: '£',
            AED: 'د.إ '
        };
        const symbol = symbols[currency] || currency + ' ';
        // Always show as integer (no decimals)
        return `${symbol}${Math.round(amount)}`;
    }
    
    // Update all prices on the page
    async function updateAllPrices() {
        const rate = await getExchangeRate(currentCurrency);
        
        // Update product grid prices
        document.querySelectorAll('.product-price').forEach(priceElement => {
            const originalPrice = priceElement.dataset.originalPrice;
            if (originalPrice) {
                const convertedPrice = convertPrice(originalPrice, rate);
                priceElement.textContent = formatCurrency(convertedPrice, currentCurrency);
            }
        });
        
        // Update modal price
        const modalPrice = document.querySelector('.modal-product-price');
        if (modalPrice && modalPrice.dataset.price) {
            const convertedPrice = convertPrice(modalPrice.dataset.price, rate);
            modalPrice.textContent = formatCurrency(convertedPrice, currentCurrency);
        }
        
        // Update cart prices
        updateCartUI();
        
        // Update order summary if visible
        if (document.getElementById('buyNowModal').style.display === 'flex') {
            updateOrderSummary();
        }
    }
    
    // Initialize currency system
    async function initializeCurrency() {
        // Set currency selector to saved value
        const currencySelector = document.getElementById('currencySelector');
        if (currencySelector) {
            currencySelector.value = currentCurrency;
        }
        
        // Load exchange rates from database
        try {
            const { data, error } = await supabase
                .from('exchange_rates')
                .select('*');
            
            if (data && data.length > 0) {
                data.forEach(rate => {
                    exchangeRates[rate.target_currency] = rate.rate;
                });
            }
        } catch (error) {
            console.warn('Could not load exchange rates from database:', error);
        }
        
        // Fetch fresh rates if we don't have them or they're old
        await fetchExchangeRates();
    }

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

    const updateCartUI = async () => {
        if (!elements.cartItemsDiv || !elements.cartCount || !elements.cartBuyNowBtn) return;
        
        const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
        const totalPrice = cart.reduce((sum, i) => sum + (parseFloat(i.price || 0) * i.qty), 0);
        
        // Get current exchange rate
        const rate = await getExchangeRate(currentCurrency);
        
        elements.cartCount.textContent = totalQty;
        elements.cartCount.style.display = totalQty > 0 ? 'block' : 'none';

        if (cart.length === 0) {
            elements.cartItemsDiv.innerHTML = '<div id="cartEmptyMsg">Your cart is empty.</div>';
            elements.cartBuyNowBtn.disabled = true;
        } else {
            const cartItemsHTML = cart.map((item, idx) => {
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
                
                const itemPrice = parseFloat(item.price || 0);
                const convertedItemPrice = convertPrice(itemPrice, rate);
                const itemTotal = parseFloat(convertedItemPrice) * item.qty;
                
                return `
                <div class="cart-item" data-idx="${idx}">
                   <img src="${primaryImage}" alt="${item.title}" loading="lazy">
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-price">${formatCurrency(convertedItemPrice, currentCurrency)} each</div>
                        <div class="cart-item-meta">
                            <span>Qty: ${item.qty}</span>
                            <span class="cart-item-total">Total: ${formatCurrency(itemTotal, currentCurrency)}</span>
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
            
            const convertedTotalPrice = convertPrice(totalPrice, rate);
            const cartTotalHTML = `
                <div class="cart-total-section">
                    <div class="cart-total-line">
                        <span>Total Items: ${totalQty}</span>
                        <span class="cart-grand-total">Grand Total: ${formatCurrency(convertedTotalPrice, currentCurrency)}</span>
                    </div>
                </div>
            `;
            
            elements.cartItemsDiv.innerHTML = cartItemsHTML + cartTotalHTML;
            elements.cartBuyNowBtn.disabled = false;
        }
    };

    const removeFromCart = (idx) => {
        cart.splice(idx, 1);
        updateCartUI();
        saveCart();
    };

    const updateOrderSummary = async () => {
        const orderItemsDiv = document.getElementById('orderItems');
        const orderTotalDiv = document.getElementById('orderTotal');
        
        if (!orderItemsDiv || !orderTotalDiv) return;
        
        const totalPrice = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.qty), 0);
        const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
        
        // Get current exchange rate
        const rate = await getExchangeRate(currentCurrency);
        
        console.log({
            cart
        })
        orderItemsDiv.innerHTML = cart.map(item => {
            const itemPrice = parseFloat(item.price || 0);
            const convertedItemPrice = convertPrice(itemPrice, rate);
            const itemTotal = parseFloat(convertedItemPrice) * item.qty;
            
            return `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:8px 0;border-bottom:1px solid #e9ecef;">
                    <div style="display:flex; column-gap: 12px; align-items: center;">
                    <img src="${item.product_images[0].image_url}" style="width: 60px; height: 60px; border-radius:8px; object-fit:cover;" />
                         <div>
                            <div style="font-weight:500;color:#333;">${item.title}</div>
                            <div style="font-size:0.9em;color:#666;">
                                ${formatCurrency(convertedItemPrice, currentCurrency)} × ${item.qty}
                                ${item.color ? ` (${item.color})` : ''}
                            </div>
                        </div>
                    </div>   
                    <div style="font-weight:600;color:#333;">${formatCurrency(itemTotal, currentCurrency)}</div>
                </div>
            `;
        }).join('');
        
        const convertedTotalPrice = convertPrice(totalPrice, rate);
        orderTotalDiv.textContent = formatCurrency(convertedTotalPrice, currentCurrency);
    };

    // --- MODAL LOGIC ---
    const openModal = async (imgSrc, title, productId, allImages = []) => {
        if (!elements.productModal) return;

        const productElement = document.querySelector(`[data-id="${productId}"]`);
        const description = productElement ? productElement.dataset.description : '';
        let price = productElement ? productElement.dataset.price : '0';

        // Fallback: try to get price from allProducts array if not in dataset
        if ((!price || price === '0') && allProducts.length > 0) {
            const product = allProducts.find(p => p.id === parseInt(productId));
            if (product && product.price) {
                price = product.price;
            }
        }

        elements.productModal.dataset.productId = productId;
        elements.modalTitle.textContent = title;
        elements.modalQtyInput.value = 1;
        
        // Add description to modal
        const descriptionElement = elements.productModal.querySelector('.modal-product-description');
        if (descriptionElement) {
            descriptionElement.textContent = description || 'No description available.';
        }
        
        // Add price to modal
        const priceElement = elements.productModal.querySelector('.modal-product-price');
        if (priceElement) {
            const rate = exchangeRates[currentCurrency] || 1;
            const convertedPrice = convertPrice(price || 0, rate);
            priceElement.textContent = formatCurrency(convertedPrice, currentCurrency);
            priceElement.dataset.price = price; // Store original NPR price for easy access
        }
        
        // Setup colors first, then handle images
        await setupModalColors(productId);
        
        // Fast modal opening with smooth animation
        document.body.classList.add('modal-open');
        elements.productModal.style.display = 'flex';
        
        // Force reflow before adding show class for smooth animation
        requestAnimationFrame(() => {
            elements.productModal.classList.add('show');
        });
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
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            `;
            
            const mainImg = document.createElement('img');
            // Use lazy loading for modal images too
            const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmNWY1ZjUiLz48L3N2Zz4=';
            
            mainImg.src = placeholder;
            mainImg.alt = 'Product';
            mainImg.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 8px;
                transition: opacity 0.3s;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
            `;
            
            // Show loading state
            mainImg.classList.add('loading');
            
            // Preload the actual image
            const imgLoader = new Image();
            imgLoader.onload = () => {
                mainImg.src = primaryImage;
                mainImg.style.animation = 'none';
                mainImg.style.background = 'transparent';
                mainImg.classList.remove('loading');
            };
            imgLoader.onerror = () => {
                mainImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjhmOWZhIi8+CjxyZWN0IHg9Ijc1IiB5PSI3NSIgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNlOWVjZWYiIHN0cm9rZT0iI2RlZTJlNiIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iOCIvPgo8Y2lyY2xlIGN4PSIxMTAiIGN5PSIxMTAiIHI9IjE1IiBmaWxsPSIjYWRiNWJkIi8+CjxwYXRoIGQ9Ik03NSAyMDBMMTI1IDE1MEwxNzUgMTgwTDIyNSAxMzBMMjI1IDIyNUw3NSAyMjVaIiBmaWxsPSIjY2VkNGRhIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNmM3NTdkIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiPlByb2R1Y3QgSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
                mainImg.style.animation = 'none';
                mainImg.style.background = '#f8f9fa';
                mainImg.classList.remove('loading');
            };
            // Load immediately for fastest experience
            imgLoader.src = primaryImage;
            
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
            // Single image - use optimized fast loading
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'fast-modal-image-wrapper';
            
            const img = document.createElement('img');
            img.className = 'fast-modal-image loading';
            img.alt = 'Product';
            
            const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmNWY1ZjUiLz48L3N2Zz4=';
            img.src = placeholder;
            
            // Spinner
            const loader = document.createElement('div');
            loader.className = 'fast-modal-image-loader';
            loader.innerHTML = '<div class="fast-spinner"></div>';
            
            imageWrapper.appendChild(img);
            imageWrapper.appendChild(loader);
            modalImageContainer.appendChild(imageWrapper);
            
            // Load actual image
            const imgLoader = new Image();
            imgLoader.onload = () => {
                img.src = primaryImage;
                img.classList.remove('loading');
                // Update the main modal image reference
                elements.modalImg = img;
            };
            imgLoader.onerror = () => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjhmOWZhIi8+CjxyZWN0IHg9Ijc1IiB5PSI3NSIgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNlOWVjZWYiIHN0cm9rZT0iI2RlZTJlNiIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iOCIvPgo8Y2lyY2xlIGN4PSIxMTAiIGN5PSIxMTAiIHI9IjE1IiBmaWxsPSIjYWRiNWJkIi8+CjxwYXRoIGQ9Ik03NSAyMDBMMTI1IDE1MEwxNzUgMTgwTDIyNSAxMzBMMjI1IDIyNUw3NSAyMjVaIiBmaWxsPSIjY2VkNGRhIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNmM3NTdkIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiPlByb2R1Y3QgSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
                img.classList.remove('loading');
                elements.modalImg = img;
            };
            imgLoader.src = primaryImage;
        }
    };

    const closeModal = () => {
        if (!elements.productModal) return;
        
        // Clean up keyboard event listeners if they were added
        if (currentKeyboardHandler) {
            document.removeEventListener('keydown', currentKeyboardHandler);
            currentKeyboardHandler = null;
        }
        
        // Fast modal closing with smooth animation
        elements.productModal.classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            if (!elements.productModal.classList.contains('show')) {
                document.body.classList.remove('modal-open');
                elements.productModal.style.display = 'none';
            }
        }, 200);
    };

    const setupModalColors = async (productId) => {
        if (!elements.modalColorGroup || !elements.modalColorDropdownList || !elements.modalColorDropdownSelected) return;

        try {
            // Fetch colors for this product
            currentProductColors = await fetchProductColors(productId);
            
            if (currentProductColors.length > 0) {
                // Create dropdown options for product colors
                elements.modalColorDropdownList.innerHTML = currentProductColors.map(productColor => {
                    const color = productColor.colors;
                    return `
                        <div class="shadcn-dropdown-option" 
                             data-color-id="${color.id}"
                             data-product-color-id="${productColor.id}"
                             data-color="${color.hex_code || '#808080'}"
                             data-color-name="${color.name}"
                             data-is-default="${productColor.is_default || false}">
                            <span class="shadcn-dropdown-swatch" style="background:${color.hex_code || '#808080'};"></span>
                            <span>${color.name}${productColor.is_default ? ' (Default)' : ''}</span>
                        </div>
                    `;
                }).join('');
                
                // Find the default color or use the first one as fallback
                const defaultProductColor = currentProductColors.find(pc => pc.is_default) || currentProductColors[0];
                const defaultColor = defaultProductColor.colors;
                
                console.log('Setting modal to default color:', defaultColor.name, 'isDefault:', defaultProductColor.is_default);
                
                // Set the default color as selected
                setModalColor(defaultColor.hex_code || '#808080', defaultColor.name, defaultProductColor.id);
                elements.modalColorGroup.style.display = 'block';
                
                // Load images for the default color
                await updateModalImagesByColor(productId, defaultProductColor.id);
            } else {
                elements.modalColorGroup.style.display = 'none';
                // Load default images (without color association)
                await updateModalImagesByColor(productId, null);
            }
        } catch (error) {
            console.error('Error setting up modal colors:', error);
            elements.modalColorGroup.style.display = 'none';
        }
    };
    
    const setModalColor = (colorValue, colorName, productColorId) => {
        if (!elements.modalColorDropdownSelected || !elements.modalColorDropdownBtn) return;
        
        elements.modalColorDropdownSelected.innerHTML = `
            <span class="shadcn-dropdown-swatch" style="background:${colorValue};"></span>
            <span>${colorName}</span>`;
        elements.modalColorDropdownBtn.setAttribute('data-color', colorValue);
        elements.modalColorDropdownBtn.setAttribute('data-color-name', colorName);
        elements.modalColorDropdownBtn.setAttribute('data-product-color-id', productColorId);
    };

    const getModalColor = () => {
        const colorName = elements.modalColorDropdownBtn.getAttribute('data-color-name') || '';
        const productColorId = elements.modalColorDropdownBtn.getAttribute('data-product-color-id') || '';
        return { colorName, productColorId };
    };

    // Update modal images based on selected color
    async function updateModalImagesByColor(productId, productColorId) {
        try {
            const images = await fetchProductImagesByColor(productId, productColorId);
            
            if (images.length > 0) {
                const imageUrls = images.map(img => img.image_url);
                const primaryImage = imageUrls[0];
                
                // Update the modal image gallery
                setupModalImageGallery(primaryImage, imageUrls);
            } else {
                // Fallback to default product images if no color-specific images
                const defaultImages = await fetchProductImagesByColor(productId, null);
                if (defaultImages.length > 0) {
                    const imageUrls = defaultImages.map(img => img.image_url);
                    const primaryImage = imageUrls[0];
                    setupModalImageGallery(primaryImage, imageUrls);
                }
            }
        } catch (error) {
            console.error('Error updating modal images by color:', error);
        }
    }

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
    async function loadProducts(reset = true) {
        if (!elements.productsContainer) return;
        if (isLoading) return;

        isLoading = true;

        if (reset) {
            // Reset state
            allProducts = [];
            hasMoreProducts = false;
            elements.productsContainer.removeAttribute('style');
            elements.productsContainer.className = 'row sonar-portfolio';
            showSkeletonLoaders();
        }

        try {
            // Fetch ALL products at once
            let products, error, count;
            try {
                const response = await supabase
                    .from('products')
                    .select(`*, product_images (id, image_url, "order")`, { count: 'exact' })
                    .order('order', { ascending: true })
                    .order('order', { foreignTable: 'product_images', ascending: true });
                products = response.data;
                error = response.error;
                count = response.count;
            } catch (fullQueryError) {
                // Fallback: try simple query without product_images
                const simpleResponse = await supabase
                    .from('products')
                    .select('*', { count: 'exact' });
                products = simpleResponse.data;
                error = simpleResponse.error;
                count = simpleResponse.count;
                if (products && products.length > 0) {
                    products = products.map(product => ({ ...product, product_images: [] }));
                }
            }

            if (error) {
                console.error('Database error:', error);
                throw error;
            }

            allProducts = products || [];
            hasMoreProducts = false;
            await renderProducts(allProducts, true);
        } catch (error) {
            console.error('Error loading products:', error);
            if (reset) {
                let errorMessage = '⚠️ Error loading products. Please try again later.';
                if (error.message) {
                    errorMessage = `⚠️ ${error.message}`;
                }
                
                elements.productsContainer.innerHTML = `
                    <div class="container-fluid">
                        <div style="width: 100%; text-align: center; padding: 3em; color: #dc3545;">
                            <div style="font-size: 3em; margin-bottom: 1em;">🚫</div>
                            <h3 style="color: #dc3545; margin-bottom: 1em;">Loading Error</h3>
                            <p style="margin-bottom: 1.5em;">${errorMessage}</p>
                            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                                <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 500;">Retry</button>
                                <button onclick="console.log('Debug info:', { error: '${error.message}', timestamp: new Date().toISOString() })" style="background: #6c757d; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 500;">Debug Info</button>
                            </div>
                            <p style="margin-top: 1em; color: #6c757d; font-size: 0.9em;">Check the browser console for more details</p>
                        </div>
                    </div>
                `;
            }
        } finally {
            isLoading = false;
        }
    }

    const showSkeletonLoaders = () => {
        const skeletonCount = Math.min(productsPerPage, 8); // Show max 8 skeletons initially
        const skeletonHTML = Array(skeletonCount).fill(createSkeletonLoader()).join('');
        
        elements.productsContainer.innerHTML = `
            <div class="container-fluid">
                <div class="products-grid">
                    ${skeletonHTML}
                </div>
            </div>
        `;
    };

    async function renderProducts(products, reset = true) {
        if (!elements.productsContainer) return;
        if (!products || products.length === 0) {
            elements.productsContainer.innerHTML = `
                <div class="container-fluid">
                    <div style="width: 100%; text-align: center; padding: 3em;">
                        <div style="font-size: 3em; margin-bottom: 1em;">🛍️</div>
                        <h3 style="color: #666; margin-bottom: 0.5em;">No products available</h3>
                        <p style="color: #999;">Check back soon for new arrivals!</p>
                    </div>
                </div>
            `;
            return;
        }

        // Get current exchange rate once for all products
        const rate = await getExchangeRate(currentCurrency);

        // Preload first 24 images eagerly, rest lazy
        const productsHtml = products.map((product, idx) => {
            const sortedImages = product.product_images?.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
            const primaryImage = sortedImages[0]?.image_url || '';
            const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmNWY1ZjUiLz48L3N2Zz4=';
            // Use eager loading for first 24, lazy for rest
            const loadingAttr = idx < 24 ? 'eager' : 'lazy';
            return `
                <div class="single_gallery_item" data-product-id="${product.id}">
                    <a class="gallery-img" 
                       data-img="${primaryImage}" 
                       data-title="${product.name}" 
                       data-id="${product.id}" 
                       data-price="${product.price || '0'}"
                       data-description="${product.description || ''}"
                       data-images='${JSON.stringify(sortedImages)}'>
                        <div class="image-container">
                            <img src="${placeholder}"
                                 data-src="${primaryImage}"
                                 alt="${product.name}"
                                 class="lazy-loading product-image fade-in"
                                 loading="${loadingAttr}"
                                 decoding="async"
                                 style="transition: opacity 0.3s ease; height: 400px; width: 400px;">
                            <div class="image-overlay">
                                <span class="view-details">👁️ View Details</span>
                            </div>
                        </div>
                    </a>
                    <div class="gallery-content">
                        <h4 title="${product.name}">${product.name}</h4>
                        <p class="product-price" data-original-price="${product.price || 0}">${product.price ? formatCurrency(convertPrice(product.price, rate), currentCurrency) : 'Price not available'}</p>
                        <p class="product-description">
                            ${(product.description || '').substring(0, 80)}${(product.description || '').length > 80 ? '...' : ''}
                        </p>
                        <button class="add-to-cart-btn" 
                                data-img="${primaryImage}" 
                                data-title="${product.name}" 
                                data-id="${product.id}" 
                                data-price="${product.price || '0'}"
                                data-description="${product.description || ''}"
                                data-images='${JSON.stringify(sortedImages)}'>
                            🛒 Add to Cart
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // --- DOM diffing for seamless image experience ---
        let productsGrid = elements.productsContainer.querySelector('.products-grid');
        if (reset || !productsGrid) {
            // On reset, clear grid but do not recreate the grid element if it exists
            if (productsGrid) {
                productsGrid.innerHTML = productsHtml;
            } else {
                elements.productsContainer.innerHTML = `
                    <div class="container-fluid">
                        <div class="products-grid">${productsHtml}</div>
                    </div>
                `;
            }
        } else {
            // Infinite scroll: only append new cards, do not replace grid
            productsGrid.insertAdjacentHTML('beforeend', productsHtml);
        }

        // Initialize lazy loading for new images
        await initializeLazyLoading();

        // Lookahead preloading: preload next 6 images after visible area
        setTimeout(() => {
            const lazyImgs = Array.from(document.querySelectorAll('img.lazy-loading'));
            const preloadCount = 6;
            let lastVisibleIdx = -1;
            lazyImgs.forEach((img, idx) => {
                const rect = img.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    lastVisibleIdx = idx;
                }
            });
            for (let i = lastVisibleIdx + 1; i <= lastVisibleIdx + preloadCount && i < lazyImgs.length; i++) {
                const img = lazyImgs[i];
                if (img && img.dataset.src && !img.src.includes(img.dataset.src)) {
                    const preloader = new window.Image();
                    preloader.src = img.dataset.src;
                }
            }
        }, 300);

        // No load more observer
        if (reset) {
            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, 0);
            document.documentElement.style.scrollBehavior = 'smooth';
        }
    }

    const initializeLazyLoading = async () => {
        // Initialize image observer if not already created
        if (!imageObserver) {
            imageObserver = createImageObserver();
        }

        // Observe all lazy loading images
        const lazyImages = document.querySelectorAll('img.lazy-loading');
        lazyImages.forEach(img => {
            observeImage(img);
        });

        // Preload images on hover for faster modal opening
        const productItems = document.querySelectorAll('.single_gallery_item');
        productItems.forEach(item => {
            let isPreloaded = false;
            
            const preloadImage = () => {
                if (isPreloaded) return;
                isPreloaded = true;
                
                const galleryImg = item.querySelector('.gallery-img');
                if (galleryImg) {
                    const imgSrc = galleryImg.dataset.img;
                    if (imgSrc) {
                        const preloader = new Image();
                        preloader.src = imgSrc;
                    }
                }
            };

            // Preload on hover with a small delay to avoid unnecessary loads
            item.addEventListener('mouseenter', () => {
                setTimeout(preloadImage, 200);
            });

            // Also preload on focus for keyboard navigation
            item.addEventListener('focus', preloadImage, { once: true });
        });
    };

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
                
                // Handle case where click is on cart button directly (quick add to cart)
                if (cartBtn && !galleryImg) {
                    const price = el.dataset.price || '0';
                    const productImages = el.dataset.images ? JSON.parse(el.dataset.images) : [];
                    
                    const cartItem = {
                        id: el.dataset.id,
                        title: el.dataset.title,
                        qty: 1,
                        color: '',
                        price: price,
                        product_images: productImages
                    };
                    
                    addToCart(cartItem);
                    return;
                }
                
                openModal(el.dataset.img, el.dataset.title, el.dataset.id, imageUrls);
            }
        });

        // Modal Controls
        elements.productModal.querySelector('.modal-close').addEventListener('click', closeModal);
        elements.productModal.addEventListener('click', (e) => { 
            if (e.target === elements.productModal || e.target.classList.contains('fast-modal-backdrop')) {
                closeModal(); 
            }
        });

        // Quantity Controls (updated for fast modal)
        const qtyButtons = elements.productModal.querySelectorAll('.fast-qty-btn, .modal-qty-btn');
        qtyButtons.forEach(button => {
            button.addEventListener('click', () => {
                const input = elements.modalQtyInput;
                const currentValue = parseInt(input.value, 10) || 1;
                if (button.classList.contains('fast-qty-plus') || button.textContent === '+' || button.textContent === '➕') {
                    input.value = currentValue + 1;
                } else if ((button.classList.contains('fast-qty-minus') || button.textContent === '-' || button.textContent === '➖' || button.textContent === '−') && currentValue > 1) {
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
            
            // Get price from the product element or modal
            let price = productElement?.dataset.price || '0';
            const priceElement = elements.productModal.querySelector('.modal-product-price');
            if ((!price || price === '0') && priceElement?.dataset.price) {
                price = priceElement.dataset.price;
            }
            
            const cartItem = {
                id: productId,
                title: elements.modalTitle.textContent,
                qty: parseInt(elements.modalQtyInput.value, 10) || 1,
                color: getModalColor().colorName, // Use colorName from getModalColor
                price: price,
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
            
            // Get price from the product element or modal
            let price = productElement?.dataset.price || '0';
            const priceElement = elements.productModal.querySelector('.modal-product-price');
            if ((!price || price === '0') && priceElement?.dataset.price) {
                price = priceElement.dataset.price;
            }
            
            const cartItem = {
                id: productId,
                title: elements.modalTitle.textContent,
                qty: parseInt(elements.modalQtyInput.value, 10) || 1,
                color: getModalColor().colorName, // Use colorName from getModalColor
                price: price,
                product_images: productImages
            };
            
            addToCart(cartItem);
            closeModal();
            showCartModal();
            updateOrderSummary();
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
                setModalColor(option.dataset.color, option.dataset.colorName, option.dataset.productColorId);
                elements.modalColorDropdownList.style.display = 'none';
                // Update modal images based on selected color
                const productId = elements.productModal.dataset.productId;
                updateModalImagesByColor(productId, option.dataset.productColorId);
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
                updateOrderSummary();
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

        // Currency Selector
        const currencySelector = document.getElementById('currencySelector');
        if (currencySelector) {
            currencySelector.addEventListener('change', async (e) => {
                currentCurrency = e.target.value;
                localStorage.setItem('selectedCurrency', currentCurrency);
                
                // Update all prices on the page
                await updateAllPrices();
            });
        }

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
        // This section is now handled by update3DModelColors and updateModalImagesByColor
        // document.querySelectorAll('#colorSwatchContainer2 .color-swatch').forEach(swatch => {
        //     swatch.addEventListener('click', function () {
        //         const rgb = this.getAttribute('data-color');
        //                 applyMaterialChanges(elements.modelViewer2, rgb);
        //         document.querySelectorAll('#colorSwatchContainer2 .color-swatch.active').forEach(el => el.classList.remove('active'));
        //         this.classList.add('active');
        //     });
        // });

        if (elements.modelViewer2) {
            elements.modelViewer2.addEventListener("load", () => {
                // update3DModelColors(); // This will be called by openModal
            });
        }
    }

    // --- INITIALIZATION ---
    // Create image observer for lazy loading
    imageObserver = createImageObserver();
    
    // Initialize currency system
    initializeCurrency();
    
    // Initialize 3D model colors from database
    update3DModelColors();
    
    // Load products with lazy loading
    loadProducts();
    loadCart();
    initEventListeners();
});