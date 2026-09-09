const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config");

const authRoutes = require("./routes/auth");
const categoriesRoutes = require("./routes/categories");
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const reviewsRoutes = require("./routes/reviews");
const usersRoutes = require("./routes/users");
const uploadsRoutes = require("./routes/uploads");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.frontendOrigin === "*" ? true : config.frontendOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/uploads", uploadsRoutes);

// Единая обработка ошибок — чтобы упавший запрос не ронял процесс и не
// отдавал клиенту голый стек-трейс.
app.use((err, req, res, next) => {
  console.error("[unhandled]", err);
  res.status(err.status || 500).json({ error: err.message || "Внутренняя ошибка сервера" });
});

app.listen(config.port, () => {
  console.log(`[server] КомпМастер API запущен на порту ${config.port} (${config.nodeEnv})`);
});
