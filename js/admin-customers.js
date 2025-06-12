import { supabase } from './supabase-config.js';
import { enforceAuth } from './auth-check.js';

// First enforce authentication
(async function init() {
    const isAuthenticated = await enforceAuth();
    if (!isAuthenticated) return;

    // Initialize the table only after authentication is confirmed
    initializeTable();
})();

function initializeTable() {
    // Tabulator table initialization
    const table = new Tabulator("#customer-table", {
        layout: "fitColumns",
        dataTree: true,
        dataTreeStartExpanded: false,
        columns: [
            {
                title: "Customer / Order / Item",
                field: "name",
                width: 300,
                formatter: "tree",
                headerSort: false
            },
            { title: "Details", field: "email" },
            { title: "Contact / Quantity", field: "phone" },
            { 
                title: "Image / Color", 
                field: "address",
                formatter: function(cell) {
                    const value = cell.getValue();
                    if (typeof value === 'string' && !value.startsWith('http')) {
                        return value;
                    }
                    return `<img src="${value}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">`;
                }
            },
        ],
    });

    // Fetch data and load into table
    async function loadCustomerData() {
        try {
            const { data: customers, error: customerError } = await supabase
                .from('customers')
                .select(`
                    *,
                    orders (
                        *,
                        order_items (
                            *,
                            product:products(name, image_url)
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (customerError) throw customerError;

            if (!customers || customers.length === 0) {
                table.setData([]);
                return;
            }

            const customerData = customers.map(customer => ({
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                _children: customer.orders.map(order => ({
                    name: `Order #${order.id.substring(0, 8)}`,
                    email: `Status: ${order.status}`,
                    phone: `Date: ${new Date(order.placed_at).toLocaleString()}`,
                    address: `Total Items: ${order.order_items.length}`,
                    _children: order.order_items.map(item => ({
                        name: item.product ? item.product.name : 'Product not found',
                        email: `Quantity: ${item.quantity}`,
                        phone: `Color: ${item.product_color || 'N/A'}`,
                        address: item.product?.image_url || ''
                    }))
                }))
            }));

            table.setData(customerData);
        } catch (error) {
            console.error("Error loading data: ", error);
            alert("Failed to load customer data. Check the console for details.");
        }
    }

    // Load data immediately
    loadCustomerData();

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'admin-login.html';
    });
} 