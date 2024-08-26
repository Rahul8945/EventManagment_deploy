const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const dotenv=require('dotenv');
dotenv.config();
const secret_key=process.env.SECRET_KEY

// In-memory blacklist for now (can be moved to a database for persistence)
const blackList = new Set();

// Middleware function
const auth=async(req,res,next)=>{
    const header=req.headers.authorization
    
    console.log('Authorization Header in Middleware:', header);
    
    if(!header|| !header.startsWith("Bearer ")){
        return res.status(400).json({message:'Invalid headers'})
        
    }
    const token=header.split(' ')[1]
    console.log(token)
    if(!token){
        return res.status(400).json({message:'Invalid token'})
    }
    if(blackList.has(token)){
        return res.status(400).json({message:'this token is blacklisted'})
    }
    try{
        const decode=jwt.verify(token,secret_key)
        if(!decode){
            return res.status(400).json({message:'An error occurred while verifying token'})
        }
        req.user=await userModel.findOne({email:decode.email})
        if(!req.user){
            return res.status(400).json({message:'Unauthorized access'})
        }
        next()
    }catch(err){
        return res.status(500).json({message:'Internal server error'})

    }
}
module.exports=auth
