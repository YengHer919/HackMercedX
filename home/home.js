
// App state
let wallets = JSON.parse(localStorage.getItem('wallets')) || [];
let currentWalletId = localStorage.getItem('currentWalletId') || null;
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let apiKey = ''; 

async function fetchApiKey() {
    try {
        const response = await fetch("/api/config");
        const data = await response.json();
        apiKey = data.apiKey;
        console.log("API Key Loaded:", apiKey); // Debugging, remove in production
    } catch (error) {
        console.error("Error fetching API key:", error);
    }
}

fetchApiKey();

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
const betaValue = document.getElementById('beta-value');
const volatilityValue = document.getElementById('volatility-value');
const peValue = document.getElementById('pe-value');
const dividendValue = document.getElementById('dividend-value');
const addRecommendedToWatchlist = document.getElementById('add-recommended-to-watchlist');
const popularStocksGrid = document.getElementById('popular-stocks-grid');

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
    updatePopularStocksByRisk();
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

// Function to refresh watchlist data
async function refreshWatchlist() {
  if (watchlist.length === 0) return;
  
  // Limit API calls by updating one stock at a time
  const stockToUpdate = watchlist[0];
  watchlist = watchlist.slice(1).concat([stockToUpdate]);
  
  try {
    const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockToUpdate.symbol}&apikey=${apiKey}`);
    const data = await response.json();
    
    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      const quote = data['Global Quote'];
      const price = parseFloat(quote['05. price']).toFixed(2);
      const change = parseFloat(quote['09. change']).toFixed(2);
      const changePercent = quote['10. change percent'].replace('%', '');
      const changeText = `${change > 0 ? '+' : ''}${change} (${changePercent}%)`;
      
      // Update the stock in the watchlist
      const index = watchlist.findIndex(stock => stock.symbol === stockToUpdate.symbol);
      if (index !== -1) {
        watchlist[index].price = price;
        watchlist[index].change = changeText;
        watchlist[index].changeValue = change;
        saveWatchlist();
        updateWatchlist();
      }
    }
  } catch (error) {
    console.error('Error refreshing watchlist:', error);
  }
}
// Set up a periodic refresh
setInterval(refreshWatchlist, 60000); // Update every minute
// Initialize

// List of stock symbols to fetch
const stockSymbols = [
'AAPL', 'VZ', 'NTDOY', 'DIS', 'BA', 'MA', 'GE', 'MSFT', 
'INTC', 'NFLX', 'SIRI', 'X', 'AMZN', 'FB', 'T', 'CCEP', 
'GOOG', 'TSLA', 'PYPL', 'KO'
];

// Dynamic stock database that will be populated with real data
let stockDatabase = [];

// Function to fetch stock data and populate the database
async function populateStockDatabase() {
const fetchedStocks = [];

// Show loading state
const loadingEl = document.createElement('div');
loadingEl.id = 'database-loading';
loadingEl.innerHTML = '<p>Loading stock data... This may take a moment.</p>';
document.querySelector('.investment-dashboard').prepend(loadingEl);

// Process a limited number of stocks at once to avoid API limits
const symbolsToProcess = stockSymbols.slice(0, 5); // Start with 5 stocks

for (const symbol of symbolsToProcess) {
try {
  // Fetch both quote and overview data
  const [quoteData, overviewData] = await Promise.all([
    fetchStockQuote(symbol),
    fetchStockOverview(symbol)
  ]);
  
  if (quoteData && overviewData) {
    // Calculate a risk score based on beta and other factors
    let riskScore = 5; // Default moderate risk
    
    if (overviewData.Beta) {
      const beta = parseFloat(overviewData.Beta);
      // Beta < 0.8 = lower risk, Beta > 1.2 = higher risk
      if (beta < 0.8) riskScore = Math.floor(3 * beta + 1);
      else if (beta > 1.2) riskScore = Math.min(10, Math.floor(5 * beta - 1));
      else riskScore = 5; // Moderate risk for beta between 0.8 and 1.2
    }
    
    // Add volatility indicator (using beta as proxy if not available)
    const volatility = overviewData.Beta ? parseFloat(overviewData.Beta) * 10 : 15;
    
    fetchedStocks.push({
      name: overviewData.Name || symbol,
      symbol: symbol,
      category: overviewData.Sector || 'Unknown',
      price: parseFloat(quoteData.price),
      riskScore: riskScore,
      beta: parseFloat(overviewData.Beta || 1.0),
      volatility: volatility,
      pe: parseFloat(overviewData.PERatio || 20),
      dividend: parseFloat(overviewData.DividendYield || 0) * 100
    });
  }
} catch (error) {
  console.error(`Error fetching data for ${symbol}:`, error);
}
}

// Update the stock database
stockDatabase = fetchedStocks;

// Remove loading message
const loadingMessage = document.getElementById('database-loading');
if (loadingMessage) loadingMessage.remove();

// Update the UI
updatePopularStocksByRisk();
console.log('Stock database populated with', stockDatabase.length, 'stocks');

// If we have enough stocks, enable the find matches button
if (stockDatabase.length > 0) {
findMatchesBtn.disabled = false;
} else {
// Show error if no stocks were loaded
const errorEl = document.createElement('div');
errorEl.className = 'error-message';
errorEl.innerHTML = '<p>Unable to load stock data. Please check your API key and try again.</p>';
document.querySelector('.investment-dashboard').prepend(errorEl);
}
}

// Helper function to fetch stock quote data
async function fetchStockQuote(symbol) {
try {
const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`);
const data = await response.json();

