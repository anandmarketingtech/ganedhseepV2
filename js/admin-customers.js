import { supabase } from "./supabase-config.js";
import { enforceAuth } from "./auth-check.js";

// First enforce authentication
(async function init() {
  const isAuthenticated = await enforceAuth();
  if (!isAuthenticated) return;

  // Initialize the table only after authentication is confirmed
  initializeTable();
})();

function initializeTable() {
  // Add export button to DOM
  const exportBtnId = "exportCsvBtn";
  if (!document.getElementById(exportBtnId)) {
    const btn = document.createElement("button");
    btn.id = exportBtnId;
    btn.className = "btn btn-success mb-3";
    btn.textContent = "Export Table to CSV";
    const container = document.querySelector("#customer-table").parentNode;
    container.insertBefore(btn, container.firstChild);
  }

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
        headerSort: false,
      },
      { title: "Details", field: "email" },
      {
        title: "Contact / Quantity",
        field: "phone",
        formatter: "html",
      },
      {
        title: "Address",
        field: "address",
      },
    ],
  });
  // Export to CSV handler
  document.getElementById("exportCsvBtn").addEventListener("click", () => {
    // Flatten tree data for CSV with separate columns for each entity
    function flattenTree(data) {
      let rows = [];
      data.forEach(customer => {
        // Customer row only
        rows.push({
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          customer_address: customer.address,
          order_id: "",
          order_status: "",
          order_date: "",
          order_total_amount: "",
          item_name: "",
          item_quantity: "",
          item_color: "",
          item_price: ""
        });
        (customer._children || []).forEach(order => {
          // Order row only
          rows.push({
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone,
            customer_address: customer.address,
            order_id: order.name.replace("Order #", ""),
            order_status: order.email.replace("Status: ", ""),
            order_date: order.phone.replace("Date: ", ""),
            order_total_amount: order.address.split("Total: ₹")[1] || "",
            item_name: "",
            item_quantity: "",
            item_color: "",
            item_price: ""
          });
          (order._children || []).forEach(item => {
            // Item row only
            rows.push({
              customer_name: customer.name,
              customer_email: customer.email,
              customer_phone: customer.phone,
              customer_address: customer.address,
              order_id: order.name.replace("Order #", ""),
              order_status: order.email.replace("Status: ", ""),
              order_date: order.phone.replace("Date: ", ""),
              order_total_amount: order.address.split("Total: ₹")[1] || "",
              item_name: item.name,
              item_quantity: item.email.replace("Quantity: ", ""),
              item_color: item.phone.includes("span") ? item.phone.replace(/<[^>]+>/g, "").trim() : item.phone,
              item_price: item.address.replace("Price: ₹", "")
            });
          });
        });
      });
      return rows;
    }
    const allData = flattenTree(table.getData());
    const headers = [
      "customer_name",
      "customer_email",
      "customer_phone",
      "customer_address",
      "order_id",
      "order_status",
      "order_date",
      "order_total_amount",
      "item_name",
      "item_quantity",
      "item_color",
      "item_price"
    ];
    const csvRows = [headers.join(",")];
    allData.forEach(row => {
      csvRows.push(headers.map(h => {
        let val = row[h] || "";
        val = String(val).replace(/"/g, '""');
        if (val.search(/,|\n|"/) >= 0) val = `"${val}"`;
        return val;
      }).join(","));
    });
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "customer_orders.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Fetch data and load into table
  async function loadCustomerData() {
    try {
      // Fetch customers, orders, order_items, and for each product, fetch product_images
      const { data: customers, error: customerError } = await supabase
        .from("customers")
        .select(
          `
                    *,
                    orders (
                        *,
                        order_items (
                            *,
                            product:products(id, name, price)
                        )
                    )
                `
        )
        .order("created_at", { ascending: false });

      if (customerError) throw customerError;

      if (!customers || customers.length === 0) {
        table.setData([]);
        return;
      }

      // Map data for Tabulator
      const customerData = customers.map((customer) => ({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        _children: (customer.orders || []).map((order) => {
          // Calculate total amount if not provided or is zero
          let totalAmount = (typeof order.total_amount === 'number' && order.total_amount > 0)
            ? order.total_amount
            : (order.order_items || []).reduce((sum, item) => {
                const price = item.product && typeof item.product.price === 'number' ? item.product.price : 0;
                const qty = typeof item.quantity === 'number' ? item.quantity : 0;
                return sum + price * qty;
              }, 0);
          return {
            name: `Order #${order.id ? order.id.substring(0, 8) : ""}`,
            email: `Status: ${order.status}`,
            phone: `Date: ${
              order.placed_at ? new Date(order.placed_at).toLocaleString() : ""
            }`,
            address: `Total Items: ${order.order_items ? order.order_items.length : 0} | Total: ₹${totalAmount.toLocaleString()}`,
            _children: (order.order_items || []).map((item) => {
              return {
                name: item.product ? item.product.name : "Product not found",
                email: `Quantity: ${item.quantity}`,
                phone: item.product_color
                  ? `<div style="display:flex;align-items:center;gap:6px;">
                                      <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background-color:${item.product_color};border:1px solid rgba(0,0,0,0.1);"></span>
                                      ${item.product_color}
                                  </div>`
                  : "N/A",
                address: item.product ? `Price: ₹${item.product.price ? item.product.price.toLocaleString() : "0.00"}` : "",
              };
            }),
          };
        }),
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
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "admin-login.html";
  });
}
