import express from "express";
import path from "path";
import dotenv from "dotenv";
import { connectDB } from "./DB/connections.js";
import authRouter from "./src/modules/user/user.router.js";
import lectureRouter from "./src/modules/lecture/lecture.router.js";
import examRouter from "./src/modules/exam/exam.router.js";
import routerPayment from "./src/modules/payments/payment.route.js";
import router from "./src/modules/student/Student.js";
import cors from "cors";

dotenv.config();
const app = express();
connectDB();
const __dirname = path.resolve();

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const PORT = process.env.PORT;

app.use(express.json({ limit: "10gb" }));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.urlencoded({ limit: "10gb", extended: true }));
//app.use("/uploads", express.static("uploads"));

app.use("/auth", authRouter);
app.use("/lecture", lectureRouter);
app.use("/exam", examRouter);
app.use("/payment", routerPayment);
app.use("/student", router);
app.get("/", (req, res) => res.send("Hello in Our Platform"));
app.use((err, req, res, next) => {
  const status =
    (typeof err.cause === "number" && err.cause) || err.status || 500;
  const message = err.message || "يوجد خطأ ما";

  res.status(status).send({
    success: false,
    stack: err.stack,
    status: status,
    message: message,
  });
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
