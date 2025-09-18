import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";         // ← مهم
import jwt from "jsonwebtoken";        // لو بتستخدم generateAuthToken
import nodemailer from "nodemailer";   // لو بتستخدم sendVerificationCodeEmail

// import validator from './../../node_modules/validator/es/index';
const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: (value)=>{ 
            if(!validator.isEmail(value)){
                throw new Error('Invalid email');
            }
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    phone_number :{
        type: String,
        required: true,
        validate: (value)=>{
            if(!validator.isMobilePhone(value)){
                throw new Error('Invalid phone number');
            }
        }
    },
    nationalId: {
        type: String,
        required: true,
        unique: true,
        validate: (value)=>{
            if(!validator.isNumeric(value)){
                throw new Error('Invalid nationalId');
            }
        }
    },
    parent_phone_number : {
        type: String,
        required: true,
        validate: (value)=>{
            if(!validator.isMobilePhone(value)){
                throw new Error('Invalid parent phone number');
            }
        }
    },
    Grade : {
        type: String,
        required: true,
        enum :['Frist','Second','Third'],
    },
     verificationCode: {
        type: String,
        default: null
    },
    verificationCodeExpiry: {
        type: Date,
        default: null
    },
    tokens: {
        type: [String],
        default: []
    },

});



studentSchema.methods.toJSON = function() {
    const student = this;
    const studentObject = student.toObject();
    // Remove sensitive information


    delete studentObject.tokens;
    delete studentObject.verificationCode;
    delete studentObject.verificationCodeExpiry;
    return studentObject;
}

// Method to send verification code email
studentSchema.methods.sendVerificationCodeEmail = async function(verificationCode) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });
  
    const mailOptions = {
        from: process.env.EMAIL,
        to: this.email,
        subject: "Verification Code",
        text: `Your verification code is ${verificationCode}`
    };
     
    await transporter.sendMail(mailOptions);
}

const Student = mongoose.model('Student', studentSchema);
export default Student;