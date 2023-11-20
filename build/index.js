"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const prisma_client_1 = __importDefault(require("./configuration/prisma-client"));
const morgan_1 = __importDefault(require("morgan"));
const { ComplyCube } = require("@complycube/api");
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
dotenv_1.default.config();
const complycube = new ComplyCube({
    apiKey: "test_dWpqTTg4dm1OekhKU01pb3k6YTU3MDdlZGI5ODhlNTk3NTViNjk2OWYyYzk1NWYwOWY1MjY1MGQwOTAyYzA3MTM5MTcyY2MyN2E2OWQ1YTYwNQ==",
});
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use((0, morgan_1.default)("dev"));
app.post("/create", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { firstname, email, lastname } = req.body;
    const client = yield complycube.client.create({
        type: "person",
        email: email,
        personDetails: {
            firstName: firstname,
            lastName: lastname,
        },
    });
    const { id } = client;
    const token = yield complycube.token.generate(id, {
        referrer: "https://www.example.com/*",
    });
    console.log(client);
    res.status(200).json({
        token,
    });
}));
app.post("/create", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const check = yield complycube.check.get("CHECK_ID");
}));
app.use(errorHandler_1.default);
app.listen(3000, () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_client_1.default.$connect();
    }
    catch (error) {
        console.log(error);
    }
    console.log("Server started on port 3000");
}));
//# sourceMappingURL=index.js.map