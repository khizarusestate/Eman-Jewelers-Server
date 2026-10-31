import requireAuth from "./requireAuth.js";
export default async function requireAdmin(req, res, next) {
  await requireAuth(req, res, error => {
    if (error) return next(error);
    if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Administrator access is required." });
    next();
  });
}
