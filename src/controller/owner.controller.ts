import expressAsyncHandler from "express-async-handler";
import prisma from "../configuration/prisma-client";
import { validationResult } from "express-validator";
import { StatusCodes } from "http-status-codes";
import {
  JWTToken,
  comparePassword,
  hashPassword,
  reqTwoFactorAuth,
  sendEmail,
  throwError,
  verifyTwoFactorAuth,
} from "../utills/helpers";
const { ComplyCube } = require("@complycube/api");
const complycube = new ComplyCube({
  apiKey: process.env.COMPLYCUBE_API_KEY,
});

export const createBusinessOwner = expressAsyncHandler(
  async (req, res, next) => {
    const { email, firstname, lastname, phone, password } = req.body;
    const errors = validationResult(req.body);
    if (!errors.isEmpty()) {
      throwError("Invalid inputs", StatusCodes.BAD_REQUEST, true);
    }

    try {
      const findOwner = await prisma.businessOwner.findUnique({
        where: {
          email: email,
        },
      });
      if (findOwner) {
        throwError("User Already exist", StatusCodes.BAD_REQUEST, true);
      }
      const { token, secret } = await reqTwoFactorAuth();
      const hashedPassword = await hashPassword(password);
      const user = await prisma.businessOwner.create({
        data: {
          firstName: firstname as string,
          lastName: lastname as string,
          email: email,
          phone: phone,
          verify_otp: false,
          otp_trial: token,
          otp_secret: secret.base32,
          password: hashedPassword,
        },
      });
      const content = `<p>Eter your OTP to complete your registration</p><h2>OTP: ${token}</h2>`;
      const subject = "Account Registration";
      await sendEmail(content, user.email, subject);
      await prisma.wallet.create({
        data: {
          balance: 0.0,
          holder: { connect: { id: user.id } },
        },
      });
      res.status(200).json({
        message: "OTP sent to your email",
      });
    } catch (error) {}
  }
);

export const verifyOtp = expressAsyncHandler(async (req, res, next) => {
  const errors = validationResult(req.body);

  if (!errors.isEmpty()) {
    throwError("Invalid inputs", StatusCodes.BAD_REQUEST, true);
  }

  try {
    const { otp } = req.body;
    const otpExist = await prisma.businessOwner.findUnique({
      where: { otp_trial: otp },
    });

    if (otpExist?.otp === otp) {
      throwError("OTP has been used ", StatusCodes.BAD_REQUEST, true);
    }
    const isvalid = await verifyTwoFactorAuth(
      otp,
      otpExist?.otp_secret as string
    );
    if (!isvalid) {
      throwError("Invalid Otp", StatusCodes.BAD_REQUEST, true);
    }
    const findUser = await prisma.businessOwner.update({
      where: { otp_trial: otp as string },
      data: {
        otp: otp,
        verify_otp: true,
      },
    });

    if (!findUser) {
      throwError("Invalid OTP supplied", StatusCodes.BAD_REQUEST, true);
    }
    res.status(StatusCodes.OK).json({
      message: "OTP verified successfully",
    });
  } catch (error) {
    next(error);
  }
});

export const requestOtp = expressAsyncHandler(async (req, res, next) => {
  const errors = validationResult(req.body);

  if (!errors.isEmpty()) {
    throwError("Invalid inputs", StatusCodes.BAD_REQUEST, true);
  }

  try {
    const { email } = req.body;

    const findUser = await prisma.businessOwner.findUnique({
      where: { email: email },
    });

    if (!findUser) {
      throwError("user not found", StatusCodes.BAD_REQUEST, true);
    }
    const { token, secret } = await reqTwoFactorAuth();

    const userOtpupdate = await prisma.businessOwner.update({
      where: { email: findUser?.email as string },
      data: {
        otp_secret: secret.base32 as string,
        otp_trial: token,
        verify_otp: false,
      },
    });

    if (!userOtpupdate) {
      throwError("user not found", StatusCodes.BAD_REQUEST, true);
    }

    const content = `<p>Eter your OTP to complete your registration</p><h2>OTP: ${token}</h2>`;
    const subject = "Account Registration";

    await sendEmail(content, findUser?.email as string, subject);

    res.status(StatusCodes.OK).json({
      message: "OTP sent",
      token,
    });
  } catch (error) {
    next(error);
  }
});

