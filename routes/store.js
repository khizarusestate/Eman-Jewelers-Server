import { Router } from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();

router.get("/products", async (_req, res, next) => {
  try {
    const products = await Product.find({ active: true }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, products: products.map(p => ({ ...p, id: p._id.toString() })) });
  } catch (error) { next(error); }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Product not found." });
    const product = await Product.findOne({ _id: req.params.id, active: true }).lean();
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });
    res.json({ success: true, product: { ...product, id: product._id.toString() } });
  } catch (error) { next(error); }
});

router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await Product.distinct("category", { active: true });
    res.json({ success: true, categories: categories.sort((a,b) => a.localeCompare(b)) });
  } catch (error) { next(error); }
});

router.post("/orders", requireAuth, async (req, res, next) => {
  try {
    const { items, customerNote = "", delivery = {} } = req.body || {};
    if (!Array.isArray(items) || !items.length || items.length > 30) return res.status(400).json({ success: false, message: "Your cart is empty or contains too many items." });
    const phone = String(delivery.phone ?? req.user.phone ?? "").trim();
    const address = String(delivery.address ?? req.user.address ?? "").trim();
    const city = String(delivery.city ?? req.user.city ?? "").trim();
    const country = String(delivery.country ?? req.user.country ?? "Pakistan").trim();
    if (phone.length < 7 || address.length < 5 || city.length < 2) return res.status(400).json({ success: false, message: "Please add a valid phone number, delivery address and city to your profile or checkout." });

    const quantities = new Map();
    for (const item of items) {
      const id = String(item.productId || "");
      const quantity = Number(item.quantity);
      if (!mongoose.isValidObjectId(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return res.status(400).json({ success: false, message: "One or more cart items are invalid." });
      quantities.set(id, Math.min(99, (quantities.get(id) || 0) + quantity));
    }
    const products = await Product.find({ _id: { $in: [...quantities.keys()] }, active: true });
    if (products.length !== quantities.size) return res.status(400).json({ success: false, message: "One or more products are no longer available. Please refresh your cart." });
    const orderItems = products.map(product => {
      const quantity = quantities.get(product._id.toString());
      return { product: product._id, name: product.name, image: product.image, category: product.category, unitPrice: product.price, quantity, lineTotal: product.price * quantity };
    });
    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const order = await Order.create({
      orderNumber: `EJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,
      customer: req.user._id,
      customerSnapshot: { name: req.user.name, email: req.user.email, phone, address, city, country },
      items: orderItems, subtotal, total: subtotal, customerNote: String(customerNote).slice(0,500)
    });
    req.user.phone = phone; req.user.address = address; req.user.city = city; req.user.country = country;
    await req.user.save();
    res.status(201).json({ success: true, message: "Your order has been saved.", order });
  } catch (error) { next(error); }
});

router.get("/orders/mine", requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, orders });
  } catch (error) { next(error); }
});

export default router;
