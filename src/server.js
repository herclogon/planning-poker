//
// Starting a simple WebSocket broadcast server.
//
var WebSocketServer = require("ws").Server; // webSocket library

// Configure the webSocket server.
const wsPort = process.env.WS_PORT || 8081; // port number for the webSocket server
const ws = new WebSocketServer({ port: wsPort }); // the webSocket server
var clients = new Array(); // list of client connections
var clientsBySessionId = {}; // list of client connections by session id

//  WebSocket Server handlers.
function handleConnection(client, request) {
  console.log("New Connection"); // you have a new client
  clients.push(client); // add this client to the clients array

  function endClient() {
    // when a client closes its connection
    // get the client's position in the array
    // and delete it from the array:
    var position = clients.indexOf(client);
    clients.splice(position, 1);

    // TODO(dmitry.golubkov): Purge clientsBySessionId.
    // for (const clients of Object.values(clientsTable)) {
    //   var position = clients.indexOf(client);
    //   clients.splice(position, 1);
    // }
    console.log("connection closed");
  }

  function clientResponse(data) {
    let message = JSON.parse(data);

    if (message.type === "register") {
      if (!clientsBySessionId.hasOwnProperty(message.sessionId)) {
        clientsBySessionId[message.sessionId] = [];
      }
      console.log("Store client to ", message.sessionId);
      clientsBySessionId[message.sessionId].push(client);
    }

    broadcast(message.sessionId, data + "");
  }

  // Set up client event listeners:
  client.on("message", clientResponse);
  client.on("close", endClient);
}

// This function broadcasts messages to all webSocket clients in particular
// session.
function broadcast(sessionId, data) {
  // Iterate over the array of clients & send data to each.
  let clients = clientsBySessionId[sessionId];
  for (c in clients) {
    clients[c].send(data);
  }
}

// Listen for clients and handle them.
ws.on("connection", handleConnection);
console.log(`Websocket server is running on port ${wsPort}...`);

//
// Starting a simple HTTP server to serve static files.
//
var http = require("http");
var fs = require("fs");
var path = require("path");

const httpPort = process.env.HTTP_PORT || 8080; // port number for the webSocket server

http
  .createServer(function (request, response) {
    var webRoot = __dirname;
    var filePath = webRoot + request.url;
    if (filePath == webRoot + "/") filePath = webRoot + "/index.html";

    // Custom URL to provide config to the UI.
    if (request.url === "/.ui_config") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          websocketPort: process.env.WS_PORT,
        }),
        "utf-8"
      );
      return;
    }

    var extname = path.extname(filePath);
    var contentType = "text/html";
    switch (extname) {
      case ".ico":
        contentType = "image/x-icon";
        break;
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
      console.error("Content read error", error);
      if (error) {
        if (error.code == "ENOENT") {
          // If file is not found send the default page instead.
          // Uses to handle URLs like <origin>/<session_id>.
          fs.readFile(webRoot + "/index.html", function (error, content) {
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
  .listen(httpPort);
console.log(`HTTP server is running on port ${httpPort}...`);

// Exit on Ctrl+C.
process.on("SIGINT", function () {
  console.log("Caught interrupt signal");
  process.exit();
});
