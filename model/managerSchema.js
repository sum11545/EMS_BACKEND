const mongoose = require("mongoose");

const manSchema = mongoose.Schema(
  {
    name: {
      type: String,
    },
    department: {
      type: String,
    },
    empId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],
    email: {
      type: String,
    },
    password: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVerfied: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      type: String,
    },
    contactNo: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Manager", manSchema);
