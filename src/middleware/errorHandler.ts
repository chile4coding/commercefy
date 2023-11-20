import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { StatusCodes } from "http-status-codes";
import { isPrismaError } from "../utills/helpers";


const errorHandler = (
  error: any,
  req: Request | any,
  res: Response,
  next: NextFunction
) => {
  const message = error.message;
  const status = error.statusCode || 500;
  const errors = validationResult(req);

  if (isPrismaError(error)) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Internal server error",
      error: error.message,
      errorStatus: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  } else {
    res.status(status).json({
      message: message,
      error: "Error message",
      errorStatus: status,
      path: req.path,
    });
  }
  next();
};

export default errorHandler;
