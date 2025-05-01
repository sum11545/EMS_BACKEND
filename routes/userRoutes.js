const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const empSchema = require("../model/empSchema");
const attendSchema = require("../model/attendanceSchema");
const leaveSchema = require("../model/leaveSchema");
const deadlineSchema = require("../model/deadlineSchema");
const salarySchema = require("../model/salarySchema");
const managerSchema = require("../model/managerSchema");
const jwt = require("jsonwebtoken");
const attendanceSchema = require("../model/attendanceSchema");
require("dotenv").config();
router.use(express.json());

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
  res.send("Welcome to the EMS SYSTEM!");
});

router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      age,
      joindate,
      basesalary,
      address,
      profileimage,
      department,
      contact,
    } = req.body;

    if (!email || !password || !name || !age || !basesalary || !address) {
      return res.status(400).json({
        message: "All fileds are Required",
      });
    }

    const Match = await empSchema.findOne({ email });
    if (Match) {
      return res.status(400).json({
        message: "User Is already Exist ",
      });
    }
    const hasedPassword = await bcrypt.hash(password, 10);

    const managerID = await managerSchema.findOne({ department: department });
    const ID = managerID._id;
    console.log(ID);

    const empolyee = new empSchema({
      email,
      password: hasedPassword,
      name,
      age,
      joindate,
      basesalary,
      address,
      profileimage,
      manager_id: ID,
      totalsalary: 0,
      department,
      contact,
    });

    await empolyee.save();
    return res.status(201).json({
      success: true,
      message: "User Created Succesfull",
      data: empolyee,
    });
  } catch (Err) {
    return res.status(500).send({
      messgae: "Internal Server Error",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userExist = await empSchema.findOne({ email });
    if (!userExist) {
      return res.status(400).json({
        message: "User Does Not Exist ",
      });
    }
    if (userExist.isVerfied == false) {
      return res.status(400).json({
        message: "User Is Not Verfied By Manager ",
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
    });
  }
});

router.post("/editInfo", isLogin, async (req, res) => {
  try {
    const user = req.user._id;

    const isUserExist = await empSchema.findById(user);
    if (!isUserExist) {
      return res.status(400).json({ message: "User does not exist" });
    }

    const updates = {};
    const allowedFields = [
      "name",
      "age",
      "department",
      "basesalary",
      "address",
      "profileimage",
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedUser = await empSchema.findOneAndUpdate(
      { _id: user },
      { $set: updates },
      { new: true }
    );

    return res.status(200).json({
      message: "User info updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error editing user info:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/attendance/Checkin", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    const { checkIn, date } = req.body;

    const isUser = await empSchema.findById(user);
    if (!isUser) {
      return res.status(400).json({ message: "User Not Exist" });
    }

    if (!checkIn) {
      return res.status(400).json({ message: "Check-in time is required" });
    }

    const todays = date ? new Date(date) : new Date();
    const dayOfWeek = todays.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res
        .status(400)
        .json({ message: "Attendance not allowed on weekends" });
    }

    const today = date ? new Date(date) : new Date(); // Use provided date or current date
    const offsetIST = 5.5 * 60 * 60 * 1000; // IST offset (UTC +5:30)
    const ISTDate = new Date(today.getTime() + offsetIST); // Convert to IST

    const todayFormatted = ISTDate.toISOString().split("T")[0];
    console.log(todayFormatted);

    const attendanceExist = await attendSchema.findOne({
      employeeId: user,
      startdate: todayFormatted,
    });

    if (attendanceExist) {
      return res.status(400).json({ message: "Already checked in today" });
    }
    const month = new Date().getMonth();

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const currentMonth = monthNames[month];

    // Parse decimal time to real Date object
    const decimal = parseFloat(checkIn);
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 100);
    const checkInDate = new Date(today);
    checkInDate.setHours(h, m, 0, 0);

    const normalizedDate = date ? new Date(date) : new Date();
    normalizedDate.setHours(0, 0, 0, 0);

    const attendance = new attendSchema({
      employeeId: user,
      checkInTimeMS: checkInDate,
      checkInOutMS: null,
      checkInTime: checkIn,
      checkInOut: null,
      startdate: todayFormatted,
      enddate: null,
      checkOutTime: null,
      totalHoursWorked: null,
      month: currentMonth,
    });

    await attendance.save();
    return res
      .status(200)
      .json({ message: "Punch In Successfully", data: attendance });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error });
  }
});

