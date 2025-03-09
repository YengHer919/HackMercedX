// App state
let wallets = JSON.parse(localStorage.getItem('wallets')) || [];
let currentWalletId = localStorage.getItem('currentWalletId') || null;
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let apiKey = 'NIGF76UL70EX947G'; // Replace with your Alpha Vantage API key

// Predefined list of stocks with their beta values
const stockDatabase = [
  { symbol: 'AAPL', name: 'Apple Inc.', beta: 1.2, category: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', beta: 0.9, category: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', beta: 1.1, category: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', beta: 1.3, category: 'Consumer Discretionary' },
  { symbol: 'TSLA', name: 'Tesla Inc.', beta: 2.0, category: 'Automotive' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', beta: 0.7, category: 'Healthcare' },
  { symbol: 'V', name: 'Visa Inc.', beta: 0.9, category: 'Financial Services' },
  { symbol: 'WMT', name: 'Walmart Inc.', beta: 0.5, category: 'Consumer Staples' },
  { symbol: 'PG', name: 'Procter & Gamble', beta: 0.4, category: 'Consumer Staples' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', beta: 1.1, category: 'Energy' },
];

// DOM Elements
const tabDashboard = document.getElementById('tab-dashboard');
const tabWallets = document.getElementById('tab-wallets');
const dashboardPage = document.getElementById('dashboard-page');
const walletsPage = document.getElementById('wallets-page');
const noWalletSelected = document.getElementById('no-wallet-selected');
const walletDetails = document.getElementById('wallet-details');
const currentWalletName = document.getElementById('current-wallet-name');
const currentWalletBalance = document.getElementById('current-wallet-balance');
const transactionsList = document.getElementById('transactions-list');
const walletsList = document.getElementById('wallets-list');
const noWallets = document.getElementById('no-wallets');
const newWalletName = document.getElementById('new-wallet-name');
const initialBalance = document.getElementById('initial-balance');
const addWalletBtn = document.getElementById('add-wallet-btn');
const goToWalletsBtn = document.getElementById('go-to-wallets');
const stockSymbolInput = document.getElementById('stock-symbol');
const searchStockBtn = document.getElementById('search-stock-btn');
const stockResult = document.getElementById('stock-result');
const stockError = document.getElementById('stock-error');
const stockLoading = document.getElementById('stock-loading');
const stockName = document.getElementById('stock-name');
const stockPriceValue = document.getElementById('stock-price-value');
const stockChangeValue = document.getElementById('stock-change-value');
const stockVolumeValue = document.getElementById('stock-volume-value');
const stockHighValue = document.getElementById('stock-high-value');
const stockLowValue = document.getElementById('stock-low-value');
const stockPeValue = document.getElementById('stock-pe-value');
const stockDividendValue = document.getElementById('stock-dividend-value');
const stockMarketCapValue = document.getElementById('stock-market-cap-value');
const addToWatchlistBtn = document.getElementById('add-to-watchlist-btn');
const watchlistElement = document.getElementById('watchlist');
const riskToleranceSlider = document.getElementById('risk-tolerance');
const findMatchesBtn = document.getElementById('find-matches-btn');
const recommendationResult = document.getElementById('recommendation-result');
const recommendedStockName = document.getElementById('recommended-stock-name');
const recommendedStockSymbol = document.getElementById('recommended-stock-symbol');
const recommendedCategory = document.getElementById('recommended-category');
const recommendedPrice = document.getElementById('recommended-price');
const recommendedRiskLevel = document.getElementById('recommended-risk-level');
const addRecommendedToWatchlist = document.getElementById('add-recommended-to-watchlist');

// Helper Functions
function saveWallets() {
  localStorage.setItem('wallets', JSON.stringify(wallets));
}

function saveCurrentWalletId() {
  localStorage.setItem('currentWalletId', currentWalletId);
}

function saveWatchlist() {
  localStorage.setItem('watchlist', JSON.stringify(watchlist));
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getWalletById(id) {
  return wallets.find(wallet => wallet.id === id);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// UI Functions
function showTab(tabName) {
  // Hide all pages
  dashboardPage.classList.add('hidden');
  walletsPage.classList.add('hidden');
  
  // Remove active class from tabs
  tabDashboard.classList.remove('active');
  tabWallets.classList.remove('active');
  
  // Show selected page and activate tab
  if (tabName === 'dashboard') {
    dashboardPage.classList.remove('hidden');
    tabDashboard.classList.add('active');
    updateActivitySection();
    updateWatchlist();
  } else if (tabName === 'wallets') {
    walletsPage.classList.remove('hidden');
    tabWallets.classList.add('active');
    updateWalletsPage();
  }
}

function updateActivitySection() {
  if (!currentWalletId || !getWalletById(currentWalletId)) {
    noWalletSelected.classList.remove('hidden');
    walletDetails.classList.add('hidden');
    return;
  }
  const wallet = getWalletById(currentWalletId);
  
  noWalletSelected.classList.add('hidden');
  walletDetails.classList.remove('hidden');
  
  currentWalletName.textContent = wallet.name;
  currentWalletBalance.textContent = wallet.balance.toFixed(2);
  
  // Update transactions list
  transactionsList.innerHTML = '';
  
  if (wallet.transactions.length === 0) {
    transactionsList.innerHTML = '<p>No transactions yet.</p>';
  } else {
    wallet.transactions.sort((a, b) => b.date - a.date).forEach(transaction => {
      const transactionEl = document.createElement('div');
      transactionEl.className = 'transaction';
      
      const amountClass = transaction.type === 'expense' ? 'expense' : 'income';
      const amountPrefix = transaction.type === 'expense' ? '-' : '+';
      
      transactionEl.innerHTML = `
        <div class="transaction-description">${transaction.description}</div>
        <div class="transaction-date">${formatDate(transaction.date)}</div>
        <div class="transaction-amount ${amountClass}">${amountPrefix}$${transaction.amount.toFixed(2)}</div>
      `;
      
      transactionsList.appendChild(transactionEl);
    });
  }
}

function updateWalletsPage() {
  walletsList.innerHTML = '';
  
  if (wallets.length === 0) {
    noWallets.classList.remove('hidden');
  } else {
    noWallets.classList.add('hidden');
    
    wallets.forEach(wallet => {
      const walletEl = document.createElement('div');
      walletEl.className = 'wallet-card';
      
      walletEl.innerHTML = `
        <div class="wallet-name">${wallet.name}</div>
        <div class="wallet-balance">Balance: $${wallet.balance.toFixed(2)}</div>
        <div class="wallet-transactions">Transactions: ${wallet.transactions.length}</div>
        <div class="wallet-actions">
          <button class="select-wallet" data-id="${wallet.id}">Select</button>
          <button class="delete-wallet" data-id="${wallet.id}">Delete</button>
        </div>
      `;
      
      walletsList.appendChild(walletEl);
    });
    
    // Add event listeners for wallet buttons
    document.querySelectorAll('.select-wallet').forEach(button => {
      button.addEventListener('click', function() {
        currentWalletId = this.getAttribute('data-id');
        saveCurrentWalletId();
        showTab('dashboard');
      });
    });
    
    document.querySelectorAll('.delete-wallet').forEach(button => {
      button.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this wallet?')) {
          wallets = wallets.filter(wallet => wallet.id !== id);
          saveWallets();
          
          if (currentWalletId === id) {
            currentWalletId = wallets.length > 0 ? wallets[0].id : null;
            saveCurrentWalletId();
          }
          
          updateWalletsPage();
        }
      });
    });
  }
}

// Event Listeners
tabWallets.addEventListener('click', () => showTab('wallets'));
tabDashboard.addEventListener('click', () => showTab('dashboard'));
goToWalletsBtn.addEventListener('click', () => showTab('wallets'));

searchStockBtn.addEventListener('click', () => {
  const symbol = stockSymbolInput.value.trim().toUpperCase();
  if (symbol) {
    fetchStockData(symbol);
  } else {
    alert('Please enter a stock symbol');
  }
});

addToWatchlistBtn.addEventListener('click', () => {
  const symbol = stockResult.dataset.symbol;
  const price = stockResult.dataset.price;
  const change = stockResult.dataset.change;
  const changeValue = stockResult.dataset.changeValue;
  
  // Check if stock is already in watchlist
  if (!watchlist.some(stock => stock.symbol === symbol)) {
    watchlist.push({
      symbol,
      price,
      change,
      changeValue,
      addedAt: Date.now()
    });
    
    saveWatchlist();
    updateWatchlist();
  } else {
    alert('This stock is already in your watchlist');
  }
});

addWalletBtn.addEventListener('click', () => {
  const name = newWalletName.value.trim();
  const balance = parseFloat(initialBalance.value) || 0;
  
  if (!name) {
    alert('Please enter a wallet name');
    return;
  }
  
  const newWallet = {
    id: generateId(),
    name,
    balance,
    transactions: []
  };
  
  wallets.push(newWallet);
  saveWallets();
  
  if (!currentWalletId) {
    currentWalletId = newWallet.id;
    saveCurrentWalletId();
  }
  
  newWalletName.value = '';
  initialBalance.value = '0';
  
  updateWalletsPage();
});

// Function to fetch stock data from Alpha Vantage
async function fetchStockData(symbol) {
  stockResult.classList.add('hidden');
  stockError.classList.add('hidden');
  stockLoading.classList.remove('hidden');
  
  try {
    // Global Quote endpoint
    const quoteResponse = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`);
    const quoteData = await quoteResponse.json();
    
    // Overview endpoint for additional information
    const overviewResponse = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`);
    const overviewData = await overviewResponse.json();
    
    if (quoteData['Error Message'] || !quoteData['Global Quote'] || !quoteData['Global Quote']['05. price']) {
      throw new Error('Invalid stock symbol');
    }
    
    displayStockData(symbol, quoteData, overviewData);
    stockLoading.classList.add('hidden');
    stockResult.classList.remove('hidden');
  } catch (error) {
    console.error('Error fetching stock data:', error);
    stockLoading.classList.add('hidden');
    stockError.classList.remove('hidden');
  }
}

// Function to display stock data
function displayStockData(symbol, quoteData, overviewData) {
  const quote = quoteData['Global Quote'];
  
  // Basic quote data
  const price = parseFloat(quote['05. price']).toFixed(2);
  const change = parseFloat(quote['09. change']).toFixed(2);
  const changePercent = quote['10. change percent'].replace('%', '');
  const volume = parseInt(quote['06. volume']).toLocaleString();
  
  // Display basic data
  stockName.textContent = overviewData.Name || symbol;
  stockPriceValue.textContent = price;
  
  const changeText = `${change > 0 ? '+' : ''}${change} (${changePercent}%)`;
  stockChangeValue.textContent = changeText;
  stockChangeValue.className = change >= 0 ? 'stock-change-positive' : 'stock-change-negative';
  
  stockVolumeValue.textContent = volume;
  stockHighValue.textContent = parseFloat(quote['03. high']).toFixed(2);
  stockLowValue.textContent = parseFloat(quote['04. low']).toFixed(2);
  
  // Display additional data from overview
  if (overviewData.PERatio) {
    stockPeValue.textContent = parseFloat(overviewData.PERatio).toFixed(2);
  } else {
    stockPeValue.textContent = 'N/A';
  }
  
  if (overviewData.DividendYield) {
    stockDividendValue.textContent = (parseFloat(overviewData.DividendYield) * 100).toFixed(2);
  } else {
    stockDividendValue.textContent = 'N/A';
  }
  
  if (overviewData.MarketCapitalization) {
    const marketCap = parseInt(overviewData.MarketCapitalization);
    stockMarketCapValue.textContent = formatMarketCap(marketCap);
  } else {
    stockMarketCapValue.textContent = 'N/A';
  }
  
  // Store current stock data for adding to watchlist
  stockResult.dataset.symbol = symbol;
  stockResult.dataset.price = price;
  stockResult.dataset.change = changeText;
  stockResult.dataset.changeValue = change;
}

// Helper function to format market cap
function formatMarketCap(value) {
  if (value >= 1e12) {
    return (value / 1e12).toFixed(2) + 'T';
  } else if (value >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B';
  } else if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  } else {
    return value.toLocaleString();
  }
}

