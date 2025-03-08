import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import dotenv from "dotenv";

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
