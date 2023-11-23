import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import prisma from "./configuration/prisma-client";
import morgan from "morgan";
import router from "./route/route";
import errorHandler from "./middleware/errorHandler";
import { SocketServer, expressServer } from "./server/server";
import { app } from "./server/server";
// const Flutterwave = require("flutterwave-node-v3");
// const flw = new Flutterwave(process.env.PUBLIC_KEY, process.env.SECRETE_KEY);
// import Paystack from "paystack";
// import axios from "axios";
// import { cardPay } from "./payment/flutterwave";
// const request = require("request");
// const paystack = Paystack(process.env.paystackAuthization as string);

dotenv.config();


app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(router);

// app.post("/create", async (req, res, next) => {});
// app.post("/create", async (req, res, next) => {
//   const check = await complycube.check.get("CHECK_ID");
// });
// function generateUniqueReferenceNumber() {
//   const timestamp = Date.now();
//   const randomNumber = Math.random().toString().slice(2);
//   const referenceNumber = `${timestamp}${randomNumber}`;
//   return referenceNumber;
// }

// app.get("/pay", cardPay);
// app.post("/creat", async (req, res, next) => {
//   // try {
//   //   const payload = {
//   //     tx_ref: "MC-1585230950508",
//   //     amount: "1500",
//   //     email: "johnmadakin@gmail.com",
//   //     phone_number: "054709929220",
//   //     currency: "NGN",

//   //   };

//   //   const response = await flw.Charge.bank_transfer(payload);
//   //   console.log(response);
//   // } catch (error) {
//   //   console.log(error);
//   // }

//   const init = await paystack.transaction.initialize({
//     name: "chile omereji",
//     amount: 500 * 100,
//     email: "chileomereji@gmail.com",
//     reference: `${generateUniqueReferenceNumber()}`,
//     callback_url: "http://localhost:3000/getPay",
//     subaccount: "ACCT_kd21pnf60bk9tn9",
//     authorization: `Bearer ${process.env.paystackAuthization}`,
//   });

//   res.status(200).json({
//     init,
//   });
// });

// app.get("/getPay", async (req, res, next) => {
//   const { reference } = req.query;

//   const verifyPay = await paystack?.transaction?.verify(reference as string);

//   res.status(200).json({
//     verifyPay,
//   });
// });

// app.get("/splita", async (r, q) => {
//   try {
//     const response = await axios.post(
//       "https://api.paystack.co/transfer",
//       {
//         source: "balance",
//         amount: 50000,
//         recipient: "CUS_45o1ubq4yr4rdt3",
//         reason: "Payout to subaccount",
//       },
//       {
//         headers: {
//           Authorization: `Bearer sk_test_57d4c7dd905cdc0097aa67934861e2444ed92711`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log(response.data);
//     q.status(200).json({
//       response,
//     });
//   } catch (error: any) {
//     console.error(error.response.data);
//   }
//   // const https = require("https");

//   // const params = JSON.stringify({
//   //   name: "Percentage Split",
//   //   type: "percentage",
//   //   currency: "NGN",
//   //   subaccounts: [
//   //     {
//   //       subaccount: "ACCT_kd21pnf60bk9tn9",
//   //       share: 20,
//   //     },
//   //   ],
//   //   bearer_type: "subaccount",
//   //   bearer_subaccount: "ACCT_kd21pnf60bk9tn9",
//   // });

//   // const options = {
//   //   hostname: "api.paystack.co",
//   //   port: 443,
//   //   path: "/split",
//   //   method: "POST",
//   //   headers: {
//   //     Authorization:
//   //       "Bearer sk_test_57d4c7dd905cdc0097aa67934861e2444ed92711",
//   //     "Content-Type": "application/json",
//   //   },
//   // };

//   // const req = https
//   //   .request(options, (res:any) => {
//   //     let data = "";

//   //     res.on("data", (chunk:any) => {
//   //       data += chunk;
//   //     });

//   //     res.on("end", () => {
//   //       console.log(JSON.parse(data));
//   //     });
//   //   })
//   //   .on("error", (error:any) => {
//   //     console.error(error);
//   //   });

//   // req.write(params);
//   // req.end();
// });
// app.get("/py", (req, res) => {
//   res.send("hello");
// })

app.use(errorHandler);
SocketServer()
expressServer.listen(process.env.PORT, async () => {
  try {
    await prisma.$connect();
  } catch (error) {
    console.log(error);
  }
  console.log("Server started on port 3000");
});

