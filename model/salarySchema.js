const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    baseSalary: {
      type: Number,
    },
    month: {
      type: String, // e.g., "April 2025"
    },
    daysPresent: {
      type: Number,
      default: 0,
    },
    leaveDays: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    totalPayable: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Salary", salarySchema);
