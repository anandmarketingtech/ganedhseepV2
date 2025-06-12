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
            elements.cartItemsDiv.innerHTML = cart.map((item, idx) => `
                <div class="cart-item" data-idx="${idx}">
                    <img src="${item.img}" alt="${item.title}">
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
            `).join('');
            elements.cartBuyNowBtn.disabled = false;
        }
    };

    const removeFromCart = (idx) => {
        cart.splice(idx, 1);
        updateCartUI();
        saveCart();
    };

    // --- MODAL LOGIC ---
    const openModal = (imgSrc, title, productId) => {
        if (!elements.productModal) return;

        elements.productModal.dataset.productId = productId;
        elements.modalImg.src = imgSrc;
        elements.modalTitle.textContent = title;
        elements.modalQtyInput.value = 1;
        
        setupModalColors();
        
        document.body.classList.add('modal-open');
        elements.productModal.style.display = 'flex';
    };

    const closeModal = () => {
        if (!elements.productModal) return;
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
                .select('*')
                .order('order', { ascending: true });
            if (error) throw error;

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

        const productsHtml = products.map(product => `
            <div class="single_gallery_item">
                <a class="gallery-img" data-img="${product.image_url}" data-title="${product.name}" data-id="${product.id}">
                    <img src="${product.image_url}" alt="${product.name}" loading="lazy">
                </a>
                <div class="gallery-content">
                    <h4>${product.name}</h4>
                    <button class="add-to-cart-btn" data-img="${product.image_url}" data-title="${product.name}" data-id="${product.id}">
                        Add to Cart
                    </button>
                </div>
            </div>
        `).join('');

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
                openModal(el.dataset.img, el.dataset.title, el.dataset.id);
            }
        });

        // Modal Controls
        elements.productModal.querySelector('.modal-close').addEventListener('click', closeModal);
        elements.productModal.addEventListener('click', (e) => { if (e.target === elements.productModal) closeModal(); });

        elements.productModal.querySelector('.modal-add-to-cart').addEventListener('click', () => {
            addToCart({
                id: elements.productModal.dataset.productId,
                title: elements.modalTitle.textContent,
                img: elements.modalImg.src,
                qty: parseInt(elements.modalQtyInput.value, 10) || 1,
                color: getModalColor()
            });
            closeModal();
        });

        elements.productModal.querySelector('.modal-buy-now').addEventListener('click', () => {
            addToCart({
                id: elements.productModal.dataset.productId,
                title: elements.modalTitle.textContent,
                img: elements.modalImg.src,
                qty: parseInt(elements.modalQtyInput.value, 10) || 1,
                color: getModalColor()
            });
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

                // All successful
                alert("Thank you! Your order has been submitted. We will contact you shortly.");
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