import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import axios from "axios"; // For making HTTP requests to Open Banking API

// Load environment variables
// Fix the path resolution before config is called
const envPath = path.resolve("login/.env");
dotenv.config({ path: envPath });

const USERS_FILE = "./mock.json";

// Function to load users from JSON file
const loadUsers = () => {
  return JSON.parse(fs.readFileSync(USERS_FILE));
};

// Function to save users to JSON file
const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const app = express();
app.use(express.json()); // Allow JSON request body parsing
app.use(cors()); // Enable CORS for frontend communication

const PORT = 5001;

// Open Banking Project API configuration
const OPEN_BANKING_API_URL = process.env.OPEN_BANKING_API_URL || "https://api.openbankproject.com";
const OPEN_BANKING_API_VERSION = process.env.OPEN_BANKING_API_VERSION || "v5.0.0";
const OPEN_BANKING_API_KEY = process.env.OPEN_BANKING_API_KEY;
const OPEN_BANKING_CLIENT_ID = process.env.OPEN_BANKING_CLIENT_ID;
const OPEN_BANKING_CLIENT_SECRET = process.env.OPEN_BANKING_CLIENT_SECRET;

// Configuration endpoint to provide necessary frontend config
app.get("/api/config", (req, res) => {
  res.json({
    openBankingUrl: OPEN_BANKING_API_URL,
    openBankingVersion: OPEN_BANKING_API_VERSION,
    // We don't send the client ID to the frontend since we'll handle auth on the server
  });
});

// Starting the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// This is a middleware function that will be used to authenticate the token
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const verified = jwt.verify(token, process.env.SECRET_KEY);
    req.user = verified;
    next(); // Proceed to the next middleware/route
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

// Helper function to get OAuth2 token from Open Banking Project
const getOpenBankingToken = async () => {
  try {
    const response = await axios.post(`${OPEN_BANKING_API_URL}/oauth/token`, 
      new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': OPEN_BANKING_CLIENT_ID,
        'client_secret': OPEN_BANKING_CLIENT_SECRET
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Error getting Open Banking token:", error.response?.data || error.message);
    throw new Error("Failed to authenticate with Open Banking Project");
  }
};

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  const user = users.find((u) => u.email === email);

  if (!user) return res.status(400).json({ error: "User not found" });

  // Compare entered password with stored hashed password
  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    // Generate a JWT token for authentication
    const token = jwt.sign({ email: user.email }, process.env.SECRET_KEY, { expiresIn: "1h" });

    res.json({ token, email: user.email, username: user.username });
  });
});

// Register route
app.post("/register", async (req, res) => {
  const { email, username, password, firstname, lastname } = req.body;
  let users = loadUsers();

  // Check if the user already exists
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "User already exists" });
  }

  // Hash the password before storing it
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user object
  const newUser = {
    firstname,
    lastname,
    email,
    username,
    password: hashedPassword, // Store the hashed password
    bankConnections: [], // Store connected bank information here
  };

  // Add new user to the users list and save
  users.push(newUser);
  saveUsers(users);

  res.json({ message: "User registered successfully", email, username });
});

