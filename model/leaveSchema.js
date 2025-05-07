const mongoose = require("mongoose");

const leaveSchema = mongoose.Schema(
  {
    empolyeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    reason: {
      type: String,
    },
    startdate: {
      type: Date,
    },
    enddate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "Rejected", "Accepted"],
      default: "Pending",
    },
    type: {
      type: String,
    },
    totaldays: {
      type: Number,
      default: 1,
    },
    managerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
    },
    remark: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);
