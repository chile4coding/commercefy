import { Router } from "express";
import {
  generateInvoice,
  getBankCode,
  getTransactions,
  iniateTransfer,
  payBusinessOwner,
  paystackEvents,
  verifyPayment,
} from "../payment/paystack";
import { body } from "express-validator";
import auth from "../middleware/auth";
import { clearNotification, deleteNotification, getNotifications } from "../controller/owner.controller";
const router = Router();


router.post(
  "/pay_business_owner", auth,
  [body("email").notEmpty().withMessage("Invalid email"),
  body("amount").notEmpty().withMessage("Invalid amount"),
  body("name").notEmpty().withMessage("Invalid name"),
  body("invoiceNo").notEmpty().withMessage("Invalid invoice number"),
  body("item").notEmpty().withMessage("Invalid item"),],
  payBusinessOwner
);
router.post("/generate_invoice", auth, generateInvoice);
router.get("/verify_payment", verifyPayment);
router.get("/get_banks", auth,  getBankCode)
router.post("/withdraw", auth,  iniateTransfer)
router.post("/getTransactions", auth,  getTransactions)
router.get("/get_notifications", auth,  getNotifications)
router.delete("/get_notifications", auth,  deleteNotification)
router.delete("/clear_notifications", auth, clearNotification);

export const paystackRoutes = router;