router.post("/attendance/Checkout", isLogin, async (req, res) => {
  try {
    const empId = req.user._id;
    const { checkOut, enddate } = req.body;

    if (!checkOut) {
      return res.status(400).json({ message: "Check-out time is required" });
    }

    const today = enddate ? new Date(enddate) : new Date(); // Use provided date or current date
    const offsetIST = 5.5 * 60 * 60 * 1000; // IST offset (UTC +5:30)
    const ISTDate = new Date(today.getTime() + offsetIST); // Convert to IST
    const todayFormatted = ISTDate.toISOString().split("T")[0];

    const attendance = await attendSchema.findOne({
      employeeId: empId,
      startdate: todayFormatted,
      $or: [{ enddate: null }, { enddate: todayFormatted }],
    });
    console.log(attendance);

    if (!attendance) {
      return res.status(400).json({ message: "No check-in found for today" });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({ message: "Already checked out today" });
    }

    // Convert decimal check-out to Date
    // Parse decimal time to real Date object
    const decimal = parseFloat(checkOut);
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 100);
    const checkOutDate = new Date(attendance.checkInTimeMS);

    checkOutDate.setHours(h, m, 0, 0);

    // 🧠 If checkOut is earlier than checkIn (overnight shift), add one day
    if (checkOutDate < new Date(attendance.checkInTimeMS)) {
      checkOutDate.setDate(checkOutDate.getDate() + 1);
    }

    // Calculate total hours
    const totalMs = checkOutDate - new Date(attendance.checkInTimeMS);
    const totalHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(2));
    const overtime =
      totalHours > 8 ? parseFloat((totalHours - 8).toFixed(2)) : 0;
    if (totalHours >= 8) {
      attendance.status = "Present";
    } else if (totalHours >= 4) {
      attendance.status = "Half-Day";
    } else {
      attendance.status = "Absent";
    }

    attendance.checkInOutMS = checkOutDate;
    attendance.totalHoursWorked = totalHours;
    attendance.overtime = overtime;
    attendance.checkOutTime = checkOut;
    attendance.enddate = enddate || todayFormatted;
    attendance.isPresent = 1;

    await attendance.save();
    const attendances = await attendSchema
      .find({ employeeId: empId })
      .sort({ startdate: -1 });

    return res
      .status(200)
      .json({ message: "Check-out successful", data: attendances });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error });
  }
});

router.post("/applyLeave", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    const { reason, startdate, enddate, type } = req.body;

    const start = new Date(startdate);
    console.log(start);

    const end = new Date(enddate);
    console.log(end);

    if (end < start) {
      return res
        .status(400)
        .json({ message: "End date must be after start date" });
    }

    const timeDiff = end.getTime() - start.getTime();
    console.log(timeDiff);
    const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    console.log(totalDays);

    const leave = await new leaveSchema({
      empolyeeId: user,
      reason,
      startdate,
      enddate,
      type,
      totaldays: totalDays,
    });

    await leave.save();
    return res.status(200).json({
      message: "Leave Apply Scuccessfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: err,
    });
  }
});

