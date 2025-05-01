const express = require("express");
const app = express();
require("./config/conn");
require("dotenv").config();
const userRoute = require("./routes/userRoutes");
const managerRoute = require("./routes/managerRoutes");
const cors = require("cors");
const port = process.env.PORT;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use("/", userRoute);
app.use("/manager", managerRoute);
// app.use("/Manager", managerRoute);
app.use(express.json());

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
