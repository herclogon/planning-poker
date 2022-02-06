var WebSocketServer = require("ws").Server; // webSocket library

// configure the webSocket server:
const wssPort = process.env.PORT || 8081; // port number for the webSocket server
const wss = new WebSocketServer({ port: wssPort }); // the webSocket server
var clients = new Array(); // list of client connections
var clientsTable = {}; // list of client connections

// ------------------------ webSocket Server functions
function handleConnection(client, request) {
  console.log("New Connection"); // you have a new client
  clients.push(client); // add this client to the clients array

  function endClient() {
    // when a client closes its connection
    // get the client's position in the array
    // and delete it from the array:
    var position = clients.indexOf(client);
    clients.splice(position, 1);

    // for (const clients of Object.values(clientsTable)) {
    //   var position = clients.indexOf(client);
    //   clients.splice(position, 1);
    // }
    console.log("connection closed");
  }

  // if a client sends a message, print it out:
  function clientResponse(data) {
    let message = JSON.parse(data);

    if (message.type === "register") {
      if (!clientsTable.hasOwnProperty(message.sessionId)) {
        clientsTable[message.sessionId] = [];
      }
      console.log("Store client to ", message.sessionId);
      clientsTable[message.sessionId].push(client);
    }

    console.log(data + "");
    broadcast(message.sessionId, data + "");
  }

  // set up client event listeners:
  client.on("message", clientResponse);
  client.on("close", endClient);
}

// This function broadcasts messages to all webSocket clients
function broadcast(sessionId, data) {
  // iterate over the array of clients & send data to each
  let clients = clientsTable[sessionId];
  for (c in clients) {
    clients[c].send(data);
  }
}

// listen for clients and handle them:
wss.on("connection", handleConnection);

var http = require("http");
var fs = require("fs");
var path = require("path");

http
  .createServer(function (request, response) {
    console.log("request starting...");

    var filePath = "." + request.url;
    if (filePath == "./") filePath = "./index.html";

    var extname = path.extname(filePath);
    var contentType = "text/html";
    switch (extname) {
      case ".js":
        contentType = "text/javascript";
        break;
      case ".css":
        contentType = "text/css";
        break;
      case ".json":
        contentType = "application/json";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".jpg":
        contentType = "image/jpg";
        break;
      case ".wav":
        contentType = "audio/wav";
        break;
    }

    fs.readFile(filePath, function (error, content) {
      console.log("error", error);
      if (error) {
        if (error.code == "ENOENT") {
          fs.readFile("./index.html", function (error, content) {
            response.writeHead(200, { "Content-Type": contentType });
            response.end(content, "utf-8");
          });
        } else {
          response.writeHead(500);
          response.end(
            "Sorry, check with the site admin for error: " +
              error.code +
              " ..\n"
          );
          response.end();
        }
      } else {
        response.writeHead(200, { "Content-Type": contentType });
        response.end(content, "utf-8");
      }
    });
  })
  .listen(8080);
console.log("Server running...");
