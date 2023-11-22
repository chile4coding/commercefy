import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Jwt from "jsonwebtoken";
import { Error } from "../utills/helpers";
import { throwError } from "../utills/helpers";
import dotenv from "dotenv";
dotenv.config();

export default (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.get("Authorization");

    if (!authHeader) {
      throwError("No token provided", StatusCodes.UNAUTHORIZED);
    }
    let decode: any;
    const token = authHeader?.split(" ")[1];
    decode = Jwt.verify(token as string, `${process.env.JWT_SECRET_KEY}`);

    if (!token || !decode) {
      throwError("Invalid token", StatusCodes.UNAUTHORIZED);
    }
    req.authId = decode.authId;
    req.role = decode.role;

    next();
  } catch (error) {
    const errorResponse: Error = new Error("Not authorized");
    errorResponse.statusCode = StatusCodes.UNAUTHORIZED;
    next(errorResponse);
  }
};
