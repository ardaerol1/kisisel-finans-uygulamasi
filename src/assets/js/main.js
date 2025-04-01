class FinanceModel {
    constructor() {
        this.data = {
            budget: 0,
            incomes: [],
            expenses: []
        };
        this.loadData();
    }

    loadData() {
        try {
            const savedData = localStorage.getItem('financeData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                // Veri yapısı doğrulama
                if (parsedData && typeof parsedData === 'object' && 
                    'budget' in parsedData && 
                    'incomes' in parsedData && 
                    'expenses' in parsedData) {
                    this.data = parsedData;
                }
            }
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
            localStorage.removeItem('financeData');
        }
    }

    saveData() {
        localStorage.setItem('financeData', JSON.stringify(this.data));
    }

    setBudget(amount) {
        this.data.budget = parseFloat(amount);
        this.saveData();
    }

    _addItem(collection, title, amount) {
        this.data[collection].push({
            id: Date.now(),
            title: title,
            amount: parseFloat(amount)
        });
        this.saveData();
    }

    _deleteItem(collection, id) {
        this.data[collection] = this.data[collection].filter(item => item.id !== id);
        this.saveData();
    }

    addIncome(title, amount) {
        this._addItem('incomes', title, amount);
    }

    addExpense(title, amount) {
        this._addItem('expenses', title, amount);
    }

    deleteIncome(id) {
        this._deleteItem('incomes', id);
    }

    deleteExpense(id) {
        this._deleteItem('expenses', id);
    }

    // Toplam hesaplama
    _calculateTotal(collection) {
        return this.data[collection].reduce((total, item) => total + item.amount, 0);
    }

    getTotalIncome() {
        return this._calculateTotal('incomes');
    }

    getTotalExpenses() {
        return this._calculateTotal('expenses');
    }

    getBalance() {
        return this.data.budget + this.getTotalIncome() - this.getTotalExpenses();
    }
}

// Kullanıcı arayüzü
class FinanceUI {
    constructor(model) {
        this.model = model;
    }

    updateUI() {
        this.renderIncomes();
        this.renderExpenses();
        this.updateSummary();
    }

    _renderItems(collection, elementId, type) {
        const listElement = document.getElementById(elementId);
        listElement.innerHTML = '';
        
        const items = this.model.data[collection];
        
        if (items.length === 0) {
            listElement.innerHTML = `<p class="empty-message">Henüz ${type} eklenmedi.</p>`;
            return;
        }
        
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'item';

            let buttonFunction = '';
            if (collection === 'incomes') {
                buttonFunction = `deleteIncome(${item.id})`;
            } else {
                buttonFunction = `deleteExpense(${item.id})`;
            }
            
            itemElement.innerHTML = `
                <div>
                    <strong>${item.title}</strong>: ${item.amount.toFixed(2)} ₺
                </div>
                <button onclick="${buttonFunction}">
                    <i class="fas fa-trash"></i> Sil
                </button>
            `;
            listElement.appendChild(itemElement);
        });
    }

    renderIncomes() {
        this._renderItems('incomes', 'income-list', 'gelir');
    }

    renderExpenses() {
        this._renderItems('expenses', 'expense-list', 'gider');
    }

    // Finansal özeti güncelleme
    updateSummary() {
        document.getElementById('total-budget').textContent = this.model.data.budget.toFixed(2);
        document.getElementById('total-income').textContent = this.model.getTotalIncome().toFixed(2);
        document.getElementById('total-expense').textContent = this.model.getTotalExpenses().toFixed(2);
        
        const balance = this.model.getBalance();
        const balanceElement = document.getElementById('balance');
        balanceElement.textContent = balance.toFixed(2);

        if (balance < 0) {
            balanceElement.style.color = 'red';
        } else {
            balanceElement.style.color = 'green';
        }
    }

    // Form doğruluğu kontrolü
    validateInput(title, amount) {
        if (!title.trim()) {
            this.showAlert('Lütfen bir başlık girin!');
            return false;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            this.showAlert('Lütfen sıfırdan büyük geçerli bir miktar girin!');
            return false;
        }
        
        return true;
    }

    showAlert(message) {
        this._showNotification(message, 'error');
    }

    showSuccess(message) {
        this._showNotification(message, 'success');
    }

    _showNotification(message, type) {
        alert(message);
    }
}

// Grafikleri oluşturma ve güncelleme
let incomeExpenseChart;
let detailedChart;

