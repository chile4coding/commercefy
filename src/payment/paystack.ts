import expressAsyncHandler from "express-async-handler";
import Paystack from "paystack";
import prisma from "../configuration/prisma-client";
import { StatusCodes } from "http-status-codes";
import { sendEmail, throwError } from "../utills/helpers";
import crypto from "crypto";

import dotenv from "dotenv";
dotenv.config();
import { verify } from "crypto";
import axios from "axios";
import { socket } from "../server/server";

const paystack = Paystack(process.env.paystackAuthization as string);

export const payBusinessOwner = expressAsyncHandler(
  async (req: any, res, next) => {
    const {
      email,
      amount,
      name,
      invoiceNo,
      item,
      phone,
      address,
      subTotal,
      discount,
      tax,
    } = req.body;
    const { authId } = req;

    try {
      const owner = await prisma.businessOwner.findUnique({
        where: {
          id: authId,
        },
      });
      // if (!owner?.KYC) {
      //   throwError("Please complete your KYC", StatusCodes.BAD_REQUEST, true);
      // }
      const invoiceRef = await prisma.invoice.update({
        where: {
          id: invoiceNo,
        },
        data: {
          items: item,
          amountPaid: Number(amount),
          phone,
          address,
          subTotal,
          discount,
          tax,
          date: `${new Date().toLocaleDateString("en-UK")}`,
          status: "pending",
          email,
        },
      });
      if (!invoiceRef) {
        throwError("Error occured", StatusCodes.BAD_REQUEST, true);
      }
      const initPayment = await paystack.transaction.initialize({
        name: name,
        amount: Number(amount) * 100,
        email: email,
        reference: invoiceRef?.id as string,
        callback_url: `${process.env.base_url}/verify_payment`,
        authorization: `Bearer ${process.env.paystackAuthization}`,
      });

      console.log(initPayment);

      // if (!initPayment.data.authorization_urll) {
      //   throwError("Error occured", StatusCodes.BAD_REQUEST, true);
      // }
      //  register the status of this to the transaction

      const updateInvoice = await prisma.invoice.update({
        where: {
          id: invoiceNo,
        },
        data: {
          paymentLink: initPayment?.data?.authorization_url,
        },
      });
      const content = `<p>Click on the payment button to make your payment for your invoice</p>
      <h4>Invoice ID: ${invoiceRef?.id}</h4>
     <div> <a href="${initPayment.data.authorization_url}" style=" text-decoration: none; cursor: pointer; background-color: #00041C; color: white; padding: 10px 20px; border: none; border-radius: 4px;">Pay Now</a> </div>
      `;

      const subject = "Invoice Payment";

      await sendEmail(content, email, subject);
      // const transactions = await prisma.transaction.create({
      //   data: {
      //     ref: invoiceRef.id as string,
      //     amount: Number(amount),
      //     status: "pending",
      //     businessOwner: { connect: { id: authId as string } },
      //     client:{ connect:{ id: invoiceRef.id as string}},
      //     invoice: { connect: { id: invoiceRef?.id  as string} },
      //     date: `${new Date().toLocaleDateString("en-UK")}`,
      //   },
      // });

      res.status(StatusCodes.OK).json({
        message: "Payment initialized",
        initPayment,
      });
    } catch (error) {
      next(error);
    }
    //  also register this invoice and store it using the reference number find the invoice and then update the status
  }
);
export const generateInvoice = expressAsyncHandler(
  async (req: any, res, next) => {
    const { authId } = req;
    const { clientId } = req.body;

    console.log(authId)
 

    try {
      const owner = await prisma.businessOwner.findUnique({
        where: { id: authId },
      });

      console.log(owner)
      // if (!owner?.KYC) {
      //   throwError("Please complete your KYC", StatusCodes.BAD_REQUEST, true);
      // }
      const createInvoice = await prisma.invoice.create({
        data: {
        status:"pending",
        client:{connect:{id:clientId}},
        businessOwner:{connect:{id:authId}},
        date: `${new Date().toLocaleDateString("en-UK")}`,
         
        },
      });
      res.status(StatusCodes.OK).json({
        message: "Invoice created successfully",
        createInvoice,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const verifyPayment = expressAsyncHandler(
  async (req: any, res, next) => {
    const { reference } = req.query;

    try {
      const verifyPayment = await paystack.transaction.verify(reference);
      //  after payment is verified
      let invoice;
      let updateTransactionStatus;
      if (verifyPayment.data.status == "success") {
        invoice = await prisma.invoice.update({
          where: { id: reference },
          data: {
            status: verifyPayment.data.status,
          },
        });
        

        // updateTransactionStatus = await prisma.transaction.update({
        //   where: { ref: reference },
        //   data: {
        //     status: verifyPayment.data.status,
        //   },
        // });
      } else {
        invoice = await prisma.invoice.update({
          where: { id: reference },
          data: {
            status: "failed",
          },
        });
        // updateTransactionStatus = await prisma.transaction.update({
        //   where: { ref: reference },
        //   data: {
        //     status: verifyPayment.data.status,
        //   },
        // });
      }

      const businessOwnerId = invoice.businessOwner_id
      const clientId = invoice.client_id;
      const owner = await prisma.businessOwner.findUnique({
        where: { id: businessOwnerId as string },
        include: {
          wallet: true,
        },
      });
      const wallletAmount = Number(owner?.wallet?.balance);
      const transactionAmount = Number(verifyPayment?.data?.amount);

  
        socket.emit(`${owner?.id}`, owner);

      if (invoice.status == "success") {
        const walletUpdate = await prisma.wallet.update({
          where: { id: owner?.wallet?.id },
          data: {
            balance: wallletAmount + transactionAmount,
          },
        });

        res.status(StatusCodes.OK).json({
          message: "Payment verified successfully",
        });
      } else {
        res.status(StatusCodes.OK).json({
          message: "Payment failed",
        });
      }
      // fetch the invoice using the  trransaction reference
      // update the transaction transaction status
      // get the business owner and update the wallet if successful
      // update the invoice it  status  it self
    } catch (error) {
      next(error);
    }
  }
);

export const paystackEvents = expressAsyncHandler(async (req, res) => {
  const hash = crypto
    .createHmac("sha512", process.env.paystackAuthization as string)
    .update(JSON.stringify(req.body))
    .digest("hex");
  if (hash == req.headers["x-paystack-signature"]) {
    // Retrieve the request's body

    const event = req.body;
    let invoice;
    let updateTransactionStatus;

    if (
      event.event === "charge.success" ||
      event.event === "transfer.failed" ||
      event.event === "transfer.reversed" ||
      event.event === "transfer.success"
    ) {
      const { reference, status, amount } = event.data;

      invoice = await prisma.invoice.update({
        where: { id: reference },
        data: {
          status: status,
        },
      });

      // updateTransactionStatus = await prisma.transaction.update({
      //   where: { ref: reference },
      //   data: {
      //     status: status,
      //   },
      // });
      const owner = await prisma.businessOwner.findUnique({
        where: { id: invoice?.businessOwner_id as string },
        include: {
          wallet: true,
        },
      });

 
              socket.emit(`${owner?.id}`, owner);

    }

    if (
      event.event === "charge.success" ||
      event.event === "transfer.success"
    ) {
      const { reference, status, amount } = event.data;
      const businessOwnerId = invoice?.businessOwner_id;

      const clientId = invoice?.client_id;
      const owner = await prisma.businessOwner.findUnique({
        where: { id: businessOwnerId as string },
        include: {
          wallet: true,
        },
      });
      const wallletAmount = Number(owner?.wallet?.balance);
      const transactionAmount = Number(amount);

      const walletUpdate = await prisma.wallet.update({
        where: { id: owner?.wallet?.id },
        data: {
          balance: wallletAmount + transactionAmount,
        },
      });

   
             socket.emit(`${owner?.id}`, owner);

    }

    // Do something with event

    console.log(event.data);
  }
});

export const createTransferRecipient = expressAsyncHandler(async (req, res) => {
  const { name, accountNumber, bankCode } = req.body;

  try {
    const response = await axios.post(
      "https://api.paystack.co/transferrecipient",
      {
        type: "nuban",
        name: name,
        account_number: accountNumber,
        bank_code: bankCode,
      },
      {
        headers: {
          Authorization: "Bearer YOUR_PAYSTACK_SECRET_KEY",
          "Content-Type": "application/json",
        },
      }
    );

    // store that recipient code in the database of the business owner

    return response.data;
  } catch (error: any) {
    console.error(error.response.data);
    throw new Error("Failed to create transfer recipient");
  }
});

export const getBankCode = expressAsyncHandler(async (req, res, next) => {
  try {
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${process.env.paystackAuthization}`,
        "Content-Type": "application/json",
      },
    });
    const { data } = response;

    res.status(StatusCodes.OK).json({
      data,
    });
  } catch (error) {
    next(error);
  }
});

export const iniateTransfer = expressAsyncHandler(async (req, res, next) => {
  const { amount, recipient } = req.body;

  try {
    const response = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount: amount,
        recipient: recipient,
        reason: "Withdrawal",
      },
      {
        headers: {
          Authorization: "Bearer YOUR_PAYSTACK_SECRET_KEY",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    next(error);
  }
});

export const finalizeTransfer = expressAsyncHandler(async (req, res, next) => {
  const { otp, transferCode } = req.body;

  try {
    const response = await axios.post(
      `https://api.paystack.co/transfer/finalize_transfer/${transferCode}`,
      {
        otp: otp,
      },
      {
        headers: {
          Authorization: "Bearer YOUR_PAYSTACK_SECRET_KEY",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    next(error);
  }
});

// next you will have to work on the KYC verification process
