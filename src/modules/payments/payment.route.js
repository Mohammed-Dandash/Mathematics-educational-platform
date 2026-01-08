import { Router } from "express";
import { auth } from "../../middleware/auth.middleware.js";
import { upload } from "../../utils/cloudnairy.js";
import { studentAuth } from "../../middleware/authstudent.js";
import * as paymentController from "./payment.controller.js";

const routerPayment = Router();

routerPayment.post(
  "/payments/:lectureId",
  studentAuth,
  upload.single("receipt"),
  paymentController.createPaymentWithReceipt
);

routerPayment.get(
  "/payments",
  auth,

  paymentController.listPayments
);
routerPayment.get("/payments/:id", auth, paymentController.getPayment);

routerPayment.patch(
  "/payments/:id/status",
  auth,

  paymentController.updatePaymentStatus
);
routerPayment.get('/getAssigment',auth,paymentController.listAssignments)
export default routerPayment;