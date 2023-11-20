"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("../utills/helpers");
const errorHandler = (error, req, res, next) => {
    const message = error.message;
    const status = error.statusCode || 500;
    const errors = (0, express_validator_1.validationResult)(req);
    if ((0, helpers_1.isPrismaError)(error)) {
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
            error: error.message,
            errorStatus: http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR,
        });
    }
    else {
        res.status(status).json({
            message: message,
            error: "Error message",
            errorStatus: status,
            path: req.path,
        });
    }
    next();
};
exports.default = errorHandler;
//# sourceMappingURL=errorHandler.js.map