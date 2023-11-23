import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
export const app = express();
export const expressServer = createServer(app);
const io = new Server(expressServer);
let socketEvent: any;
export const socket = io;
export function SocketServer() {

 
  io.on("connection", (socket: Socket) => {
    
    console.log("A device has connected check it ======== ", socket.id)
  });
  return socketEvent;
}

