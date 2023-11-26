import { Router } from "express";
import { body, check } from "express-validator";
import {
  createBusiness,
  createBusinessOwner,
  createClientProfile,
  enablePin,
  getClients,
  getInvoices,
  getOwner,
  getSpecificClientInvoice,
  getSpecificInvoice,
  getWithdrawals,
  loginUser,
  requestOtp,
  updateAvatar,
  updateClientProfile,
  updateKYC,
  updateProfile,
  verifyKYC,
  verifyOtp,
} from "../controller/owner.controller";
import auth from "../middleware/auth";

const router = Router();

router.post(
  "/signup_business_owner",
  [
    body("email").isEmail(),
    body("password").notEmpty().withMessage("Invalid password"),
  ],
  createBusinessOwner
);

router.post(
  "/verify_otp",
  body("otp").notEmpty().withMessage("Invalid otp"),
  verifyOtp
);

router.post(
  "/request_otp",
  body("email").notEmpty().withMessage("Invalid email"),
  requestOtp
);

router.post(
  "/login",
  [
    body("password").notEmpty().withMessage("Invalid password"),
    body("email").notEmpty().withMessage("Invalid email"),
  ],
  loginUser
);

router.patch(
  "/update_business_owner_profile",
  auth,
  [
    body("firstname").notEmpty().withMessage("Invalid first name"),
    body("lastname").notEmpty().withMessage("Invalid last name"),
    body("phone").notEmpty().withMessage("Invalid phone"),
    body("email").notEmpty().withMessage("Invalid email"),
   
  ],
  updateProfile
);

router.put(
  "/upload_business_owner_image",
  auth,
  body("avatar").notEmpty().withMessage("Invalid avatar"),
  updateAvatar
);

router.patch(
  "/enable_pin",
  auth,
  check("pin")
    .trim()
    .isLength({ max: 4 })
    .notEmpty()
    .withMessage("Invalid pin"),

  enablePin
);

router.post(
  "/create_client",
  auth,
  [
    body("email").isEmail().notEmpty().withMessage("Invalid email"),
    body("name").notEmpty().withMessage("Invalid  first name"),
    body("phone").notEmpty().withMessage("Invalid phone"),
    body("address").notEmpty().withMessage("Invalid  address"),
  ],
  createClientProfile
);

router.patch(
  "/update_client_profile",
  auth,
  [
    body("email").isEmail().notEmpty().withMessage("Invalid email"),
    body("name").notEmpty().withMessage("Invalid  first name"),
    body("phone").notEmpty().withMessage("Invalid phone"),
    body("address").notEmpty().withMessage("Invalid  address"),
  ],
  updateClientProfile
);
router.patch(
  "/update_client_picture",
  auth,
  [
    body("avatar").isEmail().notEmpty().withMessage("Invalid email"),
    body("clientId").notEmpty().withMessage("Invalid  client id"),
  ],
  updateClientProfile
);

router.post(
  "/do_kyc",
  auth,

  [
    body("email").isEmail().notEmpty().withMessage("Invalid email"),
    body("firstName").notEmpty().withMessage("Invalid  first name"),
    body("flastnName").notEmpty().withMessage("Invalid  last name"),
  ],
  verifyKYC
);
router.post("/update_business", auth, createBusiness);

router.get("/verify_kyc", updateKYC);

router.post("/create_business", auth, createBusiness)
router.get("/get_business_owner", auth, getOwner)
router.get("/get_busines_owner_client", auth, getClients)
router.get("/get_specific_client_invoice", auth, getSpecificClientInvoice)
router.get("/get_specific_invoice", auth, getSpecificInvoice)
router.get("/get_invoices", auth, getInvoices)
router.get("/get_withdrawl", auth, getWithdrawals)
export const businessOwner = router;
