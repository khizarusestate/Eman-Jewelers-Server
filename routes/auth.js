import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
const cookieName = () => process.env.COOKIE_NAME || "eman_session";
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/"
});
const issueSession = (res, user) => {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
  res.cookie(cookieName(), token, cookieOptions());
};
const clean = value => typeof value === "string" ? value.trim() : "";
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

router.post("/register", async (req, res, next) => {
  try {
    const name = clean(req.body.name), email = clean(req.body.email).toLowerCase();
    const password = req.body.password, confirmation = req.body.confirmPassword;
    if (name.length < 2 || name.length > 70) return res.status(400).json({ success: false, message: "Please enter your name (2–70 characters)." });
    if (!validEmail(email)) return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    if (typeof password !== "string" || password.length < 8 || password.length > 72) return res.status(400).json({ success: false, message: "Password must be between 8 and 72 characters." });
    if (password !== confirmation) return res.status(400).json({ success: false, message: "Your passwords do not match." });
    if (await User.exists({ email })) return res.status(409).json({ success: false, message: "An account with this email already exists. Please log in instead." });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, phone: clean(req.body.phone), address: clean(req.body.address), city: clean(req.body.city), country: clean(req.body.country) || "Pakistan" });
    issueSession(res, user);
    return res.status(201).json({ success: true, message: "Your Eman Jewelers account has been created.", user: user.toSafeJSON() });
  } catch (error) { if (error.code === 11000) return res.status(409).json({ success: false, message: "An account with this email already exists." }); next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = clean(req.body.email).toLowerCase(), password = req.body.password;
    if (!validEmail(email) || typeof password !== "string" || !password) return res.status(400).json({ success: false, message: "Enter your email and password to continue." });
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ success: false, message: "The email or password you entered is incorrect." });
    issueSession(res, user);
    return res.json({ success: true, message: "Welcome back.", user: user.toSafeJSON() });
  } catch (error) { next(error); }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(cookieName(), { ...cookieOptions(), maxAge: undefined });
  res.json({ success: true, message: "You have been logged out safely." });
});

router.get("/me", requireAuth, (req, res) => res.json({ success: true, user: req.user.toSafeJSON() }));

router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const allowed = ["name", "phone", "address", "city", "country"];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = clean(req.body[key]);
    if (updates.name !== undefined && (updates.name.length < 2 || updates.name.length > 70)) return res.status(400).json({ success: false, message: "Name must be between 2 and 70 characters." });
    for (const [key, value] of Object.entries(updates)) if (value.length > (key === "address" ? 300 : 80)) return res.status(400).json({ success: false, message: "One or more profile fields are too long." });
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    res.json({ success: true, message: "Your profile has been updated.", user: user.toSafeJSON() });
  } catch (error) { next(error); }
});

router.put("/password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!(await bcrypt.compare(currentPassword || "", user.passwordHash))) return res.status(400).json({ success: false, message: "Your current password is incorrect." });
    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72) return res.status(400).json({ success: false, message: "Your new password must be between 8 and 72 characters." });
    if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: "Your new passwords do not match." });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    issueSession(res, user);
    res.json({ success: true, message: "Your password has been changed successfully." });
  } catch (error) { next(error); }
});

router.delete("/account", requireAuth, async (req, res, next) => {
  try {
    const password = req.body.password;
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!(await bcrypt.compare(password || "", user.passwordHash))) return res.status(400).json({ success: false, message: "The password is incorrect. Your account has not been deleted." });
    await User.deleteOne({ _id: user._id });
    res.clearCookie(cookieName(), { ...cookieOptions(), maxAge: undefined });
    res.json({ success: true, message: "Your account has been permanently deleted." });
  } catch (error) { next(error); }
});

export default router;
