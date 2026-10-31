import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
const run=async()=>{
 const {MONGODB_URI,ADMIN_NAME,ADMIN_EMAIL,ADMIN_PASSWORD}=process.env;
 if(!MONGODB_URI||!ADMIN_NAME||!ADMIN_EMAIL||!ADMIN_PASSWORD)throw new Error("Set MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env.");
 if(ADMIN_PASSWORD.length<12)throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
 await mongoose.connect(MONGODB_URI);
 const email=ADMIN_EMAIL.trim().toLowerCase();
 const existing=await User.findOne({email});
 if(existing){if(existing.role!=="admin")throw new Error("This email already belongs to a customer. Choose a different admin email."); console.log("Admin account already exists.");}
 else {const passwordHash=await bcrypt.hash(ADMIN_PASSWORD,12);await User.create({name:ADMIN_NAME.trim(),email,passwordHash,role:"admin"});console.log("Administrator account created.");}
 await mongoose.disconnect();
};
run().catch(async error=>{console.error(error.message);await mongoose.disconnect().catch(()=>{});process.exit(1);});
