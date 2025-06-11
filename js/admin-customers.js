import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', function() {
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
            { title: "Shipping Address / Color", field: "address" },
        ],
    });

    // Fetch data and load into table
    async function loadCustomerData() {
        try {
            const { data: customers, error: customerError } = await supabase
                .from('customers')
                .select(`*, orders (*, order_items (*, product:products(name)))`)
                .order('created_at', { ascending: false });

            if (customerError) throw customerError;

            const customerData = customers.map(customer => ({
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                _children: customer.orders.map(order => ({
                    name: `Order #${order.id.substring(0, 8)}`,
                    email: `Status: ${order.status}`,
                    phone: `Date: ${new Date(order.order_date).toLocaleDateString()}`,
                    address: `Total Items: ${order.order_items.length}`,
                    _children: order.order_items.map(item => ({
                        name: item.product ? item.product.name : 'Product not found',
                        email: `Unit Price: $${(item.unit_price || 0).toFixed(2)} | Total: $${(item.total_price || 0).toFixed(2)}`,
                        phone: `Quantity: ${item.quantity}`,
                        address: `Color: ${item.product_color || 'N/A'}`,
                    }))
                }))
            }));

            table.setData(customerData);
        } catch (error) {
            console.error("Error loading data: ", error);
            alert("Failed to load customer data. Check the console for details.");
        }
    }

    loadCustomerData();
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/admin-login.html';
    });
}); 