const app = require("express")();
const server = require("http").createServer(app);
const { match } = require("assert");
const cors = require("cors");
const { Namespace } = require("socket.io");

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

const PORT = process.env.PORT || 5000;

// to detect how many users are connected
let clientNo = 0;
//let connectedClients = []

//Queue(s)
const queue = [];
const blitzQueue = []
//const upfQueue = []

app.get("/", (req, res) => {
  res.send(`Server is running.`);
});

io.on("connection", (socket) => {
  clientNo++;
  socket.emit("updateusers", clientNo);
  socket.broadcast.emit("updateusers", clientNo);
  //functionality to create and join a room specific to the connecting user.
  console.log(`${socket.id} has joined the server.`);
  let roomNo = Math.round(clientNo);
  socket.join(roomNo);
  socket.emit("roommake", roomNo);

  socket.emit("me", socket.id);
  socket.emit("updateusers", clientNo);

  socket.on("disconnect", () => {
    clientNo--;
    console.log(`${socket.id} has left the server`);
    // find an array ID that matches the disconnected user, then remove them from the queue.
    if (queue.length >= 1) {
      let foundUser = queue.findIndex((element) => element.id === socket.id);
      console.log(`the user found was ${foundUser}`);
      queue.splice(foundUser);
    }
    socket.broadcast.emit("updateusers", clientNo);
  });

  socket.on("calluser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("calluser", { signal: signalData, from, name });
  });

  socket.on("answercall", (data) => {
    io.to(data.to).emit("callaccepted", data.signal);
  });

  //Queue Functionalitys

  //Add users to queue + Check to see if Queue has enough users to start a match.
  socket.on("queuecc", ({ id, signalData, user, myRoomToQueue, rating }) => {
    let userToQueue = {
      id: id,
      name: user,
      room: myRoomToQueue,
      rating: rating,
    };
    console.log(userToQueue);
    queue.push(userToQueue);
    console.log(user);
    //emit back a function to disable UI behind a "queue pop-up"
    //io.to(id).emit("disableui");
    console.log(`Adding ${user} ${id} to queue`);
    console.log(queue);
    if (queue.length >= 2) {
      console.log(queue);
      let user1 = queue.shift();
      let user2 = queue.shift();

      console.log(user1);
      //console.log(user1.roomNo)
      console.log(user2);
      //console.log(user2.roomNo)

      io.to(user1.id).emit("setoppdetails", user2);
      io.to(user2.id).emit("setoppdetails", user1);

      io.to(user1.id).emit("calluser", {
        signal: signalData,
        from: user2.id,
        name: user2.name,
      });

      console.log(`starting match between ${user1} and ${user2}`);
    }
  });

//Add users to Blitz Queue
  socket.on("queueblitz", ({ id, signalData, user, myRoomToQueue, rating }) => {
    let userToQueue = {
      id: id,
      name: user,
      room: myRoomToQueue,
      rating: rating,
    };
    console.log(userToQueue);
    blitzQueue.push(userToQueue);
    console.log(user);
    //emit back a function to disable UI behind a "queue pop-up"
    //io.to(id).emit("disableui");
    console.log(`Adding ${user} ${id} to queue`);
    console.log(blitzQueue);
    if (blitzQueue.length >= 2) {
      console.log(blitzQueue);
      let user1 = blitzQueue.shift();
      let user2 = blitzQueue.shift();

      console.log(user1);
      //console.log(user1.roomNo)
      console.log(user2);
      //console.log(user2.roomNo)

      io.to(user1.id).emit("setoppdetails", user2);
      io.to(user2.id).emit("setoppdetails", user1);

      io.to(user1.id).emit("calluser", {
        signal: signalData,
        from: user2.id,
        name: user2.name,
      });

      console.log(`starting match between ${user1} and ${user2}`);
    }
  });

  // leave call functionality
  socket.on("leavecall", ({ me, oppID }) => {
    io.to(me).emit("callended");
    io.to(oppID).emit("callended");
  });

  socket.on("leavequeue", (me) => {
    let foundUser = queue.findIndex((element) => element.id === socket.id);
    console.log(`the user found was ${foundUser}`);
    //console.log(`the found users room is ${queue[foundUser].room}`)

    io.to(me).emit("callended");
    if (foundUser > -1) {
      queue.splice(foundUser, 1);
    } else {
        foundUser = blitzQueue.findIndex((element) => element.id === socket.id)
        if (foundUser > -1) {
            blitzQueue.splice(foundUser, 1);
          }
    }

  });

  socket.on("checkthequeue", () => {
    console.log(`CC Queue is: ${queue}`);
    console.log(`Blitz Queue is: ${blitzQueue}`);
    console.log(`the amount of clients connected is ${clientNo}`);
    // console.log(connectedClients)
  });


  //functionality to pass life totals between users.
  socket.on("mylifetotal", ({ newValue, oppID }) => {
    io.to(oppID).emit("opponentslife", newValue);
  });

  // join room functionality
  socket.on("joinroom", (room) => {
    socket.join(room);
    console.log(` user has joined ${room}`);

    socket.on("answercall", (data) => {
      io.to(data.to).emit("callaccepted", data.signal);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
