import express from "express";
import subjectsRouter from "./db/routes/subjects";
import cors from "cors";

const app = express();
const port = 8000;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}))

app.use(express.json());

app.use('/api/subjects', subjectsRouter);

app.get("/", (_request, response) => {
  response.send("Classroom backend is running.");
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});