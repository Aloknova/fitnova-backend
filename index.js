import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("FitNova backend running 🚀");
});

app.post("/ai/chat", (req, res) => {
  const { message } = req.body;

  res.json({
    reply: "AI not connected yet",
    input: message
  });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
