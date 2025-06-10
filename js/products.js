import { supabase } from './supabase-config.js';

// Function to open modal
function openModal(imgSrc, title, showColorGroup = false) {
    console.log('Opening modal with:', { imgSrc, title, showColorGroup });
    const modal = document.getElementById('productModal');
    if (!modal) {
        console.error('Modal element not found');
        return;
    }

    // Set modal content
    const modalImg = modal.querySelector('.modal-product-img');
    const modalTitle = modal.querySelector('.modal-product-title');
    const colorGroup = modal.querySelector('#modal-color-group');
    const colorDropdownList = modal.querySelector('#modal-color-dropdown-list');
    const colorDropdownSelected = modal.querySelector('#modal-color-dropdown-selected');

    if (modalImg) modalImg.src = imgSrc;
    if (modalTitle) modalTitle.textContent = title;
    
    // Handle color options
    if (colorGroup && colorDropdownList) {
        // Sample colors - you can replace these with your actual colors
        const colors = ['Black', 'White', 'Navy', 'Gray', 'Beige'];
        
        // Clear existing options
        colorDropdownList.innerHTML = '';
        
        // Add color options
        colors.forEach(color => {
            const colorOption = document.createElement('div');
            colorOption.className = 'shadcn-dropdown-item';
            colorOption.textContent = color;
            colorOption.style.padding = '8px 12px';
            colorOption.style.cursor = 'pointer';
            colorOption.style.transition = 'background-color 0.2s';
            
            colorOption.addEventListener('mouseover', () => {
                colorOption.style.backgroundColor = '#f5f5f5';
            });
            
            colorOption.addEventListener('mouseout', () => {
                colorOption.style.backgroundColor = 'transparent';
            });
            
            colorOption.addEventListener('click', () => {
                colorDropdownSelected.textContent = color;
                colorDropdownList.style.display = 'none';
            });
            
            colorDropdownList.appendChild(colorOption);
        });

        // Set default selected color
        if (colorDropdownSelected) {
            colorDropdownSelected.textContent = colors[0];
        }

        // Show/hide color group
        colorGroup.style.display = showColorGroup ? 'block' : 'none';
    }

    // Show modal
    modal.style.display = 'flex';
    console.log('Modal displayed');
}

// Function to close modal
function closeModal() {
    console.log('Closing modal');
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Function to render products
function renderProducts(products) {
    const productsContainer = document.querySelector('.sonar-portfolio');
    if (!productsContainer) return;
    
    if (!products || products.length === 0) {
        productsContainer.innerHTML = '<p>No products available at the moment.</p>';
        return;
    }

    const html = products.map(product => `
        <div class="single_gallery_item">
            <div class="gallery-img" data-img="${product.image_url}" data-title="${product.name}">
                <img src="${product.image_url}" alt="${product.name}">
            </div>
            <div class="gallery-content">
                <h4>${product.name}</h4>
                <button class="add-to-cart-btn" data-img="${product.image_url}" data-title="${product.name}">
                    Add to Cart
                </button>
            </div>
        </div>
    `).join('');

    productsContainer.innerHTML = `
        <div class="products">
            ${html}
        </div>
    `;

    // Reattach event listeners to new elements
    attachEventListeners();
}

// Function to attach event listeners
function attachEventListeners() {
    console.log('Attaching event listeners');
    
    // Gallery image click
    document.querySelectorAll('.gallery-img').forEach(galleryImg => {
        galleryImg.addEventListener('click', function(e) {
            console.log('Gallery image clicked');
            e.preventDefault();
            const imgSrc = this.dataset.img;
            const productTitle = this.dataset.title;
            openModal(imgSrc, productTitle, true);
        });
    });

    // Add to cart button click
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            console.log('Add to cart button clicked');
            e.preventDefault();
            e.stopPropagation();
            const imgSrc = this.dataset.img;
            const productTitle = this.dataset.title;
            openModal(imgSrc, productTitle, true);
        });
    });

    // Close modal when clicking the close button
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Color dropdown functionality
    const colorDropdownBtn = document.querySelector('#modal-color-dropdown-btn');
    const colorDropdownList = document.querySelector('#modal-color-dropdown-list');
    
    if (colorDropdownBtn && colorDropdownList) {
        colorDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            colorDropdownList.style.display = colorDropdownList.style.display === 'none' ? 'block' : 'none';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!colorDropdownBtn.contains(e.target) && !colorDropdownList.contains(e.target)) {
                colorDropdownList.style.display = 'none';
            }
        });
    }
}

// Function to load products from Supabase
async function loadProducts() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                product_tags (
                    tags (
                        id,
                        name
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        const productsContainer = document.querySelector('.sonar-portfolio');
        if (productsContainer) {
            productsContainer.innerHTML = '<p>Error loading products. Please try again later.</p>';
        }
    }
}

// Load products when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing products');
    loadProducts();
}); 