import { supabase, supabaseUrl, supabaseKey } from './supabase-config.js';
import { enforceAuth } from './auth-check.js';

// Global variables for image management
let managedImageFiles = []; // Array to hold all images with their order
let sortableInstance = null;
let productsSortableInstance = null;

// Color management
let allColors = [];
let selectedProductColors = []; // Array of selected color IDs for the product

// First enforce authentication
(async function init() {
    const isAuthenticated = await enforceAuth();
    if (!isAuthenticated) return;

    document.getElementById('loading').style.display = 'none';
    document.getElementById('protectedContent').style.display = 'block';

    // Initialize the admin panel
    initializeAdminPanel();
})();

function initializeAdminPanel() {
    const productForm = document.getElementById('productForm');
    const imageInput = document.getElementById('image');
    const uploadContainer = document.querySelector('.image-upload-container');
    
    // Image upload handlers
    setupImageUpload();
    
    // Initialize color system
    initializeColorSelection();
    
    // Form submission - remove auto-submit, only validate
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Just validate the form, don't submit
        if (validateForm()) {
            alert('Form is valid! Click "Save Product" to save.');
        }
    });
    
    // Load existing products
    loadProducts();
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'admin-login.html';
    });
}

async function validateForm() {
    const name = document.getElementById('name').value.trim();
    const description = document.getElementById('description').value.trim();
    const category = document.getElementById('category').value;
    const status = document.getElementById('status').value;
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      console.error('Not authenticated:', error);
      return;
    }
    
    console.log('User is:', data.user);
    
    // Proceed to upload
    const uploadResult = await supabase.storage
      .from('products')
      .upload(`product_${Date.now()}.jpg`, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    console.log(uploadResult);
    
    if (!name) {
        alert('Please enter a product name');
        return false;
    }
    if (!description) {
        alert('Please enter a description');
        return false;
    }
    if (!category) {
        alert('Please select a category');
        return false;
    }
    if (!status) {
        alert('Please select a status');
        return false;
    }
    
    return true;
}

// --- COLOR MANAGEMENT FUNCTIONS ---

async function initializeColorSelection() {
    try {
        // Fetch all colors from database
        const { data: colors, error } = await supabase
            .from('colors')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        allColors = colors || [];
        renderColorSelection();
    } catch (error) {
        console.error('Error fetching colors:', error);
        // You might want to show an error message to the user
    }
}

function renderColorSelection() {
    // Find or create color selection container in the form
    let colorContainer = document.getElementById('colorSelectionContainer');
    if (!colorContainer) {
        // Create color selection section in the form
        const formContainer = document.querySelector('.product-form');
        const statusGroup = document.querySelector('#status').closest('.form-group');
        
        colorContainer = document.createElement('div');
        colorContainer.id = 'colorSelectionContainer';
        colorContainer.className = 'form-group';
        colorContainer.innerHTML = `
            <label>Available Colors</label>
            <p style="font-size: 0.9em; color: #666; margin: 5px 0;">
                <strong>Step 1:</strong> Select colors that will be available for this product. 
                <br><strong>Step 2:</strong> Upload images and assign each image to a specific color.
            </p>
            <div id="colorGrid" class="color-grid"></div>
            <button type="button" id="addNewColorBtn" class="btn" style="background: #28a745; color: white; margin-top: 10px;">
                Add New Color
            </button>
        `;
        
        // Insert before status group
        statusGroup.parentNode.insertBefore(colorContainer, statusGroup);
    }
    
    const colorGrid = document.getElementById('colorGrid');
    
    if (allColors.length === 0) {
        colorGrid.innerHTML = '<p>No colors available. Add colors first.</p>';
        return;
    }
    
    colorGrid.innerHTML = allColors.map(color => `
        <div class="color-option" data-color-id="${color.id}">
            <input type="checkbox" id="color_${color.id}" value="${color.id}" 
                   ${selectedProductColors.includes(color.id) ? 'checked' : ''}>
            <label for="color_${color.id}" class="color-label">
                <span class="color-swatch" style="background-color: ${color.hex_code || '#808080'};"></span>
                <span class="color-name">${color.name}</span>
            </label>
        </div>
    `).join('');
    
    // Add change listeners
    colorGrid.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedColors);
    });
    
    // Add new color button handler
    const addColorBtn = document.getElementById('addNewColorBtn');
    if (addColorBtn) {
        addColorBtn.addEventListener('click', showAddColorModal);
    }
}