function initCharts() {

    const chartColors = {
        income: {
            background: 'rgba(46, 204, 113, 0.8)',
            border: 'rgba(46, 204, 113, 1)'
        },
        expense: {
            background: 'rgba(231, 76, 60, 0.8)',
            border: 'rgba(231, 76, 60, 1)'
        }
    };
    
    const commonTooltipConfig = {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 12
    };

    // Pasta grafik
    const incomeExpenseCtx = document.getElementById('income-expense-chart').getContext('2d');
    incomeExpenseChart = new Chart(incomeExpenseCtx, {
        type: 'doughnut',
        data: {
            labels: ['Gelir', 'Gider'],
            datasets: [{
                data: [0, 0],
                backgroundColor: [chartColors.income.background, chartColors.expense.background],
                borderColor: [chartColors.income.border, chartColors.expense.border],
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            layout: {
                padding: { top: 20, bottom: 20 }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    ...commonTooltipConfig,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('tr-TR', { 
                                    style: 'currency', currency: 'TRY' 
                                }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000
            }
        }
    });
    
    // Dikey çubuk grafiği
    const detailedCtx = document.getElementById('expense-chart').getContext('2d');
    detailedChart = new Chart(detailedCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Gelir',
                    data: [],
                    backgroundColor: chartColors.income.background,
                    borderColor: chartColors.income.border,
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 35,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                },
                {
                    label: 'Gider',
                    data: [],
                    backgroundColor: chartColors.expense.background,
                    borderColor: chartColors.expense.border,
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 35,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { left: 10, right: 10, top: 20, bottom: 10 }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 12 },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    ...commonTooltipConfig,
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        },
                        label: function(context) {
                            if (context.parsed.y === 0) return null;
                            
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            label += new Intl.NumberFormat('tr-TR', { 
                                style: 'currency', 
                                currency: 'TRY',
                                minimumFractionDigits: 2
                            }).format(context.parsed.y);
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        font: { size: 11 },
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
                    ticks: {
                        font: { size: 11 },
                        callback: function(value) {
                            return value + ' ₺';
                        }
                    }
                }
            },
            animation: { duration: 500 },
            hover: { animationDuration: 0 }
        }
    });
}

function updateCharts() {
    if (!incomeExpenseChart || !detailedChart) {
        try {
            initCharts();
        } catch (error) {
            console.error("Grafik oluşturma hatası:", error);
            return;
        }
    }
    
    const { model } = app;
    
    // Gelir/Gider Pasta Grafiği
    const totalIncome = model.getTotalIncome();
    const totalExpense = model.getTotalExpenses();
    incomeExpenseChart.data.datasets[0].data = [totalIncome, totalExpense];
    incomeExpenseChart.update();
    
    const { incomes, expenses } = model.data;
    
    const incomesByCategory = {};
    const expensesByCategory = {};
    
    // Gelir toplamlarını hesaplama
    incomes.forEach(item => {
        if (!incomesByCategory[item.title]) {
            incomesByCategory[item.title] = 0;
        }
        incomesByCategory[item.title] += item.amount;
    });
    
    // Gider toplamlarını hesaplama
    expenses.forEach(item => {
        if (!expensesByCategory[item.title]) {
            expensesByCategory[item.title] = 0;
        }
        expensesByCategory[item.title] += item.amount;
    });
    
    const topIncomeCategories = Object.keys(incomesByCategory)
        .sort((a, b) => incomesByCategory[b] - incomesByCategory[a])
        .slice(0, 8);
    
    const topExpenseCategories = Object.keys(expensesByCategory)
        .sort((a, b) => expensesByCategory[b] - expensesByCategory[a])
        .slice(0, 8);
    
    const uniqueCategories = [...new Set([...topIncomeCategories, ...topExpenseCategories])];

    const labels = uniqueCategories;
    const incomeData = [];
    const expenseData = [];

    uniqueCategories.forEach(category => {
        incomeData.push(incomesByCategory[category] || 0);
        expenseData.push(expensesByCategory[category] || 0);
    });
    
    try {
        // Grafiği güncelle
        detailedChart.data.labels = labels;
        detailedChart.data.datasets[0].data = incomeData;
        detailedChart.data.datasets[1].data = expenseData;
        detailedChart.update();
    } catch (error) {
        console.error("Grafik güncelleme hatası:", error);
    }
}