router.post("/setdeadline", isLogin, async (req, res) => {
  try {
    const { task, title, startdate, enddate } = req.body;
    const user = req.user._id;

    if (!task || !title || !startdate || !enddate) {
      return res.status(400).json({
        message: "All filed are required",
      });
    }
    const deadline = new deadlineSchema({
      employeeId: user,
      task,
      title,
      startdate,
      enddate,
    });

    await deadline.save();
    return res.status(201).json({
      success: true,
      message: "Deadline create Successfull",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
});

router.get("/viewdeadline", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    const task = await deadlineSchema.find({ employeeId: user });
    console.log(task);

    if (!task) {
      return res.status(400).json({
        success: false,
        message: "No Task is found",
      });
    }
    return res.status(200).json({
      message: "Here Is your whole Task",
      data: task,
    });
  } catch (error) {}
});

router.post("/salary", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    let { employeeId, daysPresent, leaveDays, overtimeHours, month } = req.body;

    const Users = await empSchema.findOne({ _id: user });
    console.log(Users);
    const baseSalary = Users.basesalary;
    const year = new Date().getFullYear();
    const months = new Date().getMonth(); // current month (0-based)
    const totalDaysInMonth = new Date(year, months + 1, 0).getDate();

    console.log("Month Index (0-based):", months);
    console.log("Total Days in Month:", totalDaysInMonth);
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const currentMonth = monthNames[months];

    function getWorkingDaysInMonth(year, monthIndex) {
      let count = 0;

      // Loop through all days of the month
      const totalDays = new Date(year, monthIndex + 1, 0).getDate();
      for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, monthIndex, day);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
      }

      return count;
    }

    const now = new Date();
    const workingDays = getWorkingDaysInMonth(
      now.getFullYear(),
      now.getMonth()
    );
    console.log("Working Days in Month", workingDays);

    const perMonthSalary = baseSalary / 12;
    console.log("Permonth Salary", perMonthSalary);
    const perDaySalary = perMonthSalary / workingDays;
    console.log("Per daya Salary is ", perDaySalary);
    const totalPresentday = await attendSchema.find({ employeeId: user });
    console.log(totalPresentday);

    let PresentWrokingDay = totalPresentday.filter(
      (val) => val.isPresent === 1 && (val.totalHoursWorked || 0) >= 8
    ).length;
    console.log("Total Present Days:", PresentWrokingDay);

    const totalSalaryWithOutOverTime = Math.round(
      PresentWrokingDay * perDaySalary
    );
    console.log("Total Salary without overtime ", totalSalaryWithOutOverTime);
    const overTimeRate = 150; //Per hours rate
    const overTime = totalPresentday.reduce(
      (sum, a) => sum + (a.overtime || 0),
      0
    );
    console.log("Total OverTime is", overTime);
    const TotalOverTimeRate = Math.round(overTime * overTimeRate);
    console.log("TotalOverTimeRate", TotalOverTimeRate);
    const TotalPayable = totalSalaryWithOutOverTime + TotalOverTimeRate;
    console.log("Total Payout Till date is ", TotalPayable);
    const totalLeaveDays = workingDays - PresentWrokingDay;
    console.log("total Leave Day", totalLeaveDays);

    const newSalary = new salarySchema({
      employeeId: user,
      baseSalary: baseSalary,
      month: currentMonth,
      daysPresent: PresentWrokingDay,
      leaveDays: totalLeaveDays,
      overtimeHours: overTime,
      totalPayable: TotalPayable,
    });
    await newSalary.save();
    return res.status(200).json({
      success: true,
      message: "Salary Processed",
      data: newSalary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
});
router.get("/salary", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    console.log(user);

    const updateSalary = await salarySchema.find({ employeeId: user });
    console.log(updateSalary);

    return res.status(200).json({
      data: updateSalary,
    });
  } catch (error) {
    return res.status(500).json({
      messgae: "Internal Server Error ",
    });
  }
});
router.get("/getAttendance", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    const attendanceDeatils = await attendanceSchema.find({ employeeId: user });
    return res.status(200).json({
      message: "Attendnace Deatils",
      data: attendanceDeatils,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).josn({
      message: "Internal Server Error",
      Error: error,
    });
  }
});
router.post("/filterAttendance", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    const month = req.body.month;
    const attendanceDeatils = await attendanceSchema.find({
      employeeId: user,
      month: month,
    });

    if (attendanceDeatils.length === 0) {
      return res.status(400).json({
        message: "No Data found for given Months",
      });
    }
    return res.status(200).json({
      message: "Attendnace Deatils",
      data: attendanceDeatils,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).josn({
      message: "Internal Server Error",
      Error: error,
    });
  }
});
router.get("/getLeaveInfo", isLogin, async (req, res) => {
  try {
    const user = req.user._id;
    console.log(user);

    const leaveDeatils = await leaveSchema.find({ empolyeeId: user });
    console.log(leaveDeatils);

    return res.status(200).json({
      message: "Leave Deatils",
      data: leaveDeatils,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Internal Server Error",
      Error: error,
    });
  }
});
module.exports = router;
