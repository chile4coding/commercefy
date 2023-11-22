const Flutterwave = require("flutterwave-node-v3");
const flw = new Flutterwave(process.env.PUBLIC_KEY, process.env.SECRETE_KEY);
import expressAsyncHandler from "express-async-handler";

export const  transfer = expressAsyncHandler(async (req, rs, next) => {
  const { firstname, email, amount, phone } = req.body;

  //  generate a reference from the invoice database

  try {
      const payload = {
        tx_ref: "MC-1585230950508",
        amount: amount,
        email: email,
        phone_number: phone,
        currency: "NGN",
      };
      const response = await flw.Charge.bank_transfer(payload);

  } catch (error) {

    console.log(error)
    
  }
 
})


export const cardPay  = expressAsyncHandler(async (req, res, next) => {
    const  { firstname, email, lastname, cvv,amount, fullname, cardno } = req.body;

    console.log("jeool ===========")
    //  refrence the invoice database


     const payload: any = {
       card_number: "5531886652142950",
       cvv: "564",
       expiry_month: "09",
       expiry_year: "21",
       currency: "NGN",
       amount: "100",
       redirect_url: "https://www.google.com",
       fullname: "Flutterwave Developers",
       email: "developers@flutterwavego.com",
       phone_number: "09000000000",
       enckey: "FLWSECK_TEST9546a1b2d4e1",
       tx_ref: "example01",
     };
       const response = await flw.Charge.card(payload)
  
console.log(response)
   

        // For PIN transactions
        if (response.meta.authorization.mode === 'pin') {
            let payload2 = payload
            payload2.authorization = {
                "mode": "pin",
                "fields": [
                    "pin"
                ],
                "pin": 3310
            }
            const reCallCharge = await flw.Charge.card(payload2)

            console.log(reCallCharge)

            // Add the OTP to authorize the transaction
            const callValidate = await flw.Charge.validate({
                "otp": "12345",
                "flw_ref": reCallCharge.data.flw_ref
            })
     
    }
})