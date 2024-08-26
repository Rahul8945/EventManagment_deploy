const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const dotenv=require('dotenv');
dotenv.config();
const secret_key=process.env.SECRET_KEY

// In-memory blacklist for now (can be moved to a database for persistence)
const blackList = new Set();

// Middleware function
const auth = async (req, res, next) => {
    const header = req.headers.authorization;
    
    // Check if authorization header is present
    if (!header) {
        return res.status(400).json({ message: 'Invalid headers' });
    }
    
    const token = header.split(' ')[1];
    
    // Check if token exists
    if (!token) {
        return res.status(400).json({ message: 'Invalid token' });
    }
    
    // Check if token is blacklisted
    if (blackList.has(token)) {
        return res.status(400).json({ message: 'This token is blacklisted' });
    }
    
    try {
        // Verify JWT token
        const decoded = jwt.verify(token, secret_key);
        
        // Check if token is valid
        if (!decoded) {
            return res.status(400).json({ message: 'An error occurred while verifying token' });
        }
        
        // Attach user to the request object
        req.user = await userModel.findOne({ email: decoded.email });
        
        // Check if user exists
        if (!req.user) {
            return res.status(400).json({ message: 'Unauthorized access' });
        }
        
        // Proceed to the next middleware
        next();
    } catch (err) {
        // Handle token expiration error
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired, please login again' });
        }
        
        // Handle any other internal server error
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Function to add a token to the blacklist
const blacklistToken = (token) => {
    blackList.add(token);
};

module.exports = { auth, blacklistToken };
