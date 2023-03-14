const validator = require("validator");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First name is required"],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, "Last name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    validate: {
      validator: (value) => {
        return validator.default.isEmail;
      },
    },
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unquie: true,
  },
  otp: {
    type: String,
    default: null,
  },
  optExpiresAt: {
    type: Date,
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;