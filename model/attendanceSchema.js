const mongoose = require("mongoose");

const attendanceSchema = mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    startdate: {
      type: String,
      default: () => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
      },
    },
    enddate: {
      type: String,
      default: () => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
      },
    },
    checkInTime: {
      type: String, // Example: 9.15 means 9 hours and 15 minutes
    },
    checkOutTime: {
      type: String, // Example: 17.30
    },
    checkInTimeMS: {
      type: Number,
    },
    checkInOutMS: {
      type: Number,
    },
    totalHoursWorked: {
      type: Number,
    },
    overtime: {
      type: Number,
      default: 0,
    },
    isPresent: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Present", "Half-Day", "Absent"],
      default: "Absent",
    },
    month: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
