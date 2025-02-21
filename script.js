// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
    if (!document.body.classList.contains('light-theme') && !document.body.classList.contains('dark-theme')) {
        document.body.classList.add('light-theme');
    }
});

// Sidebar Toggle
function toggleSidebar() {
    document.querySelector('.sidebar-menu').classList.toggle('active');
}

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'reports') updateChart();
    if (pageId === 'dashboard') updateDashboardChart();
    if (pageId === 'transactions') updateTransactionProductDropdown();
    if (window.innerWidth <= 768) toggleSidebar(); // Close sidebar on mobile after selection
}

// Data Storage
let products = JSON.parse(localStorage.getItem('products')) || [];
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || { threshold: 10 };

// Inventory Management
function addProduct() {
    const name = document.getElementById('product-name').value;
    const stock = parseInt(document.getElementById('stock-level').value);
    const barcode = document.getElementById('barcode').value;

    const product = { id: Date.now(), name, stock, barcode, threshold: settings.threshold };
    products.push(product);
    localStorage.setItem('products', JSON.stringify(products));
    updateProductList();
    checkLowStock();
}

function updateProductList() {
    const productList = document.getElementById('product-list');
    productList.innerHTML = products.map(p => `
        <div>${p.name} - Stock: ${p.stock} - Barcode: ${p.barcode}
            <button onclick="deleteProduct(${p.id})">Delete</button>
        </div>`).join('');
}

function deleteProduct(id) {
    products = products.filter(p => p.id !== id);
    localStorage.setItem('products', JSON.stringify(products));
    updateProductList();
    checkLowStock();
}

// Barcode Scanning
function startBarcodeScanner() {
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#barcode-video')
        },
        decoder: {
            readers: ["ean_reader", "code_128_reader"]
        }
    }, (err) => {
        if (err) { console.error(err); return; }
        Quagga.start();
    });

    Quagga.onDetected((data) => {
        document.getElementById('barcode').value = data.codeResult.code;
        Quagga.stop();
        document.getElementById('barcode-video').style.display = 'none';
    });
}

// Stock Alerts
function checkLowStock() {
    const alertList = document.getElementById('alert-list');
    const notificationCount = document.getElementById('notification-count');
    let alerts = [];

    products.forEach(p => {
        if (p.stock < p.threshold) {
            alerts.push(`Low stock alert: ${p.name} - ${p.stock} remaining`);
        }
    });

    alertList.innerHTML = alerts.join('<br>');
    notificationCount.textContent = alerts.length;
}

// Transactions
function updateTransactionProductDropdown() {
    const select = document.getElementById('transaction-product');
    select.innerHTML = '<option value="">Select Product</option>' + 
        products.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
}

function addTransaction() {
    const productName = document.getElementById('transaction-product').value;
    const quantity = parseInt(document.getElementById('transaction-quantity').value);
    const type = document.getElementById('transaction-type').value;

    if (!productName || !quantity) {
        alert("Please select a product and enter a quantity.");
        return;
    }

    const transaction = { id: Date.now(), productName, quantity, type, date: new Date().toISOString() };
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    if (type === 'sale') {
        const product = products.find(p => p.name === productName);
        if (product && product.stock >= quantity) {
            product.stock -= quantity;
            localStorage.setItem('products', JSON.stringify(products));
            updateProductList();
            checkLowStock();
        } else {
            alert("Insufficient stock for this sale!");
            transactions.pop();
            localStorage.setItem('transactions', JSON.stringify(transactions));
            return;
        }
    } else if (type === 'purchase') {
        const product = products.find(p => p.name === productName);
        if (product) {
            product.stock += quantity;
            localStorage.setItem('products', JSON.stringify(products));
            updateProductList();
        }
    }
    updateTransactionList();
}

function updateTransactionList() {
    const transactionList = document.getElementById('transaction-list');
    transactionList.innerHTML = transactions.map(t => `
        <div>${t.type} - ${t.productName} - ${t.quantity} - ${new Date(t.date).toLocaleString()}</div>
    `).join('');
}

// Reports with Chart.js
let stockChart;
function updateChart() {
    if (stockChart) stockChart.destroy();
    const ctx = document.getElementById('stock-chart').getContext('2d');
    stockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: products.map(p => p.name),
            datasets: [{
                label: 'Stock Level',
                data: products.map(p => p.stock),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

// Dashboard Chart
let dashboardChart;
function updateDashboardChart() {
    if (dashboardChart) dashboardChart.destroy();
    const ctx = document.getElementById('dashboard-chart').getContext('2d');
    dashboardChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: transactions.map(t => new Date(t.date).toLocaleDateString()),
            datasets: [{
                label: 'Transactions',
                data: transactions.map(t => t.quantity),
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

// Export Functions
function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "inventory.xlsx");
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Inventory Report", 10, 10);
    products.forEach((p, i) => {
        doc.text(`${p.name}: ${p.stock}`, 10, 20 + i * 10);
    });
    doc.save("inventory.pdf");
}

// Settings
function saveSettings() {
    settings.threshold = parseInt(document.getElementById('threshold').value);
    localStorage.setItem('settings', JSON.stringify(settings));
    products.forEach(p => p.threshold = settings.threshold);
    localStorage.setItem('products', JSON.stringify(products));
    checkLowStock();
}

// Initial Load
showPage('dashboard');
updateProductList();
updateTransactionList();
checkLowStock();
updateTransactionProductDropdown();