// Rapor oluşturma
function generateReport() {
    const reportElement = document.getElementById('financial-report');
    const { model } = app;
    const currentDate = new Date();
    const dateFormatted = currentDate.toLocaleDateString('tr-TR');

    let reportHTML = `
        <div class="report-header">
            <h3>Finansal Durum Raporu</h3>
            <p>Oluşturulma Tarihi: ${dateFormatted}</p>
        </div>
        
        <div class="report-details">
            <p><strong>Toplam Bütçe:</strong> ${model.data.budget.toFixed(2)} ₺</p>
            <p><strong>Toplam Gelir:</strong> ${model.getTotalIncome().toFixed(2)} ₺</p>
            <p><strong>Toplam Gider:</strong> ${model.getTotalExpenses().toFixed(2)} ₺</p>
            <p><strong>Kalan Bakiye:</strong> ${model.getBalance().toFixed(2)} ₺</p>
        </div>
    `;
    
    // Tablo oluşturma
    const createTable = (items, title, titleColumn) => {
        if (items.length === 0) return '';
        
        let tableHTML = `
            <h4>${title}</h4>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>${titleColumn}</th>
                        <th>Miktar (₺)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        items.forEach(item => {
            tableHTML += `
                <tr>
                    <td>${item.title}</td>
                    <td>${item.amount.toFixed(2)} ₺</td>
                </tr>
            `;
        });
        
        const total = items.reduce((sum, item) => sum + item.amount, 0);
        
        tableHTML += `
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>Toplam</strong></td>
                        <td><strong>${total.toFixed(2)} ₺</strong></td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        return tableHTML;
    };

    reportHTML += createTable(model.data.incomes, 'Gelir Detayları', 'Gelir Kaynağı');
    reportHTML += createTable(model.data.expenses, 'Gider Detayları', 'Gider Kalemi');
    
    const isPositive = model.getBalance() >= 0;
    reportHTML += `
        <div class="report-total">
            <p>Rapor Özeti: ${isPositive ? 'Pozitif Bakiye' : 'Negatif Bakiye'}</p>
            <p>${isPositive 
                ? 'Tebrikler! Finansal durumunuz iyi gözüküyor.' 
                : 'Dikkat! Giderleriniz gelirlerinizden fazla.'}</p>
        </div>
    `;
    
    reportElement.innerHTML = reportHTML;
}

function printReport() {
    window.print();
}

class FinanceApp {
    constructor() {
        this.model = new FinanceModel();
        this.ui = new FinanceUI(this.model);
        
        document.addEventListener('DOMContentLoaded', () => {
            this.ui.updateUI();
            initCharts();
            updateCharts();
        });
    }

    processFormInput(titleId, amountId, method) {
        const title = document.getElementById(titleId).value;
        const amount = document.getElementById(amountId).value;
        
        if (!this.ui.validateInput(title, amount)) {
            return false;
        }
        
        this.model[method](title, amount);

        document.getElementById(titleId).value = '';
        document.getElementById(amountId).value = '';
        
        this.ui.updateUI();
        updateCharts();
        return true;
    }

    setBudget() {
        const budgetAmount = document.getElementById('budget-amount').value;
        
        if (!budgetAmount || isNaN(budgetAmount)) {
            this.ui.showAlert('Lütfen geçerli bir bütçe miktarı girin!');
            return;
        }
        
        this.model.setBudget(budgetAmount);
        document.getElementById('budget-amount').value = '';
        this.ui.updateSummary();
        this.ui.showSuccess('Bütçe başarıyla güncellendi!');
        updateCharts();
    }

    addIncome() {
        this.processFormInput('income-title', 'income-amount', 'addIncome');
    }

    addExpense() {
        this.processFormInput('expense-title', 'expense-amount', 'addExpense');
    }

    deleteItem(id, type) {
        const isIncome = type === 'income';
        const itemType = isIncome ? 'geliri' : 'gideri';
        const method = isIncome ? 'deleteIncome' : 'deleteExpense';
        
        if (confirm(`Bu ${itemType} silmek istediğinizden emin misiniz?`)) {
            this.model[method](id);
            this.ui.updateUI();
            updateCharts();
        }
    }

    deleteIncome(id) {
        this.deleteItem(id, 'income');
    }

    deleteExpense(id) {
        this.deleteItem(id, 'expense');
    }
}

const app = new FinanceApp();

// Global fonksiyonlar (HTML onclick için)
function setBudget() {
    app.setBudget();
}

function addIncome() {
    app.addIncome();
}

function addExpense() {
    app.addExpense();
}

function deleteIncome(id) {
    app.deleteIncome(id);
}

function deleteExpense(id) {
    app.deleteExpense(id);
}