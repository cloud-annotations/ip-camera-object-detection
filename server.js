const path = require("path");
const { spawn } = require("child_process");

const ws = require("ws");
const express = require("express");
const app = express();

const STREAM_URL =
  "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov";

const PROTOCOL = "http";
const HOST = "localhost";
const PORT = 3000;
const VERBOSE = true;

app.use(express.static(path.join(__dirname, "public")));

// Listen to ffmpeg.
app.post("/stream", (req, res) => {
  // Don't timeout, this connection is infinate.
  res.connection.setTimeout(0);

  // Pipe the data to the clients in the WebSocket.
  req.on("data", (data) => {
    wsServer.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(data);
      }
    });
  });
});

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
const wsServer = new ws.Server({ server: server });

// Start ffmpeg.
const ffmpeg = spawn("ffmpeg", [
  "-hide_banner",
  "-i",
  STREAM_URL,
  "-f",
  "mpegts",
  "-codec:v",
  "mpeg1video",
  // "-s",
  // "640x480",
  "-b:v",
  "800k",
  "-bf",
  "0",
  "-r",
  "20",
  `${PROTOCOL}://${HOST}:${PORT}/stream`,
]);

ffmpeg.stderr.on("data", (data) => {
  if (VERBOSE) {
    console.log(`${data}`);
  }
});

// Safely fill ffmpeg
const exitHandler = (options) => {
  if (options.cleanup) {
    ffmpeg.stderr.pause();
    ffmpeg.stdout.pause();
    ffmpeg.stdin.pause();
    ffmpeg.kill();
  }
  if (options.exit) {
    process.exit();
  }
};

process.on("exit", exitHandler.bind(null, { cleanup: true }));
process.on("SIGINT", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));
process.on("uncaughtException", exitHandler.bind(null, { exit: true }));