function updateSelectedColors() {
    const checkboxes = document.querySelectorAll('#colorGrid input[type="checkbox"]:checked');
    const previousCount = selectedProductColors.length;
    selectedProductColors = Array.from(checkboxes).map(cb => cb.value);
    console.log('Selected colors:', selectedProductColors);
    
    // Show helpful message if colors were just selected for the first time
    if (previousCount === 0 && selectedProductColors.length > 0) {
        showColorSelectionMessage();
    }
    
    // Update image preview to refresh color dropdowns
    updateImagePreview();
}

function showColorSelectionMessage() {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d4edda;
        color: #155724;
        padding: 12px 16px;
        border-radius: 8px;
        border: 1px solid #c3e6cb;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 0.9rem;
        max-width: 300px;
    `;
    notification.innerHTML = `
        <strong>Great!</strong> Now you can upload images and assign them to specific colors.
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.transition = 'opacity 0.3s';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 4000);
}

function showAddColorModal() {
    const colorName = prompt('Enter color name:');
    if (!colorName) return;
    
    const hexCode = prompt('Enter hex code (e.g., #FF0000):');
    if (!hexCode) return;
    
    // Validate hex code
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexPattern.test(hexCode)) {
        alert('Invalid hex code format. Please use format like #FF0000');
        return;
    }
    
    addNewColor(colorName, hexCode);
}

async function addNewColor(name, hexCode) {
    try {
        const { data, error } = await supabase
            .from('colors')
            .insert([{ name, hex_code: hexCode }])
            .select()
            .single();
        
        if (error) throw error;
        
        // Add to local array and re-render
        allColors.push(data);
        renderColorSelection();
        
        alert('Color added successfully!');
    } catch (error) {
        console.error('Error adding color:', error);
        alert('Error adding color: ' + error.message);
    }
}

function setupImageUpload() {
    const imageInput = document.getElementById('image');
    const uploadContainer = document.querySelector('.image-upload-container');
    
    // Remove any existing event listeners by cloning elements
    const newImageInput = imageInput.cloneNode(true);
    const newUploadContainer = uploadContainer.cloneNode(true);
    
    imageInput.parentNode.replaceChild(newImageInput, imageInput);
    uploadContainer.parentNode.replaceChild(newUploadContainer, uploadContainer);
    
    // File input change handler
    newImageInput.addEventListener('change', handleImageFiles);
    
    // Drag and drop handlers
    newUploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        newUploadContainer.classList.add('dragover');
    });
    
    newUploadContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only remove dragover if we're leaving the container itself, not a child
        if (!newUploadContainer.contains(e.relatedTarget)) {
            newUploadContainer.classList.remove('dragover');
        }
    });
    
    newUploadContainer.addEventListener('drop', (e) => {
                e.preventDefault();
        e.stopPropagation();
        newUploadContainer.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        addFilesToManaged(files);
    });
    
    // Click to upload - only on the text area, not the whole container
    const uploadHint = newUploadContainer.querySelector('.upload-hint');
    if (uploadHint) {
        uploadHint.addEventListener('click', (e) => {
            e.stopPropagation();
            newImageInput.click();
        });
    }
}

function handleImageFiles(event) {
    // Clear the input value to allow re-selecting the same files
    const files = Array.from(event.target.files);
    addFilesToManaged(files);
    // Clear the input so the same files can be selected again
    event.target.value = '';
}

function addFilesToManaged(files) {
    const validFiles = files.filter(file => {
        const isValid = file.type.startsWith('image/');
        if (!isValid) {
            console.warn('Skipping non-image file:', file.name);
        }
        return isValid;
    });
    
    if (validFiles.length === 0) {
            return;
        }

    const newImages = validFiles.map((file, index) => ({
        id: 'new_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substr(2, 9),
        file: file,
        image_url: URL.createObjectURL(file),
        order: managedImageFiles.length + index,
        isNew: true,
        assignedColorId: null // No color assigned initially
    }));
    
    managedImageFiles.push(...newImages);
    updateImagePreview();
}

function updateImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    
    // Destroy existing sortable if it exists
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
    
    // Clear existing content
    imagePreview.innerHTML = '';
    
    // Add images to preview
    managedImageFiles.forEach((imageData, index) => {
        const imageItem = createImagePreviewItem(imageData, index);
        imagePreview.appendChild(imageItem);
    });
    
    // Initialize Sortable if there are images
    if (managedImageFiles.length > 0) {
        sortableInstance = new Sortable(imagePreview, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            forceFallback: false,
            fallbackOnBody: true,
            swapThreshold: 0.65,
            onEnd: function(evt) {
                // Reorder the managedImageFiles array based on new positions
                const movedItem = managedImageFiles.splice(evt.oldIndex, 1)[0];
                managedImageFiles.splice(evt.newIndex, 0, movedItem);
                
                // Update order values
                managedImageFiles.forEach((img, index) => {
                    img.order = index;
                });
                
                // Update the display order numbers
                updateOrderNumbers();
            }
        });
    }
}

function createImagePreviewItem(imageData, index) {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-preview-item';
    imageItem.setAttribute('data-id', imageData.id);
    
    // Create color options for dropdown
    const hasSelectedColors = selectedProductColors.length > 0;
    const colorOptions = [
        '<option value="">General (No Color)</option>',
        ...selectedProductColors.map(colorId => {
            const color = allColors.find(c => c.id === colorId);
            const isSelected = imageData.assignedColorId === colorId ? 'selected' : '';
            return `<option value="${colorId}" ${isSelected}>${color ? color.name : 'Unknown Color'}</option>`;
        })
    ].join('');
    
    // Get assigned color name for display
    let assignedColorName = 'General';
    if (imageData.assignedColorId) {
        const assignedColor = allColors.find(c => c.id === imageData.assignedColorId);
        assignedColorName = assignedColor ? assignedColor.name : `Unknown Color (ID: ${imageData.assignedColorId})`;
        console.log(`Image ${imageData.id} restored with color: ${assignedColorName}`);
    }
    
    imageItem.innerHTML = `
        <div class="image-order">${index + 1}</div>
        <img src="${imageData.image_url}" alt="Preview" draggable="false">
        <div class="image-color-selector">
            <label class="color-selector-label">Color:</label>
            ${hasSelectedColors ? `
                <select class="image-color-dropdown" data-image-id="${imageData.id}">
                    ${colorOptions}
                </select>
            ` : `
                <div class="no-colors-message">
                    <small>Select product colors first</small>
                    <span class="assigned-color">General</span>
                </div>
            `}
        </div>
        <div class="image-info ${imageData.isNew ? 'new' : 'existing'}">
            <span class="status-text">${imageData.isNew ? 'New' : 'Existing'}</span>
            <span class="assigned-color-badge" style="background-color: ${getColorBadgeColor(imageData.assignedColorId)}">${assignedColorName}</span>
        </div>
        <button type="button" class="remove-image" data-image-id="${imageData.id}">×</button>
    `;
    
    // Add click handler for remove button
    const removeBtn = imageItem.querySelector('.remove-image');
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const imageId = e.target.getAttribute('data-image-id');
        removeImage(imageId);
    });
    
    // Add change handler for color dropdown (if it exists)
    const colorDropdown = imageItem.querySelector('.image-color-dropdown');
    if (colorDropdown) {
        colorDropdown.addEventListener('change', (e) => {
            e.stopPropagation();
            const imageId = e.target.getAttribute('data-image-id');
            const selectedColorId = e.target.value || null;
            updateImageColorAssignment(imageId, selectedColorId);
            
            // Update the visual feedback immediately
            updateImagePreview();
        });
    }
    
    return imageItem;
}

function getColorBadgeColor(colorId) {
    if (!colorId) return '#6c757d'; // Gray for general
    const color = allColors.find(c => c.id === colorId);
    return color ? color.hex_code : '#6c757d';
}

function updateOrderNumbers() {
    const imageItems = document.querySelectorAll('.image-preview-item');
    imageItems.forEach((item, index) => {
        const orderElement = item.querySelector('.image-order');
        if (orderElement) {
            orderElement.textContent = index + 1;
            }
        });
    }

