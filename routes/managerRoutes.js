const express = require("express");
const router = express.Router();
const mangerSchema = require("../model/managerSchema");
const empSchema = require("../model/empSchema");
const leaveSchema = require("../model/leaveSchema");
const userSchema = require("../model/empSchema");
const attendanceSchema = require("../model/attendanceSchema");
const taskSchema = require("../model/taskSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const socketio = require("socket.io");
const http = require("http");
const cors = require("cors");
const managerSchema = require("../model/managerSchema");
require("dotenv").config();
var defaultClient = SibApiV3Sdk.ApiClient.instance;

router.use(express.json());
router.use(cors());
var apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_KEY;
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

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
router.get("/", (req, res) => {
  res.send("Hello From Manager Route");
});
router.post("/register", async (req, res) => {
  try {
    const { name, department, email, password, contactNo, profilePicture } =
      req.body;
    if (!name || !department || !email || !password) {
      return res.status(400).json({
        message: "All Filed Are required ",
      });
    }
    console.log("Contact No", contactNo);

    const managerExist = await mangerSchema.findOne({ email });
    if (managerExist) {
      return res.json({
        message: "Email All ready Exsit",
      });
    }
    const emp = await empSchema.find({ department: department });
    console.log(emp);
    const Allemp = emp.map((e) => e._id);
    console.log(Allemp);

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);

    const manager = new mangerSchema({
      email,
      password: hashedPassword,
      department,
      name,
      empId: Allemp,
      profilePicture: profilePicture,
      contactNo: contactNo,
    });
    await manager.save();
    return res.status(200).json({
      message: "Manager Create Succesfull",
    });
  } catch (error) {
    console.log("Error", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userExist = await mangerSchema.findOne({ email });
    if (!userExist) {
      return res.status(400).json({
        message: "Manager Does Not Exist ",
      });
    }
    if (userExist.isVerfied == false) {
      return res.status(400).json({
        message: "You are Not Verfied By Admin ",
      });
    }
    if (userExist.isAdmin == true) {
      return res.status(400).json({
        message: "Not Allowed to Login from here",
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
    return res.status(500).json({
      message: "Internal Server Error",
      Error: error,
    });
  }
});
router.post("/empCount", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    const manager = await mangerSchema.findOne({ _id: user });

    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    const count = manager.empId.length;
    console.log("Number of employees:", count);
    res.status(200).json({
      message: "Successfull Find the count ",
      count: count,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
});
router.post("/leaveCount", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    const leaves = await leaveSchema.find({ managerID: user });
    // console.log(leaves);

    if (!leaves) {
      return res.status(404).json({ message: "No leave records found" });
    }

    let count = 0;
    leaves.forEach((val) => {
      if (val.status === "Pending") count++;
    });

    console.log("Number of pending leaves:", count);

    res.status(200).json({
      message: "Successfull Find the count ",
      count: count,
      leaves: leaves,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
});

router.post("/approveLeave", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    const { leaveId } = req.body;

    const leaves = await leaveSchema.findOneAndUpdate(
      { _id: leaveId },
      {
        $set: {
          status: "Accepted",
        },
        new: true,
      }
    );

    // console.log(leaves);
    res.status(200).json({
      message: "Leave Approved",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
});
router.post("/rejectLeave", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    const remark = req.body.remark;
    const { leaveId } = req.body;
    const leaves = await leaveSchema.findOneAndUpdate(
      { _id: leaveId },
      {
        $set: {
          status: "Rejected",
          remark: remark,
        },
        new: true,
      }
    );
    console.log(leaves);
    res.status(200).json({
      message: "Leave Rejected",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
});
router.post("/unverfiedUserList", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    const allUser = await userSchema.find({ manager_id: user });
    const unverifiedUsers = allUser.filter((user) => user.isVerfied === false);
    console.log(unverifiedUsers);

    res.status(200).json({ unverifiedUsers: unverifiedUsers });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
});
router.post("/verfiyuser", isLogin, async (req, res) => {
  try {
    const userId = req.body.userID;
    console.log(userId);

    const user = req.user._id;
    const manager = await mangerSchema.findOne({ _id: user });
    if (!manager) {
      return res.json({
        message: "User not exist",
      });
    }
    console.log(manager);
    // const emp =  await empSchema.findOne({_id:userId})
    // if(!emp){
    //   return res.status(400).json({
    //     message:"Employee not found"
    //   })
    // }
    const verfiyEmplyee = await empSchema.findByIdAndUpdate(
      userId,
      {
        $set: {
          isVerfied: true,
        },
      },
      { new: true }
    );

    if (!verfiyEmplyee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    await managerSchema.findByIdAndUpdate(
      user,
      { $addToSet: { empId: userId } },
      { new: true }
    );

    await tranEmailApi.sendTransacEmail({
      sender: { email: "sumitrai3252@gmail.com", name: "EMS Company" }, // Change sender email
      to: [{ email: verfiyEmplyee.email }],
      subject: "Your Account Has Been Verified!",
      htmlContent: `<p>Dear ${verfiyEmplyee.name},</p>
                    <p>Your employee account has been successfully <strong>verified</strong>.</p>
                    <p>Welcome aboard!</p>
                    <br/>
                    <p>- EMS Team</p>`,
    });
    console.log("Email Send");

    return res.status(200).json({
      message: "Employee Verified Successfully",
      data: verfiyEmplyee,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Internal  Server Error ",
      Error: error,
    });
  }
});
router.post("/Chat", isLogin, async (req, res) => {
  try {
  } catch (error) {
    console.log(error);
  }
});

router.post("/performance", isLogin, async (req, res) => {
  try {
    const managerId = req.user._id;
    const { employeeId, rating, feedback } = req.body;

    const updated = await empSchema.findByIdAndUpdate(
      employeeId,
      {
        performance: {
          rating,
          feedback,
          updatedAt: new Date(),
          ratedBy: managerId,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json({ message: "Performance updated", employee: updated });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});

router.post("/allEmpName", isLogin, async (req, res) => {
  try {
    const managerID = req.user._id;
    const names = await empSchema.find({ manager_id: managerID });

    const onlyName = names.map((emp) => ({
      name: emp.name,
      _id: emp._id,
    }));

    console.log(onlyName);

    return res.status(200).json({
      message: "Successfully Find All the names",
      onlyName: onlyName,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});

router.post("/attendanceOverview", isLogin, async (req, res) => {
  try {
    const managerID = req.user._id;
    const date = req.body.date || new Date().toISOString().split("T")[0]; // Default: today
    const employees = await empSchema.find(
      { manager_id: managerID },
      "_id name"
    );
    const employeeIds = employees.map((emp) => emp._id);
    const attendanceRecords = await attendanceSchema
      .find({
        employeeId: { $in: employeeIds },
        startdate: date,
      })
      .populate("employeeId", "name");
    console.log(attendanceRecords);

    return res.status(200).json({
      message: "Daily attendance fetched successfully",
      data: attendanceRecords,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});

router.post("/assingTask", isLogin, async (req, res) => {
  try {
    const managerID = req.user._id;
    const { title, description, dueDate, empId } = req.body;
    console.log("Employee ID", empId);

    const managerDep = await mangerSchema.findOne({ _id: managerID });

    const task = new taskSchema({
      title: title,
      description: description,
      dueDate: dueDate,
      assignedTo: empId,
      assignedBy: managerID,
      department: managerDep.department,
    });

    await task.save();
    return res.status(200).json({
      message: "Task assigned successfully",
      data: task,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});
router.get("/getTask", isLogin, async (req, res) => {
  try {
    const managerID = req.user._id;
    const tasks = await taskSchema
      .find({ assignedBy: managerID })
      .populate("assignedTo", "name")
      .sort({ dueDate: -1 });
    return res.status(200).json({
      message: "Tasks fetched successfully",
      data: tasks,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});
module.exports = router;
