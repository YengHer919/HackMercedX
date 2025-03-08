import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import dotenv from "dotenv";
import{ Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { redirect } from "express/lib/response";

dotenv.config(); // Load environment variables



const USERS_FILE = "users.json";

// function to load users from JSON file
const loadUsers = () => {
  return JSON.parse(fs.readFileSync(USERS_FILE));
};

// function to save users to JSON file
const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};


const app = express();
app.use(express.json()); // Allow JSON request body parsing
app.use(cors()); // Enable CORS for frontend communication

const PORT = 5000;

// Startin da server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

//intialize plaid
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(plaidConfig);


// This is a middleware function that will be used to authenticate the token so no funny business happens
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

  
// This section is where we will implement the login route
// This route will take an email and password and return a JWT token iffffff the user is authenticated
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const users = loadUsers();
    const user = users.find((u) => u.email === email);
  
    if (!user) return res.status(400).json({ error: "User not found" }); //checks to see if the user is found
  
    // Compare entered password with stored hashed password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (!isMatch) return res.status(400).json({ error: "Invalid password" }); //compares the hashed password with what is provided for authentication
  
      // Generate a JWT token for authentication
      const token = jwt.sign({ email: user.email }, process.env.SECRET_KEY, { expiresIn: "1h" });
  
      res.json({ token, email: user.email, username: user.username });
    });
  });
  

app.post("/register", async (req, res) => {
  const { email, username, password,firstname,lastname } = req.body;
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
    walletAddress: null, // Wallet is null by default until they log in and connect later
  };

  // Add new user to the users list and save
  users.push(newUser);
  saveUsers(users);

  res.json({ message: "User registered successfully", email, username });

  
});

app.post("/create-link-token", authenticateToken, async (req, res) => {
  try{
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: req.user.email,
      },
      client_name: "Wallet Tracker",
      products: ["auth", "transactions"],
      country_codes: ["US"],
      language: "en",
      redirect_uri: "http://localhost:5000/home/home.html",
    });
    res.json({ link_token: response.data.link_token });

  }catch(error){
    console.error("Plaid Link Token Error:", error.response.data);
    res.status(500).json({ error: "something is wrong with the plaid link token" });
  }

});

app.post("/exchange-public-token", authenticateToken, async (req, res) => {
  try{
    const { public_token } = req.body;
    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    let users = loadUsers();
    users = users.map((user) => {
      if (user.email === req.user.email) {
        user.plaid_access_token = response.data.access_token;
        user.plaid_item_id = response.data.item_id;
      }
      return user;
    });
    saveUsers(users);

    res.json({ message: "Plaid token exchange successful" });
  }catch(error){
    console.error("Plaid Token Exchange Error:", error.response.data);
    res.status(500).json({ error: "something is wrong with the plaid token exchange" });
  }
});

app.get("/transactions", authenticateToken, async (req, res) => {
  try{
    let users = loadUsers();
    const user = user.find((u) => u.email === req.user.email);

    if (!user || !user.plaid_access_token) {
      return res.status(400).json({ error: "Plaid access token not found" });
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();

    const response = await plaidClient.transactionsGet({
      access_token: user.plaid_access_token,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    });

    res.json({ transactions: response.data.transactions });
  }catch(error){
    console.error("Plaid Transactions Error:", error.response.data);
    res.status(500).json({ error: "something is wrong with the plaid transactions" });
  }
});
