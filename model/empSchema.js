const mongoose = require("mongoose");

const empSchema = mongoose.Schema(
  {
    name: { type: String },
    age: { type: Number },
    joindate: { type: Date }, //YYYY-MM-DD
    department: { type: String },
    basesalary: { type: Number },
    totalsalary: { type: Number },
    address: { type: String },
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
    profileimage: { type: String },
    email: { type: String },
    password: { type: String },
    contact: { type: Number },
    isVerfied: { type: Boolean, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", empSchema);
