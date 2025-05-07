const express = require("express");
const app = express();
require("./config/conn");
require("dotenv").config();
const userRoute = require("./routes/userRoutes");
const managerRoute = require("./routes/managerRoutes");
const adminRoute = require("./routes/adminRoutes");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");

const port = process.env.PORT;
const server = http.createServer(app);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use("/", userRoute);
app.use("/manager", managerRoute);
app.use("/admin", adminRoute);
// app.use("/Manager", managerRoute);
app.use(express.json());
const io = socketIO(server, {
  cors: {
    origin: "*", // Change this to your frontend domain in production
    methods: ["GET", "POST"],
  },
});
const departmentMessages = {};
io.of("/chat").on("connection", (socket) => {
  console.log("User connected to /chat namespace", socket.id);
  socket.on("joinDepartmentRoom", (department) => {
    socket.join(department);
    console.log(`User joined room: ${department}`);
    if (departmentMessages[department]) {
      socket.emit("loadPreviousMessages", departmentMessages[department]);
    } else {
      departmentMessages[department] = [];
    }
  });

  socket.on("sendMessage", ({ department, sender, message }) => {
    const msgData = { sender, message };

    // Optionally detect mentions or commands
    departmentMessages[department].push(msgData);

    io.of("/chat").to(department).emit("receiveMessage", {
      sender,
      message,
      time: new Date(),
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
