const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const config = require("./config");
const docs = require("./storage/documents");
const apiRouter = require("./routes/api");
const wopiRouter = require("./routes/wopi");

docs.ensureDirs();
try {
  docs.seedFromCorpus();
} catch (err) {
  console.warn("Corpus seed skipped:", err.message);
}

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser(config.sessionSecret));

// JSON for most routes; WOPI PutFile uses raw body on its own route
app.use((req, res, next) => {
  if (req.path.startsWith("/wopi/files/") && req.path.endsWith("/contents") && req.method === "POST") {
    return next();
  }
  express.json({ limit: "2mb" })(req, res, next);
});

// Simple lab user cookie — dedicated browser profiles for separate test users
app.use((req, _res, next) => {
  const userId = req.cookies.lab_user || req.headers["x-lab-user"];
  const user = config.users.find((u) => u.id === userId) || config.users[0];
  req.labUser = user;
  next();
});

app.post("/api/auth/login", express.json(), (req, res) => {
  const user = config.users.find((u) => u.id === req.body?.userId);
  if (!user) return res.status(400).json({ error: "unknown user" });
  res.cookie("lab_user", user.id, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ user });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.labUser });
});

app.use("/api", apiRouter);
app.use("/wopi", wopiRouter);

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Office collab lab harness listening on ${config.port}`);
  console.log(`  Browser UI:  ${config.browserUrl}`);
  console.log(`  Editor callback/WOPI base: ${config.publicUrl}`);
  console.log(`  Users: ${config.users.map((u) => u.id).join(", ")}`);
});
