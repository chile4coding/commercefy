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
import dotenv from "dotenv";
import axios from "axios";
import { socket } from "../server/server";
dotenv.config();
const { ComplyCube } = require("@complycube/api");
const complycube = new ComplyCube({
  apiKey: process.env.COMPLYCUBE_API_KEY,
});

export const createBusinessOwner = expressAsyncHandler(
  async (req, res, next) => {
    const { email, password } = req.body;
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
          email: email,

          verify_otp: false,
          otp_trial: token,
          otp_secret: secret.base32,
          password: hashedPassword,
        },
      });
      const content = `<p>Enter your OTP to complete your registration</p><h2>OTP: ${token}</h2>`;
      const subject = "Account Registration";
      await sendEmail(content, user.email, subject);
      await prisma.wallet.create({
        data: {
          balance: 0.0,
          holder: { connect: { id: user.id } },
        },
      });

      await prisma.businessProfile.create({
        data: {
          owner: { connect: { id: user.id } },
        },
      });

      res.status(200).json({
        message: "OTP sent to your email",
      });
    } catch (error) {
      next(error);
    }
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
    const { password, email } = req.body;

    const findUser = await prisma.businessOwner.findUnique({
      where: {
        email: email,
      },
      include: {
        wallet: true,
        business: true,
        client: {
          include: {
            invoice: true,
            transaction: true,
          },
        },
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
      findUser,
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
      const {
        firstname,
        lastname,
        phone,
        email,
        dateOfBirth,
        nationality,
        street,
        state,
        postalCode,
        occupation,
        city,
      } = req.body;

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
          dateOfBirth,
          nationality,
          street,
          state,
          postalCode,
          occupation,
          city,
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

export const createBusiness = expressAsyncHandler(
  async (req: any, res, next) => {
    const { authId } = req;
    const {
      businessName,
      name,
      accountNo,
      bankCode,
      businessReg,
      address,
      country,
      state,
      city,
      postalCode,
    } = req.body;

    try {
      const owner = await prisma.businessOwner.findUnique({
        where: { id: authId },
      });
      if (!owner?.KYC) {
        throwError("Please complete your KYC", StatusCodes.BAD_REQUEST, true);
      }
      const response = await axios.post(
        "https://api.paystack.co/transferrecipient",
        {
          type: "nuban",
          name: name,
          account_number: accountNo,
          bank_code: bankCode,
          currency: "NGN",
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.paystackAuthization}`,
            "Content-Type": "application/json",
          },
        }
      );

      const { data } = response;

      const business = await prisma.businessProfile.update({
        where: {
          owner_id: authId,
        },
        data: {
          recipientBankId: data?.data?.recipient_code,
          businessName,
          accountNo,
          bankCode,
          businessReg,
          address,
          country,
          state,
          city,
          postalCode,
        },
      });

      if (!business) {
        throwError("Server error", StatusCodes.BAD_REQUEST, true);
      }

      socket.emit(`${authId}business`, {
        notification: `New business  profile created`,
        desc: {
          time: new Date().getTime(),
          timeStamp: new Date().toISOString(),
          link: "/businessprofile",
        },
      });
      res.status(StatusCodes.OK).json({
        message: "Business updated successfully",
        business,
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
  const owner = await prisma.businessOwner.findUnique({
    where: {
      id: authId,
    },
  });

  if (!owner?.KYC) {
    throwError("Please complete your KYC", StatusCodes.BAD_REQUEST, true);
  }
  const { pin } = req.body;
  if (pin.length !== 4) {
    throwError("Invalid pin", StatusCodes.BAD_REQUEST, true);
  }
  try {
    const updatePics = await prisma.businessOwner.update({
      where: { id: authId },
      data: {
        pin,
        is_pin_enabled: true,
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
    if (!errors.isEmpty()) {
      throwError("Invalid inputs", StatusCodes.BAD_REQUEST, true);
    }

    const { email, name, phone, address } = req.body;

    const { authId } = req;
    try {
      const findUser = await prisma.client.findUnique({
        where: {
          email,
        },
      });

      if (findUser?.businessOwner_id === authId) {
        throwError(
          "Client has been registered already by your business",
          StatusCodes.BAD_REQUEST,
          true
        );
      }
      const clienExist = await prisma.client.findUnique({
        where: { email: email },
      });
      if (clienExist) {
        throwError("Client already exist", StatusCodes.BAD_REQUEST, true);
      }
      const createClient = await prisma.client.create({
        data: {
          email,
          phone,
          name,
          address,
          businessOwner: {
            connect: {
              id: authId,
            },
          },
        },
      });

      if (!createClient) {
        throwError("Server error", StatusCodes.BAD_REQUEST, true);
      }
      await prisma.notifications.create({
        data: {
          notification: `New client  profile created`,
          desc: {
            time: new Date().getTime(),
            timeStamp: new Date().toISOString(),
            link: "/clients",
          },
          businessOwner: { connect: { id: authId } },
        },
      });

      socket.emit(`${authId}client`, {
        notification: `New client  profile created`,
        desc: {
          time: new Date().getTime(),
          timeStamp: new Date().toISOString(),
          link: "/clients",
        },
      });

      res.status(StatusCodes.OK).json({
        message: "Client created successfully",
        createClient,
      });
    } catch (error) {
      console.log(error);
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
      const { email, name, phone, address, clientId } = req.body;

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
          name,
          phone,
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
      successUrl: `${process.env.base_url}/verify_kyc?detail=${email}+${authId}`,
      cancelUrl: "https://commercefyhere.netlify.app/dashboard",
      theme: "light",
    });

    res.status(StatusCodes.OK).json({
      session,
    });
  } catch (error) {}
});
export const updateKYC = expressAsyncHandler(async (req: any, res, next) => {
  const details = req.query.detail;
  const ownersDetails = details.split(" ");
  const [email, id] = ownersDetails;

  try {
    const owner = await prisma.businessOwner.findUnique({
      where: {
        id: id,
        email: email,
      },
    });

    if (!owner) {
      throwError("Invalid business owner", StatusCodes.BAD_REQUEST, true);
    }

    const updateBusinessOwner = await prisma.businessOwner.update({
      where: {
        email: owner?.email,
      },
      data: {
        KYC: true,
      },
    });

    if (!updateBusinessOwner) {
      throwError("Server error", StatusCodes.BAD_REQUEST, true);
    }

    await prisma.notifications.create({
      data: {
        notification: `Your KYC has been verified`,
        desc: {
          time: new Date().getTime(),
          timeStamp: new Date().toISOString(),
          link: "/dashboard",
        },
        businessOwner: { connect: { id: owner?.id } },
      },
    });

    socket.emit(`${owner?.id}kyc`, {
      notification: `Your KYC has been verified`,
      desc: {
        time: new Date().getTime(),
        timeStamp: new Date().toISOString(),
        link: "/dashboard",
      },
    });

    res.redirect(`https://commercefyhere.netlify.app/dashboard`);
  } catch (error) {
    next(error);
  }
});

export const getOwner = expressAsyncHandler(async (req: any, res, next) => {
  const { authId } = req;
  try {
    const owner = await prisma.businessOwner.findUnique({
      where: { id: authId },
      include: {
        wallet: true,
        business: true,
        businessTransactions: true,
        client: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!owner) {
      throwError("Unathoarized user", StatusCodes.BAD_REQUEST, true);
    }

    res.status(StatusCodes.OK).json({
      message: "user fetched successfully",
      owner,
    });
  } catch (error) {
    next(error);
  }
});
export const getClients = expressAsyncHandler(async (req: any, res, next) => {
  const { authId } = req;
  try {
    const owner = await prisma.businessOwner.findUnique({
      where: { id: authId },
      include: {
        client: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!owner) {
      throwError("Unathoarized user", StatusCodes.BAD_REQUEST, true);
    }
    if (!owner?.KYC) {
      throwError("Complete your KYC", StatusCodes.BAD_REQUEST, true);
    }
    const clients = owner?.client;

    res.status(StatusCodes.OK).json({
      message: "user fetched successfully",
      clients,
    });
  } catch (error) {
    next(error);
  }
});
export const getSpecificClientInvoice = expressAsyncHandler(
  async (req: any, res, next) => {
    const { authId } = req;
    const { clientid } = req.query;
    try {
      const owner = await prisma.businessOwner.findUnique({
        where: { id: authId },
        include: {
          client: {
            include: {
              invoice: true,
            },
          },
        },
      });

      if (!owner) {
        throwError("Unathoarized user", StatusCodes.BAD_REQUEST, true);
      }
      if (!owner?.KYC) {
        throwError("Complete your KYC", StatusCodes.BAD_REQUEST, true);
      }

      const invoices = await prisma.invoice.findMany({
        where: {
          client_id: clientid,
        },
      });
      res.status(StatusCodes.OK).json({
        message: " invoices fetched successfully",
        invoices,
      });
    } catch (error) {
      next(error);
    }
  }
);
export const getSpecificInvoice = expressAsyncHandler(
  async (req: any, res, next) => {
    const { authId } = req;
    const { invoiceId } = req.query;
    try {
      const owner = await prisma.businessOwner.findUnique({
        where: { id: authId },
        include: {
          client: {
            include: {
              invoice: true,
            },
          },
        },
      });

      if (!owner) {
        throwError("Unathoarized user", StatusCodes.BAD_REQUEST, true);
      }
      if (!owner?.KYC) {
        throwError("Complete your KYC", StatusCodes.BAD_REQUEST, true);
      }

      const invoices = await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
        },
      });
      res.status(StatusCodes.OK).json({
        message: " invoices fetched successfully",
        invoices,
      });
    } catch (error) {
      next(error);
    }
  }
);
export const getInvoices = expressAsyncHandler(async (req: any, res, next) => {
  const { authId } = req;

  try {
    const owner = await prisma.businessOwner.findUnique({
      where: { id: authId },
      include: {
        client: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!owner) {
      throwError("Unathoarized user", StatusCodes.BAD_REQUEST, true);
    }
    if (!owner?.KYC) {
      throwError("Complete your KYC", StatusCodes.BAD_REQUEST, true);
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        businessOwner_id: authId,
      },
    });
    res.status(StatusCodes.OK).json({
      message: " invoices fetched successfully",
      invoices,
    });
  } catch (error) {
    next(error);
  }
});
export const getWithdrawals = expressAsyncHandler(
  async (req: any, res, next) => {
    const { authId } = req;

    try {
      const owner = await prisma.businessOwner.findUnique({
        where: { id: authId },
        include: {
          client: {
            include: {
              invoice: true,
            },
          },
        },
      });

      if (!owner) {
        throwError("Unathoarized user", StatusCodes.BAD_REQUEST, true);
      }
      if (!owner?.KYC) {
        throwError("Complete your KYC", StatusCodes.BAD_REQUEST, true);
      }

      const withdraw = await prisma.withdrawal.findMany({
        where: {
          businessOwner_id: authId,
        },
      });
      res.status(StatusCodes.OK).json({
        message: " invoices fetched successfully",
        withdraw,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const getNotifications = expressAsyncHandler(
  async (req: any, res, next) => {
    const { authId } = req;

    try {
      const notification = await prisma.notifications.findMany({
        where: { businessOwner_id: authId },
      });

      res.status(StatusCodes.OK).json({
        notification,
      });
    } catch (error) {
      next(error);
    }
  }
);
export const deleteNotification = expressAsyncHandler(
  async (req: any, res, next) => {
    const { authId } = req;
    const id  =  req.body.note

    try {
      const notification = await prisma.notifications.delete({
        where: { id:id },
      });

      res.status(StatusCodes.OK).json({
        notification,
      });
    } catch (error) {
      next(error);
    }
  }
);
export const clearNotification = expressAsyncHandler(
  async (req: any, res, next) => {
    const { authId } = req;
   

    try {
      const notification = await prisma.notifications.deleteMany({
        where: { id:authId },
      });

      res.status(StatusCodes.OK).json({
        notification,
      });
    } catch (error) {
      next(error);
    }
  }
);
