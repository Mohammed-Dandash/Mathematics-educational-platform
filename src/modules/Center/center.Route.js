import { Router } from "express";
import * as centerController from "./center.controller.js";
import { auth } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/create-center", auth, centerController.createCenter);
router.get("/get-centers", auth, centerController.getCenters);
router.get("/get-center/:id", auth, centerController.getCenter);
router.put("/update-center/:id", auth, centerController.updateCenter);
router.delete("/delete-center/:id", auth, centerController.deleteCenter);

export default router;
