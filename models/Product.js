import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, required: true, trim: true, maxlength: 2000 },
  tag: { type: String, trim: true, maxlength: 40, default: "" },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  material: { type: String, trim: true, maxlength: 500, default: "" },
  care: { type: String, trim: true, maxlength: 1000, default: "" },
  active: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });

export default mongoose.model("Product", productSchema);
