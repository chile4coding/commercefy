"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    log: ["info", "warn"],
});
exports.default = prisma;
//# sourceMappingURL=prisma-client.js.map