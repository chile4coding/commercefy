import { Router } from "express";
import {
  generateInvoice,
  payBusinessOwner,
  paystackEvents,
  verifyPayment,
} from "../payment/paystack";
import { body } from "express-validator";
const router = Router();


router.post(
  "/pay_business_owner",
  [body("email").notEmpty().withMessage("Invalid email"),
  body("amount").notEmpty().withMessage("Invalid amount"),
  body("name").notEmpty().withMessage("Invalid name"),
  body("invoiceNo").notEmpty().withMessage("Invalid invoice number"),
  body("item").notEmpty().withMessage("Invalid item"),],
  payBusinessOwner
);
router.get("/generate_invoice", generateInvoice);
router.get("/verify_payment", verifyPayment);

export const paystackRoutes = router;
