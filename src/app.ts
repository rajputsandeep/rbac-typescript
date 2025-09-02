import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth';
import meRoutes from './routes/me';
import registerRoutes from "./routes/register";
import license from "./routes/license";

import { requireAuth } from './middleware/auth';
import { allowRoles } from './middleware/roleGuard';

import rateLimit from 'express-rate-limit';
import { errorHandler } from "./middleware/errorHandler";
const app = express();

app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
const allowedOrigins = [
  "https://synthora-dev.netlify.app",
  "http://localhost:3000"
];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps / curl) or if in allowed list
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-api-key",
      "X-Tenant-Id"
    ],
    exposedHeaders: ["Authorization", "X-Tenant-Id"]
  })
);

// Preflight
app.options("*", cors());

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routes
app.use('/auth', authRoutes);
app.use("/register", registerRoutes);
app.use('/', meRoutes);
app.use('/licenses', license);

app.use(errorHandler); // Global error handler
// Example protected route
app.get('/admin/ping', requireAuth, allowRoles('Admin'), (req, res) => {
  res.json({ ok: true, msg: 'admin pong', tenantId: req.user.tenantId });
});

export default app;
