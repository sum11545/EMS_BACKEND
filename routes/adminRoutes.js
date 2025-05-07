const express = require("express");
const route = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mangerSchema = require("../model/managerSchema");
const employeeSchema = require("../model/empSchema");
const leaveSchema = require("../model/leaveSchema");
const attendanceSchema = require("../model/attendanceSchema");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const managerSchema = require("../model/managerSchema");
const empSchema = require("../model/empSchema");
var defaultClient = SibApiV3Sdk.ApiClient.instance;
var apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_KEY;
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

require("dotenv").config();

route.use(express.json());
const isLogin = async (req, res, next) => {
  try {
    const token = req.header("Authorization");
    console.log(token);
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }
    const extractedToken = token.startsWith("Bearer ")
      ? token.split(" ")[1]
      : token;

    const decode = jwt.verify(extractedToken, process.env.JWT_SECRET);
    req.user = decode;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

route.get("/", async (req, res) => {
  res.send("Hello From Admin");
});

route.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userExist = await mangerSchema.findOne({ email });
    if (!userExist) {
      return res.status(400).json({
        message: "Admin Does Not Exist ",
      });
    }

    if (userExist.isAdmin == false) {
      return res.status(400).json({
        message: "Not a Admin ",
      });
    }
    const matchPassword = await bcrypt.compare(password, userExist.password);
    if (!matchPassword) {
      return res.status(400).json({
        message: "Invaild User Or Password",
      });
    }
    const token = jwt.sign({ _id: userExist._id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });
    console.log("token", token);

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      token,
      user: userExist,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal Server Error",
      Error: error,
    });
  }
});

route.get("/dashboard", isLogin, async (req, res) => {
  try {
    const totalEmployees = await employeeSchema.countDocuments();
    const totalManagers = await mangerSchema.countDocuments();
    const pendingManagers = await mangerSchema.countDocuments({
      isVerfied: false,
    });
    const uniqueDepartments = await mangerSchema.distinct("department");
    const totalLeaves = await leaveSchema.countDocuments();
    const totalAttendanceLogs = await attendanceSchema.countDocuments();

    res.status(200).json({
      totalEmployees,
      totalManagers,
      pendingManagers,
      totalDepartments: uniqueDepartments.length,
      totalLeaves,
      totalAttendanceLogs,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});
route.get("/unverfiedManager", isLogin, async (req, res) => {
  try {
    const unverifiedManagers = await mangerSchema.find({ isVerfied: false });
    console.log(unverifiedManagers);

    res.status(200).json(unverifiedManagers);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

route.post("/verfiyManager", isLogin, async (req, res) => {
  try {
    const managerId = req.body.managerId;
    const verfiedManager = await mangerSchema.findByIdAndUpdate(
      managerId,
      { isVerfied: true },
      { new: true }
    );

    await tranEmailApi.sendTransacEmail({
      sender: { email: "sumitrai3252@gmail.com", name: "EMS Company" }, // Change sender email
      to: [{ email: verfiedManager.email }],
      subject: "Your Account Has Been Verified!",
      htmlContent: `<p>Dear ${verfiedManager.name},</p>
                    <p>Your manager account has been successfully <strong>verified</strong>.</p>
                    <p>Welcome aboard!</p>
                    <br/>
                    <p>- EMS Team</p>`,
    });
    console.log("Email Send");
    res.status(200).json({
      message: "Manager Verfied Successfull ",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});
route.post("/rejectManager", isLogin, async (req, res) => {
  try {
    const managerId = req.body.managerId;
    const manager = await mangerSchema.findById(managerId);
    const verfiedManager = await mangerSchema.deleteOne({
      _id: managerId,
    });

    await tranEmailApi.sendTransacEmail({
      sender: { email: "sumitrai3252@gmail.com", name: "EMS Company" }, // Change sender email
      to: [{ email: manager.email }],
      subject: "Your Account Has Been Not Verified!",
      htmlContent: `<p>Dear ${manager.name},</p>
                    <p>Your manager account has been not verified .</p>
                    <br/>
                    <p>- EMS Team</p>`,
    });
    console.log("Email Send");
    res.status(200).json({
      message: "Manager Delete Successfull ",
      data: verfiedManager,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

route.get("/allManager", isLogin, async (req, res) => {
  try {
    const manager = await mangerSchema.find();

    res.status(200).json({
      message: "Manager List",
      data: manager,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

route.post("/deleteManager", isLogin, async (req, res) => {
  try {
    const managerId = req.body.managerId;
    console.log(managerId);

    const manager = await mangerSchema.deleteOne({
      _id: managerId,
    });
    res.status(200).json({
      message: "Manager Delete Successfull ",
      data: manager,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

route.post("/editManager", isLogin, async (req, res) => {
  try {
    const managerId = req.body.managerId;
    console.log("Manager ID", managerId);

    const { name, email, department, contact } = req.body;

    const updatedManager = await managerSchema.findOneAndUpdate(
      {
        _id: managerId,
      },
      {
        $set: {
          name: name,
          email: email,
          department: department,
          contactNo: contact,
        },
      },
      {
        new: true,
      }
    );

    res.status(200).json({
      message: "Manager Update Successfull ",
      data: updatedManager,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

route.get("/allEmployee", isLogin, async (req, res) => {
  try {
    const employee = await employeeSchema.find().populate("manager_id", "name");
    res.status(200).json({
      message: "Employee Data Retrieved Successfully",
      data: employee,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

route.post("/editEmployee", isLogin, async (req, res) => {
  try {
    const { employeeId, name, email, department, contact, basesalary } =
      req.body;
    const updated = await empSchema.findByIdAndUpdate(
      employeeId,
      { name, email, department, contact, basesalary },
      { new: true }
    );
    res.status(200).json({
      message: "Employee Update Successfull",
      data: updated,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

route.post("/deletEmployee", isLogin, async (req, res) => {
  try {
    const managerId = req.body.employeeId;
    const deleted = await empSchema.findByIdAndDelete(managerId);
    res.status(200).json({
      message: "Employee Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(200).json({
      message: "Internal Server Error",
    });
  }
});

route.get("/allAttendance", isLogin, async (req, res) => {
  try {
    const attendance = await attendanceSchema
      .find()
      .populate("employeeId", "name email department");
    res.status(200).json({
      message: "Attendance Data Retrieved Successfully",
      data: attendance,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});
route.get("/attendance", isLogin, async (req, res) => {
  try {
    const { startDate, endDate, department, employeeId } = req.query;
    let filter = {};
    if (startDate && endDate) {
      filter.startDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }
    if (employeeId) {
      filter.employeeId = employeeId;
    }

    const attendanceRecords = await attendanceSchema.find(filter).populate({
      path: "employeeId",
      match: department ? { department } : {},
      select: "name email department",
    });

    res.status(200).json({
      message: "Fetched successfully",
      data: attendanceRecords.filter((a) => a.employeeId !== null), // Filter out unmatched depts
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

route.get("/leaves", isLogin, async (req, res) => {
  try {
    const leaves = await leaveSchema
      .find()
      .populate("empolyeeId", "name email department");

    res.status(200).json({ data: leaves });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});
module.exports = route;
