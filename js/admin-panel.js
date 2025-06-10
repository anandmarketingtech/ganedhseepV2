import { supabase } from './supabase-config.js';

let currentTags = [];
const tagInput = document.getElementById('tagInput');
const tagsContainer = document.getElementById('tagsContainer');

if (tagInput) {
    tagInput.addEventListener('keydown', async function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tagName = tagInput.value.trim();
            if (tagName && !currentTags.some(t => t.name === tagName)) {
                // Check if tag exists, if not create it
                let { data: existingTag } = await supabase
                    .from('tags')
                    .select('id, name')
                    .eq('name', tagName)
                    .single();
                if (!existingTag) {
                    const { data: newTag } = await supabase
                        .from('tags')
                        .insert([{ name: tagName }])
                        .select()
                        .single();
                    currentTags.push(newTag);
                } else {
                    currentTags.push(existingTag);
                }
                updateTagsDisplay();
            }
            tagInput.value = '';
        }
    });
}

function updateTagsDisplay() {
    tagsContainer.innerHTML = currentTags.map(tag => `
        <div class="tag">
            ${tag.name}
            <button type="button" onclick="window.removeTag('${tag.id}')">&times;</button>
        </div>
    `).join('');
}

window.removeTag = function(tagId) {
    currentTags = currentTags.filter(t => t.id !== tagId);
    updateTagsDisplay();
};

// Load products
async function loadProducts() {
    const { data: products, error } = await supabase
        .from('products')
        .select(`*, product_tags ( tags ( id, name ) )`)
        .order('created_at', { ascending: false });
    const productList = document.getElementById('productList');
    productList.innerHTML = '';
    if (error || !products) {
        productList.innerHTML = '<p style="text-align:center; padding:50px;">Error loading products.</p>';
        return;
    }
    if (products.length === 0) {
        productList.innerHTML = '<p style="text-align:center; padding:50px;">No products found.</p>';
        return;
    }
    products.forEach(product => {
        const statusClass = product.status === 'new-arrival' ? 'status-new' : product.status === 'out-of-stock' ? 'status-out-of-stock' : '';
        const productCard = `
            <div class="product-card">
                ${product.status ? `<span class="status-badge ${statusClass}">${product.status.replace('-', ' ')}</span>` : ''}
                <img src="${product.image_url}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <div class="product-tags">
                    ${(product.product_tags || []).map(pt => `<span class="product-tag">${pt.tags.name}</span>`).join('')}
                </div>
                <button class="btn btn-edit" onclick="window.editProduct('${product.id}')">Edit</button>
                <button class="btn btn-danger" onclick="window.deleteProduct('${product.id}')">Delete</button>
            </div>
        `;
        productList.innerHTML += productCard;
    });
}

// Handle form submission
if (document.getElementById('productForm')) {
    document.getElementById('productForm').addEventListener('submit', async function(event) {
        event.preventDefault();
        let productId = document.getElementById('productId').value;
        const product = {
            name: document.getElementById('name').value,
            category: document.getElementById('category').value,
            image_url: document.getElementById('image').value,
            description: document.getElementById('description').value,
            status: document.getElementById('status').value
        };
        try {
            if (productId) {
                // Update existing product
                const { error } = await supabase
                    .from('products')
                    .update(product)
                    .eq('id', productId);
                if (error) throw error;
                // Update tags
                await supabase
                    .from('product_tags')
                    .delete()
                    .eq('product_id', productId);
            } else {
                // Add new product
                const { data, error } = await supabase
                    .from('products')
                    .insert([product])
                    .select()
                    .single();
                if (error) throw error;
                productId = data.id;
            }
            // Add tags
            if (currentTags.length > 0) {
                const { error } = await supabase
                    .from('product_tags')
                    .insert(
                        currentTags.map(tag => ({
                            product_id: productId,
                            tag_id: tag.id
                        }))
                    );
                if (error) throw error;
            }
            document.getElementById('productForm').reset();
            document.getElementById('productId').value = '';
            currentTags = [];
            updateTagsDisplay();
            loadProducts();
        } catch (error) {
            alert('Error saving product: ' + (error.message || error));
        }
    });
}

// Edit product
window.editProduct = async function(id) {
    const { data: product, error } = await supabase
        .from('products')
        .select(`*, product_tags ( tags ( id, name ) )`)
        .eq('id', id)
        .single();
    if (error) {
        alert('Error loading product.');
        return;
    }
    document.getElementById('productId').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('category').value = product.category;
    document.getElementById('image').value = product.image_url;
    document.getElementById('description').value = product.description;
    document.getElementById('status').value = product.status || 'in-stock';
    currentTags = (product.product_tags || []).map(pt => pt.tags);
    updateTagsDisplay();
};

// Delete product
window.deleteProduct = async function(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        if (error) {
            alert('Error deleting product.');
        } else {
            loadProducts();
        }
    }
};

// Initial load
if (document.getElementById('productList')) {
    loadProducts();
} 