import mongoose from "mongoose";
const orderSchema=new mongoose.Schema({
 orderNumber:{type:String,required:true,unique:true,index:true},customer:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},
 customerSnapshot:{name:{type:String,required:true},email:{type:String,required:true},phone:{type:String,required:true},address:{type:String,required:true},city:{type:String,required:true},country:{type:String,default:"Pakistan"}},
 items:[{product:{type:mongoose.Schema.Types.ObjectId,ref:"Product",required:true},name:{type:String,required:true},image:{type:String,default:""},category:{type:String,default:""},unitPrice:{type:Number,required:true,min:0},quantity:{type:Number,required:true,min:1,max:99},lineTotal:{type:Number,required:true,min:0}}],
 subtotal:{type:Number,required:true,min:0},total:{type:Number,required:true,min:0},
 status:{type:String,enum:["Pending","Confirmed","Processing","Shipped","Delivered","Cancelled"],default:"Pending",index:true},
 customerNote:{type:String,trim:true,maxlength:500,default:""}
},{timestamps:true,versionKey:false});
export default mongoose.model("Order",orderSchema);
