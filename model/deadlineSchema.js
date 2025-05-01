const mongoose = require("mongoose");

const deadlineSchema = mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    title: {
      type: String,
    },
    task: [
      {
        type: String,
      },
    ],
    startdate: {
      type: Date,
    },
    enddate: {
      type: Date,
    },
    iscompelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deadline", deadlineSchema);