function updateImageColorAssignment(imageId, colorId) {
    const image = managedImageFiles.find(img => img.id === imageId);
    if (image) {
        image.assignedColorId = colorId;
        console.log(`Image ${imageId} assigned to color ${colorId}`);
    }
}

function removeImage(imageId) {
    const index = managedImageFiles.findIndex(img => img.id === imageId);
    if (index !== -1) {
        const imageData = managedImageFiles[index];
        
        // Revoke object URL if it's a new file
        if (imageData.isNew && imageData.image_url.startsWith('blob:')) {
            URL.revokeObjectURL(imageData.image_url);
        }
        
        managedImageFiles.splice(index, 1);
        
        // Update order values
        managedImageFiles.forEach((img, idx) => {
            img.order = idx;
        });
        
        updateImagePreview();
    }
}

// Global function for saving products (called from Save button)
window.saveProduct = async function() {
    if (!validateForm()) {
        return;
    }
    
    const productId = document.getElementById('productId').value;
    const isEditing = !!productId;
    
    try {
        // Show loading
        document.getElementById('loading').style.display = 'flex';
        
        // Prepare product data
        const productData = {
            name: document.getElementById('name').value,
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            status: document.getElementById('status').value,
            price: parseFloat(document.getElementById('price').value) || 0
        };
        
        let savedProduct;
        
        if (isEditing) {
            // Update existing product
            const { data, error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId)
                .select()
                .single();
            
            if (error) throw error;
            savedProduct = data;
        } else {
            // Get the current max order value to set the new product's order
            const { data: maxOrderData, error: orderError } = await supabase
                .from('products')
                .select('order')
                .order('order', { ascending: false })
                .limit(1);
            
            // Handle the case where there are no products yet or error occurred
            let nextOrder = 1;
            if (!orderError && maxOrderData && maxOrderData.length > 0) {
                nextOrder = (maxOrderData[0].order || 0) + 1;
            }
            
            // Add order to product data
            productData.order = nextOrder;
            
            // Create new product
            const { data, error } = await supabase
                .from('products')
                .insert([productData])
                .select()
                .single();
            
            if (error) throw error;
            savedProduct = data;
        }
        
        // FIXED: Handle product colors BEFORE images to avoid foreign key constraint issues
        if (selectedProductColors.length > 0) {
            await handleProductColors(savedProduct.id, isEditing);
        }
        
        // Handle images after colors are set up
        if (managedImageFiles.length > 0) {
            await handleImageUploads(savedProduct.id, isEditing);
        }
        
        // Reset form and reload products
        resetForm();
        await loadProducts();
        
        alert(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
        
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
};

async function handleImageUploads(productId, isEditing) {
    console.log('Starting image upload process for product:', productId);
    console.log('Managed image files:', managedImageFiles);
    
    try {
        // If editing, first delete all existing images from database (not storage yet)
        if (isEditing) {
            const { error: deleteError } = await supabase
                .from('product_images')
                .delete()
                .eq('product_id', productId);
            
            if (deleteError) {
                console.error('Error deleting existing images:', deleteError);
                throw deleteError;
            }
        }
        
        // Upload new images and create database records
        for (const [index, imageData] of managedImageFiles.entries()) {
            let imageUrl = imageData.image_url;
            
            console.log(`Processing image ${index + 1}:`, imageData);
            
            // If it's a new file (has a File object), upload it to ImgBB
            if (imageData.isNew && imageData.file) {
                console.log('Uploading new image file to ImgBB...');
                
                try {
                    // Create FormData for ImgBB upload
                    const formData = new FormData();
                    formData.append('image', imageData.file);
                    
                    console.log('Uploading to ImgBB...');
                    
                    // Upload to ImgBB
                    const response = await fetch('https://api.imgbb.com/1/upload?key=e3fa9a29e007c2f610420bdd62518a42', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error(`ImgBB upload failed: ${response.status} ${response.statusText}`);
                    }
                    
                    const result = await response.json();
                    
                    if (!result.success) {
                        throw new Error('ImgBB upload failed: ' + (result.error?.message || 'Unknown error'));
                    }
                    
                    // Use the display_url from ImgBB response
                    imageUrl = result.data.display_url;
                    console.log('Image uploaded successfully to ImgBB:', imageUrl);
                    
                    // Clean up the blob URL
                    URL.revokeObjectURL(imageData.image_url);
                    
                } catch (uploadError) {
                    console.error('ImgBB upload error:', uploadError);
                    throw new Error(`Failed to upload image to ImgBB: ${uploadError.message}`);
                }
            }
            
            // Create database record for the image
            console.log('Creating database record for image...');
            
            // Determine the product_color_id based on assigned color
            let productColorId = null;
            if (imageData.assignedColorId) {
                // Find the product_color record for this product and color
                const { data: productColorData, error: productColorError } = await supabase
                    .from('product_colors')
                    .select('id')
                    .eq('product_id', productId)
                    .eq('color_id', imageData.assignedColorId)
                    .single();
                
                if (productColorError) {
                    console.warn('Could not find product_color record:', productColorError);
                } else {
                    productColorId = productColorData.id;
                }
            }
            
            const { error: dbError } = await supabase
                .from('product_images')
                .insert({
                    product_id: productId,
                    image_url: imageUrl,
                    order: index,
                    product_color_id: productColorId
                });
            
            if (dbError) {
                console.error('Database insert error:', dbError);
                throw dbError;
            }
            
            console.log(`Image ${index + 1} processed successfully`);
        }
        
        console.log('All images uploaded successfully');
        
    } catch (error) {
        console.error('Error in handleImageUploads:', error);
        throw error;
    }
}

async function handleProductColors(productId, isEditing) {
    try {
        console.log('Handling product colors for product:', productId);
        console.log('Selected colors:', selectedProductColors);
        
        // If editing, safely delete existing product colors
        if (isEditing) {
            // First, remove foreign key references from product_images by setting product_color_id to null
            const { error: updateImagesError } = await supabase
                .from('product_images')
                .update({ product_color_id: null })
                .eq('product_id', productId);
            
            if (updateImagesError) {
                console.error('Error updating product images to remove color references:', updateImagesError);
                throw updateImagesError;
            }
            
            // Now safely delete existing product colors
            const { error: deleteError } = await supabase
                .from('product_colors')
                .delete()
                .eq('product_id', productId);
            
            if (deleteError) {
                console.error('Error deleting existing product colors:', deleteError);
                throw deleteError;
            }
        }
        
        // Insert new product colors
        if (selectedProductColors.length > 0) {
            const productColors = selectedProductColors.map(colorId => ({
                product_id: productId,
                color_id: colorId,
                is_multi_color: selectedProductColors.length > 1
            }));
            
            const { error: insertError } = await supabase
                .from('product_colors')
                .insert(productColors);
            
            if (insertError) {
                console.error('Error inserting product colors:', insertError);
                throw insertError;
            }
            
            console.log('Product colors saved successfully');
        }
        
    } catch (error) {
        console.error('Error in handleProductColors:', error);
        throw error;
    }
}

function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    
    // Clear managed images
    managedImageFiles.forEach(img => {
        if (img.isNew && img.image_url.startsWith('blob:')) {
            URL.revokeObjectURL(img.image_url);
        }
    });
    managedImageFiles = [];
    
    // Clear selected colors
    selectedProductColors = [];
    
    // Clear image preview
    updateImagePreview();
    
    // Re-render color selection to clear checkboxes
    renderColorSelection();
    
    // Re-setup image upload to ensure clean state
    setupImageUpload();
}

async function loadProducts() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                product_images (
                    id,
                    image_url,
                    "order",
                    product_color_id
                )
            `)
            .order('order', { ascending: true })
            .order('order', { foreignTable: 'product_images', ascending: true });

        if (error) throw error;

        displayProducts(products || []);
    } catch (error) {
        console.error('Error loading products:', error);
        alert('Error loading products: ' + error.message);
    }
}

function displayProducts(products) {
    const productList = document.getElementById('productList');
    
    if (products.length === 0) {
        productList.innerHTML = '<p>No products found. Add your first product above!</p>';
        return;
    }
    
    productList.innerHTML = '<h2 style="margin-bottom: 30px; color: #333;">Existing Products</h2>';
    
    // Create container for products with grid layout
    const productsContainer = document.createElement('div');
    productsContainer.id = 'productsContainer';
    productsContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;
        padding: 20px 0;
    `;
    
    products.forEach((product, index) => {
        const sortedImages = (product.product_images || []).sort((a, b) => (a.order || 0) - (b.order || 0));
        const primaryImage = sortedImages[0]?.image_url || 'img/product-img/fallback.jpg';
        const imageCount = sortedImages.length;
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-product-id', product.id);
        productCard.setAttribute('data-product-index', index);
        productCard.style.cssText = `
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            position: relative;
            border: 1px solid #e1e5e9;
            cursor: grab;
        `;
        
        // Add hover effect
        productCard.addEventListener('mouseenter', () => {
            productCard.style.transform = 'translateY(-5px)';
            productCard.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
        });
        
        productCard.addEventListener('mouseleave', () => {
            productCard.style.transform = 'translateY(0)';
            productCard.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)';
        });
        
        productCard.innerHTML = `
            <div class="drag-handle" style="
                position: absolute; 
                top: 15px; 
                left: 15px; 
                cursor: grab; 
                padding: 8px; 
                background: rgba(45, 44, 52, 0.1); 
                border-radius: 6px; 
                font-size: 16px; 
                color: #2d2c34;
                z-index: 10;
                transition: background 0.2s;
            ">≡</div>
            <div class="status-badge status-${product.status}" style="
                position: absolute; 
                top: 15px; 
                right: 15px; 
                padding: 6px 12px; 
                border-radius: 20px; 
                font-size: 0.75rem; 
                font-weight: 600; 
                text-transform: uppercase; 
                letter-spacing: 0.5px;
                ${getStatusBadgeStyles(product.status)}
            ">${product.status.replace('-', ' ')}</div>
            <img src="${primaryImage}" alt="${product.name}" 
                 onerror="this.src='img/product-img/fallback.jpg'" 
                 style="
                     width: 100%; 
                     height: 200px; 
                     object-fit: cover; 
                     border-radius: 8px; 
                     margin-bottom: 15px;
                     margin-top: 25px;
                 ">
            <h3 style="
                margin: 0 0 10px 0; 
                font-size: 1.3rem; 
                color: #2d2c34; 
                font-weight: 600;
                line-height: 1.3;
            ">${product.name}</h3>
            <p style="
                color: #666; 
                margin-bottom: 15px; 
                line-height: 1.5; 
                font-size: 0.95rem;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            ">${product.description}</p>
            <p style="
                color: #666; 
                margin-bottom: 15px; 
                line-height: 1.5; 
                font-size: 0.95rem;
            ">Rs. ${product.price}</p>
            <div class="product-meta" style="
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                margin-bottom: 20px; 
                font-size: 0.9rem; 
                color: #888;
                padding: 10px 0;
                border-top: 1px solid #f0f0f0;
            ">
                <span style="
                    background: #f8f9fa; 
                    padding: 4px 8px; 
                    border-radius: 4px; 
                    font-weight: 500;
                ">Category: ${product.category}</span>
                <span class="image-count" style="
                    background: #e3f2fd; 
                    color: #1976d2; 
                    padding: 4px 8px; 
                    border-radius: 4px; 
                    font-weight: 500;
                ">${imageCount} image${imageCount !== 1 ? 's' : ''}</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-edit" onclick="editProduct('${product.id}')" style="
                    background: #007bff; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 6px; 
                    font-size: 0.9rem; 
                    font-weight: 500; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                    flex: 1;
                ">Edit</button>
                <button class="btn btn-danger" onclick="deleteProduct('${product.id}')" style="
                    background: #dc3545; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 6px; 
                    font-size: 0.9rem; 
                    font-weight: 500; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                    flex: 1;
                ">Delete</button>
            </div>
        `;
        
        // Add drag handle hover effect
        const dragHandle = productCard.querySelector('.drag-handle');
        dragHandle.addEventListener('mouseenter', () => {
            dragHandle.style.background = 'rgba(45, 44, 52, 0.2)';
        });
        dragHandle.addEventListener('mouseleave', () => {
            dragHandle.style.background = 'rgba(45, 44, 52, 0.1)';
        });
        
        productsContainer.appendChild(productCard);
    });
    
    productList.appendChild(productsContainer);
    
    // Initialize products drag & drop (without order column updates)
    initializeProductsDragDrop(productsContainer);
}

