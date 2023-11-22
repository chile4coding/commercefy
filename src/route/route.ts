import { Router } from "express";
import { paystackRoutes } from "./pystack.route";
import { businessOwner } from "./businessowner.route";
import { paystackEvents } from "../payment/paystack";
const router = Router();

router.use( paystackRoutes);
router.use("/api/v1", businessOwner)
router.post("/my/webhook/url", paystackEvents);
export default router;