// Create a consent for connecting to a bank
app.post("/create-bank-consent", authenticateToken, async (req, res) => {
  try {
    // Get Open Banking Project OAuth token
    const openBankingToken = await getOpenBankingToken();
    
    // Create a consent for the user to authorize bank access
    const response = await axios.post(
      `${OPEN_BANKING_API_URL}/obp/${OPEN_BANKING_API_VERSION}/banks/BANK_ID/my/consents`, 
      {
        everything: false,
        views: ["owner", "accountant", "auditor"],
        entitlements: [
          {
            bank_id: "BANK_ID",
            role_name: "CanGetCustomer"
          },
          {
            bank_id: "BANK_ID",
            role_name: "CanGetAccounts"
          },
          {
            bank_id: "BANK_ID",
            role_name: "CanGetTransactions"
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${openBankingToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // The consent object contains information needed for the user to authorize
    const consentInfo = response.data;
    
    // Store the consent ID with the user
    let users = loadUsers();
    users = users.map((user) => {
      if (user.email === req.user.email) {
        // Add new consent to user's consents array (create if doesn't exist)
        if (!user.openBankingConsents) {
          user.openBankingConsents = [];
        }
        user.openBankingConsents.push(consentInfo);
      }
      return user;
    });
    saveUsers(users);
    
    // Return the consent URL to redirect the user for authorization
    res.json({ 
      consent_id: consentInfo.consent_id,
      authorization_url: consentInfo.authorization_url
    });
  } catch (error) {
    console.error("Open Banking Consent Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create banking consent" });
  }
});

// Exchange consent for access token after user has authorized
app.post("/exchange-consent", authenticateToken, async (req, res) => {
  try {
    const { consent_id } = req.body;
    
    if (!consent_id) {
      return res.status(400).json({ error: "Consent ID is required" });
    }
    
    // Get Open Banking token
    const openBankingToken = await getOpenBankingToken();
    
    // Get the user's consents from the database
    let users = loadUsers();
    const user = users.find((u) => u.email === req.user.email);
    
    if (!user || !user.openBankingConsents) {
      return res.status(400).json({ error: "No consents found for this user" });
    }
    
    // Find the specific consent
    const consent = user.openBankingConsents.find(c => c.consent_id === consent_id);
    if (!consent) {
      return res.status(400).json({ error: "Consent not found" });
    }
    
    // Check if the consent has been authorized
    const consentStatusResponse = await axios.get(
      `${OPEN_BANKING_API_URL}/obp/${OPEN_BANKING_API_VERSION}/banks/BANK_ID/my/consents/${consent_id}`,
      {
        headers: {
          'Authorization': `Bearer ${openBankingToken}`
        }
      }
    );
    
    if (consentStatusResponse.data.status !== "AUTHORIZED") {
      return res.status(400).json({ 
        error: "Consent not yet authorized", 
        status: consentStatusResponse.data.status 
      });
    }
    
    // Update the user's consent status
    users = users.map((u) => {
      if (u.email === req.user.email) {
        u.openBankingConsents = u.openBankingConsents.map(c => {
          if (c.consent_id === consent_id) {
            return { ...c, status: consentStatusResponse.data.status };
          }
          return c;
        });
      }
      return u;
    });
    saveUsers(users);
    
    res.json({ message: "Bank connection successful", consent_id });
  } catch (error) {
    console.error("Consent Exchange Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to exchange consent" });
  }
});

// Get user's bank accounts
app.get("/accounts", authenticateToken, async (req, res) => {
  try {
    // Get Open Banking token
    const openBankingToken = await getOpenBankingToken();
    
    // Retrieve user information to get their bank IDs
    const users = loadUsers();
    const user = users.find((u) => u.email === req.user.email);
    
    if (!user || !user.openBankingConsents || user.openBankingConsents.length === 0) {
      return res.status(400).json({ error: "No bank connections found" });
    }
    
    // Find an authorized consent
    const authorizedConsent = user.openBankingConsents.find(c => c.status === "AUTHORIZED");
    if (!authorizedConsent) {
      return res.status(400).json({ error: "No authorized bank connections" });
    }
    
    // Get accounts using the authorized consent
    const accountsResponse = await axios.get(
      `${OPEN_BANKING_API_URL}/obp/${OPEN_BANKING_API_VERSION}/my/accounts`,
      {
        headers: {
          'Authorization': `Bearer ${openBankingToken}`,
          'Consent-Id': authorizedConsent.consent_id
        }
      }
    );
    
    res.json({ accounts: accountsResponse.data.accounts });
  } catch (error) {
    console.error("Open Banking Accounts Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to retrieve bank accounts" });
  }
});

// Get transactions for a specific account
app.get("/transactions/:account_id", authenticateToken, async (req, res) => {
  try {
    const { account_id } = req.params;
    
    // Get Open Banking token
    const openBankingToken = await getOpenBankingToken();
    
    // Retrieve user to get their consents
    const users = loadUsers();
    const user = users.find((u) => u.email === req.user.email);
    
    if (!user || !user.openBankingConsents || user.openBankingConsents.length === 0) {
      return res.status(400).json({ error: "No bank connections found" });
    }
    
    // Find an authorized consent
    const authorizedConsent = user.openBankingConsents.find(c => c.status === "AUTHORIZED");
    if (!authorizedConsent) {
      return res.status(400).json({ error: "No authorized bank connections" });
    }
    
    // Get transactions for the specified account
    const transactionsResponse = await axios.get(
      `${OPEN_BANKING_API_URL}/obp/${OPEN_BANKING_API_VERSION}/my/banks/BANK_ID/accounts/${account_id}/transactions`,
      {
        headers: {
          'Authorization': `Bearer ${openBankingToken}`,
          'Consent-Id': authorizedConsent.consent_id
        },
        params: {
          // Specify date range if needed
          from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
          to_date: new Date().toISOString().split('T')[0] // Today
        }
      }
    );
    
    res.json({ transactions: transactionsResponse.data.transactions });
  } catch (error) {
    console.error("Open Banking Transactions Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to retrieve transactions" });
  }
});

// Get all transactions for all accounts 
app.get("/transactions", authenticateToken, async (req, res) => {
  try {
    // First get all accounts
    const openBankingToken = await getOpenBankingToken();
    
    // Retrieve user to get their consents
    const users = loadUsers();
    const user = users.find((u) => u.email === req.user.email);
    
    if (!user || !user.openBankingConsents || user.openBankingConsents.length === 0) {
      return res.status(400).json({ error: "No bank connections found" });
    }
    
    // Find an authorized consent
    const authorizedConsent = user.openBankingConsents.find(c => c.status === "AUTHORIZED");
    if (!authorizedConsent) {
      return res.status(400).json({ error: "No authorized bank connections" });
    }
    
    // Get all accounts first
    const accountsResponse = await axios.get(
      `${OPEN_BANKING_API_URL}/obp/${OPEN_BANKING_API_VERSION}/my/accounts`,
      {
        headers: {
          'Authorization': `Bearer ${openBankingToken}`,
          'Consent-Id': authorizedConsent.consent_id
        }
      }
    );
    
    const accounts = accountsResponse.data.accounts;
    
    // For each account, get transactions
    const allTransactions = [];
    for (const account of accounts) {
      try {
        const transactionsResponse = await axios.get(
          `${OPEN_BANKING_API_URL}/obp/${OPEN_BANKING_API_VERSION}/my/banks/${account.bank_id}/accounts/${account.id}/transactions`,
          {
            headers: {
              'Authorization': `Bearer ${openBankingToken}`,
              'Consent-Id': authorizedConsent.consent_id
            },
            params: {
              from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
              to_date: new Date().toISOString().split('T')[0] // Today
            }
          }
        );
        
        // Transform the transactions to match the format expected by the frontend
        const transformedTransactions = transactionsResponse.data.transactions.map(tx => ({
          id: tx.id,
          account_id: account.id,
          amount: tx.details.value.amount,
          date: tx.details.completed,
          name: tx.details.description,
          category: tx.details.type,
          // Add any other fields your frontend expects
        }));
        
        allTransactions.push(...transformedTransactions);
      } catch (error) {
        console.error(`Error getting transactions for account ${account.id}:`, error.response?.data || error.message);
        // Continue to other accounts even if one fails
      }
    }
    
    res.json({ transactions: allTransactions });
  } catch (error) {
    console.error("Open Banking Transactions Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to retrieve transactions" });
  }
});

export default app;