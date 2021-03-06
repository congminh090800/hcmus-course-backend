const mongoose = require("mongoose");
const { Schema } = mongoose;
const { validatePhone } = require("lib/regex-helpers");
const { notificationSchema } = require("./notification");
const userSchema = new Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      min: 13,
    },
    password: {
      type: String,
      // required: true,
      min: 6,
    },
    phone: {
      type: String,
      trim: true,
      lowercase: true,
      // required: true,
      validate: [validatePhone, "Please fill a valid phone number"],
    },
    name: {
      type: String,
      required: true,
      min: 6,
      max: 100,
    },
    birthDate: { type: Date, default: Date.now },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: "male",
    },
    avatar: {
      type: String,
    },
    accessToken: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    authenticationType: {
      type: String,
      enum: ["native", "google"],
      default: "native",
    },
    googleId: {
      type: String,
    },
    studentId: {
      type: String,
    },
    notifications: {
      type: [notificationSchema],
      default: [],
    },
    isUnactive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    deleted_flag: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