function getStatusBadgeStyles(status) {
    switch(status) {
        case 'new-arrival':
            return 'background: #d4edda; color: #155724;';
        case 'out-of-stock':
            return 'background: #f8d7da; color: #721c24;';
        case 'in-stock':
        default:
            return 'background: #d1ecf1; color: #0c5460;';
    }
}

function initializeProductsDragDrop(container) {
    // Destroy existing sortable if it exists
    if (productsSortableInstance) {
        productsSortableInstance.destroy();
        productsSortableInstance = null;
    }
    
    productsSortableInstance = new Sortable(container, {
        animation: 200,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        handle: '.drag-handle',
        onEnd: async function(evt) {
            try {
                console.log(`Product moved from position ${evt.oldIndex} to ${evt.newIndex}`);
                
                // Get all product cards in their new order
                const productCards = Array.from(container.children);
                
                // Update order in database
                const updatePromises = productCards.map((card, index) => {
                    const productId = card.getAttribute('data-product-id');
                    return supabase
                        .from('products')
                        .update({ order: index + 1 }) // Start from 1 instead of 0
                        .eq('id', productId);
                });
                
                await Promise.all(updatePromises);
                console.log('Product order updated successfully');
                
                // Update visual order numbers
                productCards.forEach((card, index) => {
                    card.setAttribute('data-product-index', index);
                });
                
            } catch (error) {
                console.error('Error updating product order:', error);
                alert('Error updating product order. Reloading products...');
                // Reload products to revert to database order
                loadProducts();
            }
        }
    });
}

