import expressAsyncHandler from "express-async-handler";
import Paystack from "paystack";
import prisma from "../configuration/prisma-client";
import { StatusCodes } from "http-status-codes";
import { throwError } from "../utills/helpers";
import crypto from "crypto"

import dotenv from "dotenv"
dotenv.config()
import { verify } from "crypto";
const paystack = Paystack(process.env.paystackAuthization as string);

export const payBusinessOwner = expressAsyncHandler(
  async (req: any, res, next) => {
    const { email, amount, name, invoiceNo, item } = req.body;
    const { authId } = req;

    console.log(req.body)
    console.log(authId)
    try {
      const owner =  await prisma.businessOwner.findUnique({
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

      //  register the status of this to the transaction

      const updateInvoice = await prisma.invoice.update({
        where: {
          id: invoiceNo,
        },
        data: {
          paymentLink: initPayment.data.authorization_url,
        },
      });

      const transactions = await prisma.transaction.create({
        data: {
          ref: invoiceRef.id,
          amount: Number(amount),
          status: "pending",
          businessOwner: { connect: { id: authId } },
          client: { connect: { id: invoiceRef?.client_id } },
          invoice: { connect: { id: invoiceRef?.id } },
        },
      });

      res.status(StatusCodes.OK).json({
        message: "Payment initialized",
        data: initPayment.data.authorization_url,
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

    console.log(clientId)
    try {
      const owner  = await prisma.businessOwner.findUnique({
        where:{id:authId}
      })
      // if(!owner?.KYC){
      //   throwError("Please complete your KYC", StatusCodes.BAD_REQUEST, true);

      // }
      const createInvoice = await prisma.invoice.create({
        data: {
          client: { connect: { id: clientId } },
          businessOwner: { connect: { id: authId } },
          date: `${new Date().toLocaleDateString("en-UK")}`,

          status: "pending",
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
        console.log(verifyPayment)

        updateTransactionStatus = await prisma.transaction.update({
          where: { ref: reference },
          data: {
            status: verifyPayment.data.status,
          },
        });
      } else {
        invoice = await prisma.invoice.update({
          where: { id: reference },
          data: {
            status: "failed",
          },
        });
        updateTransactionStatus = await prisma.transaction.update({
          where: { ref: reference },
          data: {
            status: verifyPayment.data.status,
          },
        });
      }

      const businessOwnerId = invoice.businessOwner_id;
      const clientId = invoice.client_id;
      const owner = await prisma.businessOwner.findUnique({
        where: { id: businessOwnerId },
        include:{
          wallet:true
        }
      });
      const wallletAmount  =Number( owner?.wallet?.balance)
      const transactionAmount = Number(verifyPayment?.data?.amount)

      if (invoice.status == "success") {
        const walletUpdate  =  await prisma.wallet.update({
          where:{id: owner?.wallet?.id},
          data:{
            balance: wallletAmount + transactionAmount
          }
        })

        res.status(StatusCodes.OK).json({
          message: "Payment verified successfully",
        });
      }else{
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


export const paystackEvents  =  expressAsyncHandler(async (req, res) => {


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

updateTransactionStatus = await prisma.transaction.update({
  where: { ref: reference },
  data: {
    status: status,
  },
});
      }


      if(event.event ==="charge.success" ||  event.event ==="transfer.success"){
        const { reference, status, amount } = event.data;
           const businessOwnerId = invoice?.businessOwner_id;
           const clientId = invoice?.client_id;
           const owner = await prisma.businessOwner.findUnique({
             where: { id: businessOwnerId },
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
      }

        // Do something with event

        console.log(event.data);
    }
})


// next you will have to work on the KYC verification process