// Function to update watchlist display
function updateWatchlist() {
  watchlistElement.innerHTML = '';
  
  if (watchlist.length === 0) {
    watchlistElement.innerHTML = '<p>No stocks in your watchlist yet.</p>';
    return;
  }
  
  watchlist.forEach(stock => {
    const watchlistItem = document.createElement('div');
    watchlistItem.className = 'watchlist-item';
    
    watchlistItem.innerHTML = `
      <div class="watchlist-symbol">${stock.symbol}</div>
      <div class="watchlist-price">$${stock.price}</div>
      <div class="watchlist-change ${stock.changeValue >= 0 ? 'stock-change-positive' : 'stock-change-negative'}">${stock.change}</div>
      <button class="remove-from-watchlist" data-symbol="${stock.symbol}">X</button>
    `;
    
    watchlistElement.appendChild(watchlistItem);
  });
  
  // Add event listeners for remove buttons
  document.querySelectorAll('.remove-from-watchlist').forEach(button => {
    button.addEventListener('click', function() {
      const symbol = this.getAttribute('data-symbol');
      watchlist = watchlist.filter(stock => stock.symbol !== symbol);
      saveWatchlist();
      updateWatchlist();
    });
  });
}

// Function to calculate risk score based on beta
function calculateRiskScore(beta) {
  if (beta < 0.8) return Math.floor(Math.random() * 3) + 1; // Low risk
  if (beta <= 1.2) return Math.floor(Math.random() * 4) + 4; // Medium risk
  return Math.floor(Math.random() * 3) + 8; // High risk
}