// Global functions for product actions
window.editProduct = async function(productId) {
    try {
        document.getElementById('loading').style.display = 'flex';
        
        const { data: product, error } = await supabase
            .from('products')
            .select(`
                *,
                product_images (
                    id,
                    image_url,
                    "order",
                    product_color_id
                ),
                product_colors (
                    id,
                    color_id,
                    is_multi_color,
                    colors (
                        id,
                        name,
                        hex_code
                    )
                )
            `)
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        // Populate form
        document.getElementById('productId').value = product.id;
        document.getElementById('name').value = product.name;
        document.getElementById('description').value = product.description;
        document.getElementById('category').value = product.category;
        document.getElementById('status').value = product.status;
        document.getElementById('price').value = product.price !== undefined ? product.price : '';
        
        // Set images with proper color assignment
        managedImageFiles = (product.product_images || [])
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(img => {
                // Find the color_id from product_color_id
                let assignedColorId = null;
                if (img.product_color_id) {
                    const productColor = (product.product_colors || []).find(pc => pc.id === img.product_color_id);
                    if (productColor) {
                        assignedColorId = productColor.color_id;
                        console.log(`Image ${img.id} assigned to color: ${productColor.colors.name} (ID: ${assignedColorId})`);
                    } else {
                        console.warn(`Product color with ID ${img.product_color_id} not found for image ${img.id}`);
                    }
                } else {
                    console.log(`Image ${img.id} has no color assignment (General)`);
                }
                
                return {
                    id: img.id,
                    image_url: img.image_url,
                    order: img.order || 0,
                    isNew: false,
                    assignedColorId: assignedColorId,
                    originalProductColorId: img.product_color_id // Store original for debugging
                };
            });
        
        // Set colors
        selectedProductColors = (product.product_colors || []).map(pc => pc.color_id);
        
        // Ensure allColors is loaded before updating image preview
        if (allColors.length === 0) {
            console.log('Loading all colors for edit mode...');
            await initializeColorSelection();
        }
        
        console.log('Edit mode - Selected product colors:', selectedProductColors);
        console.log('Edit mode - All colors available:', allColors.length);
        
        // Re-render color selection to show selected colors
        renderColorSelection();
        
        // Update image preview after colors are loaded
        updateImagePreview();
        
        // Scroll to form
        document.querySelector('.product-form').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error loading product for edit:', error);
        alert('Error loading product: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
};

window.deleteProduct = async function(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }
    
    try {
        document.getElementById('loading').style.display = 'flex';
        
                const { error } = await supabase
                    .from('products')
                    .delete()
            .eq('id', productId);
                
                if (error) throw error;

        await loadProducts();
        alert('Product deleted successfully!');
        
            } catch (error) {
                console.error('Error deleting product:', error);
        alert('Error deleting product: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}; 