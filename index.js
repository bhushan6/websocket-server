const express = require("express");
const app = express();

const expressWs = require("express-ws")(app);
const aWss = expressWs.getWss("/");

app.use(express.static("public"));

const clients = [];
const room = new Array(255);

const timeouts = new Array(255)

const ping = (ws, i) => {
  const intervalId = setInterval(() => {
    const tId = setTimeout(() => {
      remove(ws);
      broadcast(ws, Buffer.from([ws._id, 8]));
      intervalId && clearInterval(intervalId);
    }, 12000);

    if(timeouts[i]){
      timeouts[i].push(tId)
    }else{
      timeouts[i] = [tId]
    }
    const data = Buffer.allocUnsafe(1 + 1);
    data.writeUInt8(i, 0)
    data.writeUInt8(2, 1);
    ws.send(data);
  }, 3000);
};

const pong = (id) => {
  if(timeouts[id]){
    let length = timeouts[id].length
    timeouts[id].forEach(ti => clearTimeout(ti))
    timeouts[id].splice(0, length)
  }
};

function add(ws, data) {
  clients.push({ ws, data });

  
  for (let i = 0; i < room.length; i++) {
    if (room[i] === undefined) {
      ws._id = i;
      room[i] = { ws, data };
      ping(ws, i);
      room.forEach((user, i) => {
        if (user) {
          user.data.writeUInt8(user.ws._id, 0);
          user && user.ws !== ws && ws.send(user.data);
        }
      });

      broadcast(ws, data);
      return;
    }
  }
}

function remove(ws) {
  broadcast(ws, Buffer.from([ws._id, 4]));

  for (let index = 0; index < clients.length; index++) {
    if (clients[index] && clients[index].ws === ws) {
      clients.splice(index, 1);
    }
  }

  for (let index = 0; index < room.length; index++) {
    if (room[index] && room[index].ws === ws) {
      room[index] = undefined;
    }
  }
}

function broadcast(ws, data) {
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    if (client && client.ws !== ws && client.ws.readyState === client.ws.OPEN)
      client.ws.send(data);
  }
}

app.use("/", (req, res) => {
  console.log("on home route")
  res.json({message: "HELLO"})
})

app.ws("/", function (ws, request) {
  ws.on("close", function () {
    remove(ws);
    broadcast(ws, Buffer.from([ws._id, 8]));
  });

  ws.on("message", function (data) {
    if( data[1] === 2 ){
      const id = data[0]
      pong(id)
      return
    }
    data.writeUInt8(ws._id, 0);
    if (data[1] === 3) {
      add(ws, data);
      broadcast(ws, data);
    } else if (data[1] === 1) {
      broadcast(ws, data);
    } else if (data[1] === 4) {
      broadcast(ws, data);
    }
  });
});

const listener = app.listen(8000, function () {
  console.log("Listening on port......" + listener.address().port);
});
