import { Router } from "express";
import * as activationCodeController from "./activationCode.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { studentAuth } from "../../middleware/authstudent.js";

const router = Router();
        
router.post("/generate-codes", auth,  activationCodeController.generateCodes);
router.get("/get-codes-stats", auth,  activationCodeController.getCodesStats);
router.delete("/delete-unused-codes", auth,  activationCodeController.deleteUnusedCodes);
router.post("/redeem", studentAuth, activationCodeController.redeemCode);

export default router;