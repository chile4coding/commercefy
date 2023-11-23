import { Router } from "express";
import { body, check } from "express-validator";
import {
  createBusinessOwner,
  createClientProfile,
  enablePin,
  loginUser,
  requestOtp,
  updateAvatar,
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
    body("accountNo").notEmpty().withMessage("Invalid account number"),
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
    body("firstName").notEmpty().withMessage("Invalid  first name"),
    body("flastnName").notEmpty().withMessage("Invalid  last name"),
    body("phone").notEmpty().withMessage("Invalid phone"),
    body("state").notEmpty().withMessage("Invalid  state"),
    body("city").notEmpty().withMessage("Invalid  city"),
    body("address").notEmpty().withMessage("Invalid  address"),
  ],
  createClientProfile
);

router.patch(
  "/update_client_profile",
  auth,
  [
    body("email").isEmail().notEmpty().withMessage("Invalid email"),
    body("firstName").notEmpty().withMessage("Invalid  first name"),
    body("flastnName").notEmpty().withMessage("Invalid  last name"),
    body("phone").notEmpty().withMessage("Invalid phone"),
    body("state").notEmpty().withMessage("Invalid  state"),
    body("city").notEmpty().withMessage("Invalid  city"),
    body("address").notEmpty().withMessage("Invalid  address"),
    body("clientId").notEmpty().withMessage("Invalid  client id"),
  ],
  updateProfile
);
router.patch(
  "/update_client_picture",
  auth,
  [
    body("avatar").isEmail().notEmpty().withMessage("Invalid email"),
    body("clientId").notEmpty().withMessage("Invalid  client id"),
  ],
  updateProfile
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

router.get("/verify_kyc", updateKYC);

export const businessOwner = router;
