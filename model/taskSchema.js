const mongoose = require("mongoose");

const taskSchema = mongoose.Schema({
  title: String,
  description: String,
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  department: String,
  dueDate: String,
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed"],
    default: "Pending",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Tasks", taskSchema);