export const loginUser = expressAsyncHandler(async (req, res, next) => {
  const errors = validationResult(req.body);

  if (!errors.isEmpty()) {
    throwError("Invalid inputs", StatusCodes.BAD_REQUEST, true);
  }

  try {
    const { password, email } = req.params;

    const findUser = await prisma.businessOwner.findUnique({
      where: {
        email: email,
      },
      include: {
        wallet: true,
      },
    });

    if (!findUser) {
      throwError("User not registered", StatusCodes.BAD_REQUEST, true);
    }
    await comparePassword(password, findUser?.password as string);
    const token = JWTToken(
      findUser?.email as string,
      findUser?.id as string,
      "BusinessOwner"
    );
    res.status(StatusCodes.OK).json({
      message: "Login succesful",
      token: token,
    });
  } catch (error) {
    next(error);
  }
});

export const updateProfile = expressAsyncHandler(
  async (req: any, res, next) => {
    const errors = validationResult(req.body);

    if (!errors.isEmpty()) {
      throwError("Invalid inputs", StatusCodes.BAD_REQUEST, true);
    }

    const { authId } = req;
    try {
      const { firstname, lastname, phone, email, accountNo } = req.body;

      const findUser = await prisma.businessOwner.findUnique({
        where: {
          id: authId as string,
        },
      });

      if (!findUser) {
        throwError("Invalid Business Owner", StatusCodes.BAD_REQUEST, true);
      }

      const updateUser = await prisma.businessOwner.update({
        where: { email: findUser?.email },
        data: {
          firstName: firstname,
          lastName: lastname,
          phone,
          email,
          accountNo,
        },
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          avatar: true,
          accountNo: true,
        },
      });
      if (!updateUser) {
        throwError("Server error", StatusCodes.BAD_REQUEST, true);
      }

      res.status(StatusCodes.OK).json({
        message: "profile updated successfully",

        updateUser,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const updateAvatar = expressAsyncHandler(async (req: any, res, next) => {
  const errors = validationResult(req.body);

  if (!errors.isEmpty()) {
    throwError("Invalid inputs", StatusCodes.BAD_REQUEST, true);
  }

  const { authId } = req;
  const { avatar } = req.body;
  try {
    const updatePics = await prisma.businessOwner.update({
      where: { id: authId },
      data: {
        avatar,
      },
      select: {
        avatar: true,
      },
    });

    if (!updatePics) {
      throwError("Server error", StatusCodes.BAD_REQUEST, true);
    }
    res.status(StatusCodes.OK).json({
      message: "profile updated successfully",
      updatePics,
    });
  } catch (error) {
    next(error);
  }
});

export const enablePin = expressAsyncHandler(async (req: any, res, next) => {
  const errors = validationResult(req.body);

  if (!errors.isEmpty()) {
    throwError("Invalid inputs", StatusCodes.BAD_REQUEST, true);
  }

  const { authId } = req;
  const { pin } = req.body;
  try {
    const updatePics = await prisma.businessOwner.update({
      where: { id: authId },
      data: {
        pin,
      },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        avatar: true,
        accountNo: true,
      },
    });

    if (!updatePics) {
      throwError("Server error", StatusCodes.BAD_REQUEST, true);
    }
    res.status(StatusCodes.OK).json({
      message: "Pin enabled successfully",
      updatePics,
    });
  } catch (error) {
    next(error);
  }
});

export const createClientProfile = expressAsyncHandler(
  async (req: any, res, next) => {
    const errors = validationResult(req.body);

    const { email, firstName, lastName, phone, country, state, city, address } =
      req.body;

    const { authId } = req;
    try {
      const findUser = await prisma.client.findFirst({
        where: {
          businessOwner_id: authId,
        },
      });

      if (!findUser) {
        throwError(
          "Client has been registered already by your business",
          StatusCodes.BAD_REQUEST,
          true
        );
      }
      const createClient = await prisma.client.create({
        data: {
          email,
          firstName,
          lastName,
          phone,
          country,
          state,
          city,
          address,
        },
      });
      if (!createClient) {
        throwError("Server error", StatusCodes.BAD_REQUEST, true);
      }
      res.status(StatusCodes.OK).json({
        message: "Client created successfully",
        createClient,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const updateClientAvatar = expressAsyncHandler(
  async (req: any, res, next) => {
    const errors = validationResult(req.body);

    if (!errors.isEmpty()) {
      throwError("Invalid inputs", StatusCodes.BAD_REQUEST, true);
    }

    const { avatar, clientId } = req.body;
    try {
      const updatePics = await prisma.client.update({
        where: { id: clientId },
        data: {
          avatar,
        },
      });

      if (!updatePics) {
        throwError("Server error", StatusCodes.BAD_REQUEST, true);
      }
      res.status(StatusCodes.OK).json({
        message: "profile  picture updated successfully",
        updatePics,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const updateClientProfile = expressAsyncHandler(
  async (req: any, res, next) => {
    const errors = validationResult(req.body);

    if (!errors.isEmpty()) {
      throwError("Invalid inputs", StatusCodes.BAD_REQUEST, true);
    }
    const { authId } = req;

    try {
      const {
        email,
        firstName,
        lastName,
        phone,
        country,
        state,
        city,
        address,
        clientId,
      } = req.body;

      const findUser = await prisma.businessOwner.findUnique({
        where: {
          id: authId as string,
        },
      });

      if (!findUser) {
        throwError("Invalid Business Owner", StatusCodes.BAD_REQUEST, true);
      }

      const clientUser = await prisma.client.findUnique({
        where: {
          id: clientId,
        },
      });

      if (clientUser?.businessOwner_id !== authId) {
        throwError("Invalid business owner", StatusCodes.BAD_REQUEST, true);
      }

      const updateUser = await prisma.client.update({
        where: { id: clientId },
        data: {
          email,
          firstName,
          lastName,
          phone,
          country,
          state,
          city,
          address,
        },
      });
      if (!updateUser) {
        throwError("Server error", StatusCodes.BAD_REQUEST, true);
      }

      res.status(StatusCodes.OK).json({
        message: "profile updated successfully",
        updateUser,
      });
    } catch (error) {
      next(error);
    }
  }
);
export const verifyKYC = expressAsyncHandler(async (req: any, res, next) => {
  const { authId } = req;

  try {
    const { firstname, email, lastname, password } = req.body;
    const owner = await prisma.businessOwner.findUnique({
      where: {
        id: authId,
      },
    });

    if (!owner) {
      throwError("Invalid business owner", StatusCodes.BAD_REQUEST, true);
    }

    const client = await complycube.client.create({
      type: "person",
      email: email,
      personDetails: {
        firstName: firstname,
        lastName: lastname,
      },
    });

    const { id } = client;

    const session = await complycube.flow.createSession(id, {
      checkTypes: [
        "extensive_screening_check",
        "identity_check",
        "document_check",
      ],
      successUrl: `http://localhost:3000/kyc?${email}+${password}+${authId}`,
      cancelUrl: "https://www.yoursite.com/cancel",
      theme: "light",
    });
  } catch (error) {}
});
export const updateKYC = expressAsyncHandler(async (req: any, res, next) => {
  try {
    const details = req.params.detail;
    const ownersDetails = details.split("+");
    const [email, password, id] = ownersDetails;

    const owner = await prisma.businessOwner.findUnique({
      where: {
        id: id,
        email: email,
      },
    });
    if (!owner) {
      throwError("Invalid business owner", StatusCodes.BAD_REQUEST, true);
    }
    await comparePassword(password, owner?.password as string);

    const updateBusinessOwner = await prisma.businessOwner.update({
      where: {
        email,
      },
      data: {
        KYC: true,
      },
    });

    if (!updateBusinessOwner) {
      throwError("Server error", StatusCodes.BAD_REQUEST, true);
    }

    res.redirect(`http://localhost:3000/kycsuccess`);
  } catch (error) {
    next(error);
  }
});