// Function to find matching stocks
function findMatchingStocks(riskTolerance) {
  // Calculate risk scores for all stocks
  const stocksWithRisk = stockDatabase.map(stock => ({
    ...stock,
    riskScore: calculateRiskScore(stock.beta),
  }));

  // Filter stocks with a risk score within ±2 of the user's risk tolerance
  return stocksWithRisk.filter(stock => Math.abs(stock.riskScore - riskTolerance) <= 2);
}

// Function to display the top recommendation
function displayRecommendation(stock) {
  recommendedStockName.textContent = stock.name;
  recommendedStockSymbol.textContent = stock.symbol;
  recommendedCategory.textContent = stock.category;
  recommendedPrice.textContent = 'Loading...'; // Fetch real-time price if needed
  recommendedRiskLevel.textContent = stock.riskScore <= 3 ? 'Low' : stock.riskScore <= 7 ? 'Medium' : 'High';
  recommendationResult.classList.remove('hidden');
}

// Event listener for "Find Matching Stocks" button
findMatchesBtn.addEventListener('click', () => {
  const riskTolerance = parseInt(riskToleranceSlider.value);
  const matches = findMatchingStocks(riskTolerance);
  if (matches.length > 0) {
    displayRecommendation(matches[0]);
  } else {
    alert('No matching stocks found for your risk profile.');
  }
});

// Add recommended stock to watchlist
addRecommendedToWatchlist.addEventListener('click', () => {
  const symbol = recommendedStockSymbol.textContent;
  const price = recommendedPrice.textContent;
  const change = 'N/A'; // You can fetch real-time data if needed
  const changeValue = 0; // You can fetch real-time data if needed

  if (!watchlist.some(stock => stock.symbol === symbol)) {
    watchlist.push({
      symbol,
      price,
      change,
      changeValue,
      addedAt: Date.now()
    });
    saveWatchlist();
    updateWatchlist();
    alert(`${symbol} added to watchlist!`);
  } else {
    alert(`${symbol} is already in your watchlist.`);
  }
});

// Initialize
function init() {
  showTab(currentWalletId ? 'dashboard' : 'wallets');
  updateWalletsPage();
  updateWatchlist();
}

window.addEventListener('DOMContentLoaded', init);