if (data['Global Quote'] && data['Global Quote']['05. price']) {
  return {
    price: data['Global Quote']['05. price'],
    change: data['Global Quote']['09. change'],
    changePercent: data['Global Quote']['10. change percent']
  };
}
return null;
} catch (error) {
console.error(`Error fetching quote for ${symbol}:`, error);
return null;
}
}

// Helper function to fetch stock overview data
async function fetchStockOverview(symbol) {
try {
const response = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`);
const data = await response.json();

if (data.Symbol === symbol) {
  return data;
}
return null;
} catch (error) {
console.error(`Error fetching overview for ${symbol}:`, error);
return null;
}
}

// Queue more stocks to load in the background
async function queueAdditionalStocks() {
// Start processing remaining stocks after initial load
const processedSymbols = stockDatabase.map(stock => stock.symbol);
const remainingSymbols = stockSymbols.filter(symbol => !processedSymbols.includes(symbol));

// Process a few at a time to avoid overwhelming the API
for (let i = 0; i < remainingSymbols.length; i += 2) {
const symbolsToProcess = remainingSymbols.slice(i, i + 2);

for (const symbol of symbolsToProcess) {
  try {
    const [quoteData, overviewData] = await Promise.all([
      fetchStockQuote(symbol),
      fetchStockOverview(symbol)
    ]);
    
    if (quoteData && overviewData) {
      // Calculate risk score as before
      let riskScore = 5;
      
      if (overviewData.Beta) {
        const beta = parseFloat(overviewData.Beta);
        if (beta < 0.8) riskScore = Math.floor(3 * beta + 1);
        else if (beta > 1.2) riskScore = Math.min(10, Math.floor(5 * beta - 1));
        else riskScore = 5;
      }
      
      const volatility = overviewData.Beta ? parseFloat(overviewData.Beta) * 10 : 15;
      
      stockDatabase.push({
        name: overviewData.Name || symbol,
        symbol: symbol,
        category: overviewData.Sector || 'Unknown',
        price: parseFloat(quoteData.price),
        riskScore: riskScore,
        beta: parseFloat(overviewData.Beta || 1.0),
        volatility: volatility,
        pe: parseFloat(overviewData.PERatio || 20),
        dividend: parseFloat(overviewData.DividendYield || 0) * 100
      });
    }
  } catch (error) {
    console.error(`Error fetching additional data for ${symbol}:`, error);
  }
}

// Update the UI after each batch
updatePopularStocksByRisk();

// Wait a moment before the next batch to respect API limits
await new Promise(resolve => setTimeout(resolve, 1500));
}
}

// Update the event listeners section
// Add code to the findMatchesBtn event listener to handle empty database
findMatchesBtn.addEventListener('click', function() {
if (stockDatabase.length === 0) {
alert('Stock data is still loading. Please try again in a moment.');
return;
}
findMatchingStocks();
});


// Modified findMatchingStocks function to work with dynamic data
function findMatchingStocks() {
const riskTolerance = parseInt(riskToleranceSlider.value);

// Handle the case when the database is empty
if (stockDatabase.length === 0) {
alert('No stock data available. Please check your API key and internet connection.');
return;
}

// Find stock matches for the given risk tolerance
const matches = stockDatabase.filter(stock => {
// Match stocks with a risk score within ±2 of the user's risk tolerance
const riskDifference = Math.abs(stock.riskScore - riskTolerance);
return riskDifference <= 2;
});

// If no exact matches, expand the search
let matchesToUse = matches;
if (matches.length === 0) {
matchesToUse = stockDatabase;
}

// Sort matches by how close they are to the user's exact risk tolerance
matchesToUse.sort((a, b) => {
const aDiff = Math.abs(a.riskScore - riskTolerance);
const bDiff = Math.abs(b.riskScore - riskTolerance);
return aDiff - bDiff;
});

if (matchesToUse.length > 0) {
displayRecommendation(matchesToUse[0]);
} else {
// Should never happen given our fallback to all stocks
alert('No matching stocks found for your risk profile.');
}
}

// Modified updatePopularStocksByRisk function for dynamic data
function updatePopularStocksByRisk() {
const riskTolerance = parseInt(riskToleranceSlider.value);

// Display appropriate risk category label
const riskLabels = document.querySelectorAll('.risk-label');
riskLabels.forEach((label, index) => {
if ((index === 0 && riskTolerance <= 3) || 
    (index === 1 && riskTolerance > 3 && riskTolerance <= 7) ||
    (index === 2 && riskTolerance > 7)) {
  label.style.fontWeight = 'bold';
  label.style.color = '#4285f4';
} else {
  label.style.fontWeight = 'normal';
  label.style.color = '#555';
}
});

// If no stock data loaded yet, show loading message
if (stockDatabase.length === 0) {
popularStocksGrid.innerHTML = '<p>No data loaded</p>';
return;
}

// Clear previous stocks
popularStocksGrid.innerHTML = '';

// Categorize stocks by risk
const lowRiskStocks = stockDatabase.filter(stock => stock.riskScore <= 3);
const mediumRiskStocks = stockDatabase.filter(stock => stock.riskScore > 3 && stock.riskScore <= 7);
const highRiskStocks = stockDatabase.filter(stock => stock.riskScore > 7);

// Determine which category to show based on risk tolerance
let stocksToShow;
let categoryLabel;

if (riskTolerance <= 3) {
stocksToShow = lowRiskStocks.length > 0 ? lowRiskStocks : stockDatabase.slice(0, 4);
categoryLabel = 'Conservative Picks';
} else if (riskTolerance <= 7) {
stocksToShow = mediumRiskStocks.length > 0 ? mediumRiskStocks : stockDatabase.slice(0, 4);
categoryLabel = 'Balanced Opportunities';
} else {
stocksToShow = highRiskStocks.length > 0 ? highRiskStocks : stockDatabase.slice(0, 4);
categoryLabel = 'High Growth Potential';
}

// Sort by closest to risk tolerance
stocksToShow.sort((a, b) => {
const aDiff = Math.abs(a.riskScore - riskTolerance);
const bDiff = Math.abs(b.riskScore - riskTolerance);
return aDiff - bDiff;
});

// Add category heading
const heading = document.createElement('h4');
heading.textContent = categoryLabel;
heading.style.margin = '0 0 1rem 0';
popularStocksGrid.appendChild(heading);

// Add up to 4 stocks from the selected category
stocksToShow.slice(0, 4).forEach(stock => {
const stockCard = document.createElement('div');
stockCard.className = 'stock-card-mini';
stockCard.innerHTML = `
  <div class="stock-symbol">${stock.symbol}</div>
  <div class="stock-name">${stock.name}</div>
  <div class="stock-price">$${stock.price.toFixed(2)}</div>
  <div class="risk-reward-ratio">Beta: ${stock.beta.toFixed(2)}</div>
  <div class="stock-category">${stock.category}</div>
`;

// Add click event to show full details
stockCard.addEventListener('click', () => {
  displayRecommendation(stock);
  recommendationResult.scrollIntoView({ behavior: 'smooth' });
});

popularStocksGrid.appendChild(stockCard);
});
}

// Add a function to check API availability
async function checkApiAvailability() {
try {
const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`);
const data = await response.json();

// Check if we got a valid response
if (data['Global Quote'] && data['Global Quote']['05. price']) {
  return true;
} else if (data['Note'] && data['Note'].includes('API call frequency')) {
  // API limit reached
  console.warn('API limit reached:', data['Note']);
  return false;
} else if (data['Error Message']) {
  // Invalid API key or other error
  console.error('API error:', data['Error Message']);
  return false;
}
return false;
} catch (error) {
console.error('Error checking API availability:', error);
return false;
}
}

// Check API key and initialize
async function checkApiAndInitialize() {
// Check if API key is stored in localStorage
const storedApiKey = localStorage.getItem('alphavantage_api_key');
if (storedApiKey) {
window.apiKey = storedApiKey;
}

// Check if API key is valid
if (window.apiKey && window.apiKey !== 'YOUR_ALPHA_VANTAGE_API_KEY') {
const isApiAvailable = await checkApiAvailability();
if (isApiAvailable) {
  init();
} else {
  setupApiKeyInput();
  alert('There was an issue with your API key or the API service is currently unavailable.');
}
} else {
setupApiKeyInput();
}
}

function init() {
// Show initial tab
if (currentWalletId && getWalletById(currentWalletId)) {
  showTab('dashboard');
} else {
  showTab('wallets');
}

// Initially disable the find matches button until data is loaded
findMatchesBtn.disabled = true;
findMatchesBtn.textContent = 'Loading Stock Data...';

// Load initial stock data
populateStockDatabase().then(() => {
  findMatchesBtn.textContent = 'Find Matching Stocks';
  // Start loading additional stocks in the background
  queueAdditionalStocks();
});
}

// Start the app
window.addEventListener('DOMContentLoaded', checkApiAndInitialize);