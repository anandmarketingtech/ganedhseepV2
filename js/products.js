import { supabase } from './supabase-config.js';

// Function to load products
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

        const productsContainer = document.querySelector('.products');
        if (!productsContainer) return;

        if (!products || products.length === 0) {
            productsContainer.innerHTML = '<p>No products available at the moment.</p>';
            return;
        }

        // Generate HTML for products
        const html = products.map(product => `
            <div class="product">
                <img src="${product.image_url}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                ${product.product_tags && product.product_tags.length > 0 ? `
                    <div class="tags">
                        ${product.product_tags.map(pt => `
                            <span>${pt.tags.name}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');

        productsContainer.innerHTML = html;

    } catch (error) {
        console.error('Error loading products:', error);
        const productsContainer = document.querySelector('.products');
        if (productsContainer) {
            productsContainer.innerHTML = '<p>Error loading products. Please try again later.</p>';
        }
    }
}

// Load products when the page loads
document.addEventListener('DOMContentLoaded', loadProducts); 