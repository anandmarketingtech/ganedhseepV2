import { supabase } from './supabase-config.js';
import { enforceAuth } from './auth-check.js';

let currentTags = [];
const tagInput = document.getElementById('tagInput');
const tagsContainer = document.getElementById('tagsContainer');

// First enforce authentication
(async function init() {
    const isAuthenticated = await enforceAuth();
    if (!isAuthenticated) return;

    // Initialize the panel only after authentication is confirmed
    initializePanel();
})();

function initializePanel() {
    // Add drag and drop styles
    const style = document.createElement('style');
    style.textContent = `
        .product-card {
            cursor: move;
            position: relative;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .product-card.dragging {
            opacity: 0.5;
            transform: scale(1.02);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .product-card .order-number {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .save-order-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            display: none;
            z-index: 1000;
        }
        .save-order-btn.visible {
            display: block;
        }
        .save-order-btn:hover {
            background: #45a049;
        }
    `;
    document.head.appendChild(style);

    // Add save button to the DOM
    const saveButton = document.createElement('button');
    saveButton.className = 'save-order-btn';
    saveButton.textContent = 'Save Order';
    document.body.appendChild(saveButton);

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
            .order('order', { ascending: true });
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

        // Initialize order numbers if they don't exist
        const needsOrderInit = products.some(p => p.order === null);
        if (needsOrderInit) {
            const updates = products.map((product, index) => ({
                id: product.id,
                order: index + 1
            }));
            await supabase.from('products').upsert(updates);
            // Reload products after initialization
            return loadProducts();
        }

        products.forEach((product, index) => {
            const statusClass = product.status === 'new-arrival' ? 'status-new' : product.status === 'out-of-stock' ? 'status-out-of-stock' : '';
            const productCard = `
                <div class="product-card" draggable="true" data-id="${product.id}" data-order="${product.order}">
                    <span class="order-number">Order: ${product.order}</span>
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

        // Initialize drag and drop
        initializeDragAndDrop();
    }

    function initializeDragAndDrop() {
        const productList = document.getElementById('productList');
        const cards = productList.getElementsByClassName('product-card');
        const saveButton = document.querySelector('.save-order-btn');
        let hasChanges = false;
        
        Array.from(cards).forEach(card => {
            card.addEventListener('dragstart', e => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.id);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                hasChanges = true;
                saveButton.classList.add('visible');
            });
        });

        productList.addEventListener('dragover', e => {
            e.preventDefault();
            const draggingCard = document.querySelector('.dragging');
            const cards = [...productList.getElementsByClassName('product-card')];
            const afterCard = cards.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = e.clientY - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;

            if (afterCard) {
                productList.insertBefore(draggingCard, afterCard);
            } else {
                productList.appendChild(draggingCard);
            }
        });

        productList.addEventListener('drop', e => {
            e.preventDefault();
            const cards = [...productList.getElementsByClassName('product-card')];
            
            // Update the display order numbers
            cards.forEach((card, index) => {
                card.dataset.order = index + 1;
                card.querySelector('.order-number').textContent = `Order: ${index + 1}`;
            });
        });

        // Save button click handler
        saveButton.addEventListener('click', async () => {
            const cards = [...productList.getElementsByClassName('product-card')];
            const updates = cards.map((card, index) => ({
                id: card.dataset.id,
                order: index + 1
            }));

            try {
                // Get all products first
                const { data: products } = await supabase
                    .from('products')
                    .select('*');

                // First, update all orders to temporary negative values
                const tempUpdates = products.map(product => ({
                    ...product,
                    order: -(product.order) // Use negative values to avoid conflicts
                }));

                await supabase
                    .from('products')
                    .upsert(tempUpdates);

                // Then update to final values
                const finalUpdates = updates.map(update => {
                    const product = products.find(p => p.id === update.id);
                    return {
                        ...product,
                        order: update.order
                    };
                });

                const { error } = await supabase
                    .from('products')
                    .upsert(finalUpdates);

                if (error) throw error;

                hasChanges = false;
                saveButton.classList.remove('visible');
                alert('Order saved successfully!');
            } catch (error) {
                console.error('Error saving order:', error);
                alert('Failed to save order. Please try again.');
                // Reload to ensure consistent state
                loadProducts();
            }
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
                    // Get the highest order number
                    const { data: lastProduct } = await supabase
                        .from('products')
                        .select('order')
                        .order('order', { ascending: false })
                        .limit(1)
                        .single();
                    
                    // Add new product with next order number
                    product.order = (lastProduct?.order || 0) + 1;
                    
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
            try {
                // Get the order of the deleted product
                const { data: deletedProduct } = await supabase
                    .from('products')
                    .select('order')
                    .eq('id', id)
                    .single();

                // Delete the product
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;

                // Update order numbers for remaining products
                if (deletedProduct) {
                    const { data: remainingProducts } = await supabase
                        .from('products')
                        .select('id, order')
                        .gt('order', deletedProduct.order)
                        .order('order', { ascending: true });

                    if (remainingProducts && remainingProducts.length > 0) {
                        const updates = remainingProducts.map(product => ({
                            id: product.id,
                            order: product.order - 1
                        }));

                        await supabase
                            .from('products')
                            .upsert(updates);
                    }
                }

                loadProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
                alert('Error deleting product. Please try again.');
            }
        }
    };

    // Initial load
    if (document.getElementById('productList')) {
        loadProducts();
    }
} 