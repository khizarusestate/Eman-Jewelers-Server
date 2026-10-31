import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 70 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, trim: true, maxlength: 25, default: "" },
  address: { type: String, trim: true, maxlength: 300, default: "" },
  city: { type: String, trim: true, maxlength: 80, default: "" },
  country: { type: String, trim: true, maxlength: 80, default: "Pakistan" },
  role: { type: String, enum: ["customer", "admin"], default: "customer", immutable: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false });

userSchema.methods.toSafeJSON = function () {
  return { id: this._id, name: this.name, email: this.email, phone: this.phone, address: this.address, city: this.city, country: this.country, createdAt: this.createdAt };
};
export default mongoose.model("User", userSchema);
