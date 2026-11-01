import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import requireAdmin from "../middleware/requireAdmin.js";
const router = Router();
const cookieName = () => process.env.COOKIE_NAME || "eman_session";
const options = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", maxAge: 7 * 24 * 60 * 60 * 1000, path: "/" });
router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = req.body.password;
  const user = await User.findOne({ email, role: "admin" }).select("+passwordHash");
  if (!user || typeof password !== "string" || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ success: false, message: "Invalid administrator credentials." });
  const token = jwt.sign({ sub: user._id.toString(), role: "admin" }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
  res.cookie(cookieName(), token, options());
  res.json({ success: true, user: user.toSafeJSON() });
});
router.post("/logout", (_req,res) => { res.clearCookie(cookieName(), { ...options(), maxAge: undefined }); res.json({ success: true }); });
router.use(requireAdmin);
router.get("/me", (req,res) => res.json({ success: true, user: req.user.toSafeJSON() }));
router.get("/customers", async (req,res,next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page,10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit,10) || 20));
    const search = String(req.query.search || "").trim();
    const filter = { role: "customer" };
    if (search) filter.$or = [{ name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), $options:"i" } }, { email: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), $options:"i" } }];
    const [customers,total] = await Promise.all([User.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit),User.countDocuments(filter)]);
    res.json({ success:true, customers:customers.map(u=>u.toSafeJSON()), pagination:{page,limit,total,pages:Math.ceil(total/limit)} });
  } catch(error){next(error);}
});
router.get("/customers/:id", async (req,res,next) => { try { const user=await User.findOne({_id:req.params.id,role:"customer"}); if(!user)return res.status(404).json({success:false,message:"Customer not found."}); res.json({success:true,customer:user.toSafeJSON()}); } catch(error){next(error);} });
router.patch("/customers/:id", async (req,res,next) => {
  try {
    const allowed=["name","phone","address","city","country"], updates={};
    for(const key of allowed) if(req.body[key]!==undefined) updates[key]=String(req.body[key]).trim();
    if(updates.name!==undefined && (updates.name.length<2||updates.name.length>70))return res.status(400).json({success:false,message:"Customer name must be 2–70 characters."});
    const customer=await User.findOneAndUpdate({_id:req.params.id,role:"customer"},{$set:updates},{new:true,runValidators:true});
    if(!customer)return res.status(404).json({success:false,message:"Customer not found."});
    res.json({success:true,customer:customer.toSafeJSON(),message:"Customer details updated."});
  }catch(error){next(error);}
});
router.delete("/customers/:id", async (req,res,next) => { try { const result=await User.deleteOne({_id:req.params.id,role:"customer"}); if(!result.deletedCount)return res.status(404).json({success:false,message:"Customer not found."}); res.json({success:true,message:"Customer account deleted."}); }catch(error){next(error);} });

router.get("/products", async (_req,res,next) => { try { const products=await Product.find().sort({createdAt:-1}).lean(); res.json({success:true,products:products.map(p=>({...p,id:p._id.toString()}))}); } catch(error){next(error);} });
router.post("/products", async (req,res,next) => {
  try {
    const {name,category,price,image,tag="",description="",material="",care=""}=req.body||{};
    if(!String(name||"").trim()||!String(category||"").trim()||!Number.isFinite(Number(price))||Number(price)<0||!String(image||"").trim())return res.status(400).json({success:false,message:"Name, category, valid price and image URL are required."});
    const product=await Product.create({name,category,price:Number(price),image,tag,description,material,care});
    res.status(201).json({success:true,product:{...product.toObject(),id:product._id.toString()}});
  }catch(error){next(error);}
});
router.patch("/products/:id", async (req,res,next) => {
  try {
    const allowed=["name","category","price","image","tag","description","material","care","active"],updates={};
    for(const key of allowed)if(req.body[key]!==undefined)updates[key]=req.body[key];
    if(updates.price!==undefined&&(!Number.isFinite(Number(updates.price))||Number(updates.price)<0))return res.status(400).json({success:false,message:"Enter a valid product price."});
    const product=await Product.findByIdAndUpdate(req.params.id,{$set:updates},{new:true,runValidators:true});
    if(!product)return res.status(404).json({success:false,message:"Product not found."});
    res.json({success:true,product:{...product.toObject(),id:product._id.toString()}});
  }catch(error){next(error);}
});
router.delete("/products/:id", async (req,res,next) => { try { const product=await Product.findByIdAndUpdate(req.params.id,{$set:{active:false}},{new:true}); if(!product)return res.status(404).json({success:false,message:"Product not found."}); res.json({success:true,message:"Product archived."}); }catch(error){next(error);} });
router.get("/orders", async (req,res,next) => {
  try {
    const page=Math.max(1,Number.parseInt(req.query.page,10)||1),limit=Math.min(100,Math.max(1,Number.parseInt(req.query.limit,10)||50));
    const filter=req.query.status&&req.query.status!=="All"?{status:String(req.query.status)}:{};
    const [orders,total]=await Promise.all([Order.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean(),Order.countDocuments(filter)]);
    res.json({success:true,orders,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});
  }catch(error){next(error);}
});
router.patch("/orders/:id/status", async (req,res,next) => {
  try {
    const allowed=["Pending","Confirmed","Processing","Shipped","Delivered","Cancelled"];
    if(!allowed.includes(req.body.status))return res.status(400).json({success:false,message:"Invalid order status."});
    const order=await Order.findByIdAndUpdate(req.params.id,{$set:{status:req.body.status}},{new:true});
    if(!order)return res.status(404).json({success:false,message:"Order not found."});
    res.json({success:true,order});
  }catch(error){next(error);}
});
router.get("/stats", async (_req,res,next) => { try { const [customers,recent]=await Promise.all([User.countDocuments({role:"customer"}),User.countDocuments({role:"customer",createdAt:{$gte:new Date(Date.now()-30*86400000)}})]); res.json({success:true,stats:{customers,newCustomersLast30Days:recent}}); }catch(error){next(error);} });
export default router;
