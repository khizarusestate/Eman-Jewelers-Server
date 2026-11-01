import { Router } from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import requireAuth from "../middleware/requireAuth.js";
const router=Router();
router.get("/products",async(_req,res,next)=>{try{const products=await Product.find({active:true}).sort({createdAt:-1}).lean();res.json({success:true,products:products.map(p=>({...p,id:p._id.toString()}))});}catch(e){next(e);}});
router.get("/products/:id",async(req,res,next)=>{try{if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({success:false,message:"Product not found."});const p=await Product.findOne({_id:req.params.id,active:true}).lean();if(!p)return res.status(404).json({success:false,message:"Product not found."});res.json({success:true,product:{...p,id:p._id.toString()}});}catch(e){next(e);}});
router.get("/categories",async(_req,res,next)=>{try{const categories=await Product.distinct("category",{active:true});res.json({success:true,categories:categories.sort((a,b)=>a.localeCompare(b))});}catch(e){next(e);}});
router.post("/orders",requireAuth,async(req,res,next)=>{try{
 const {items,customerNote="" ,delivery={}}=req.body||{};
 if(!Array.isArray(items)||!items.length||items.length>30)return res.status(400).json({success:false,message:"Your cart is empty or contains too many items."});
 const phone=String(delivery.phone??req.user.phone??"").trim(),address=String(delivery.address??req.user.address??"").trim(),city=String(delivery.city??req.user.city??"").trim(),country=String(delivery.country??req.user.country??"Pakistan").trim();
 if(phone.length<7||address.length<5||city.length<2)return res.status(400).json({success:false,message:"Please add a valid phone number, delivery address and city."});
 const quantities=new Map();
 for(const item of items){const id=String(item.productId||""),q=Number(item.quantity);if(!mongoose.isValidObjectId(id)||!Number.isInteger(q)||q<1||q>99)return res.status(400).json({success:false,message:"One or more cart items are invalid."});quantities.set(id,Math.min(99,(quantities.get(id)||0)+q));}
 const products=await Product.find({_id:{$in:[...quantities.keys()]},active:true});if(products.length!==quantities.size)return res.status(400).json({success:false,message:"One or more products are unavailable. Refresh your cart."});
 const orderItems=products.map(p=>{const quantity=quantities.get(p._id.toString());return{product:p._id,name:p.name,image:p.image,category:p.category,unitPrice:p.price,quantity,lineTotal:p.price*quantity};});
 const total=orderItems.reduce((sum,i)=>sum+i.lineTotal,0);
 const order=await Order.create({orderNumber:`EJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,customer:req.user._id,customerSnapshot:{name:req.user.name,email:req.user.email,phone,address,city,country},items:orderItems,subtotal:total,total,customerNote:String(customerNote).slice(0,500)});
 req.user.phone=phone;req.user.address=address;req.user.city=city;req.user.country=country;await req.user.save();
 res.status(201).json({success:true,message:"Your order has been saved.",order});
 }catch(e){next(e);}});
router.get("/orders/mine",requireAuth,async(req,res,next)=>{try{const orders=await Order.find({customer:req.user._id}).sort({createdAt:-1}).limit(50).lean();res.json({success:true,orders});}catch(e){next(e);}});
export default router;
