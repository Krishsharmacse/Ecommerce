import mongoose from "mongoose";
const userschema=new mongoose.Schema({
    firstname:{type:String,required:true},
    lastname:{type:String,required:true},
    profilePIC:{type:String,default:""},//cloudinary image url
    profilePICpublicId:{type:String,default:""},//cloudinary public id
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true},
    role:{
        type:String,
        enum:["user","admin"],
        default:"user"
    },
    token:{type:String,default:null},
    isverified:{type:Boolean,default : false},
    isLoggedin:{type:Boolean,default:false},
    otp:{type:String,default:null},
    otpExpiry:{type:Date,default:null},
    resetToken:{type:String,default:null},
    resetTokenExpiry:{type:Date,default:null},
    address:{type:String},
    city:{type:String},
    zipcode:{type:String},
    phoneno:{type:String},
    

},{timestamps:true})
export const User=mongoose.model("User",userschema)