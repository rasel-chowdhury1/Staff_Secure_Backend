/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import router from './app/routes';
import notFound from './app/middleware/notfound';
import globalErrorHandler from './app/middleware/globalErrorhandler';
import serverHomePage from './app/helpers/serverHomePage';
import { logErrorHandler, logHttpRequests } from './app/utils/logger';
import path from 'path';
import fs from 'fs';
import { limiter } from './app/utils/limiter';

const app: Application = express();


/* ---------- Core middlewares ---------- */
app.use(express.static('public'));

app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cookieParser());



app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  }),
);

app.use(logHttpRequests);



app.use(limiter.rootlimiter); // 👈 root limiter


/* ---------- Routes ---------- */
app.use('/api/v1', router);

/* Dashboard (HTML) */
app.get('/',   async (_req: Request, res: Response) => {
  const htmlContent = await serverHomePage();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(htmlContent);
});


/* ---------- Error handling ---------- */
// Error handler middleware
app.use(logErrorHandler);

// Global error handler
app.use(globalErrorHandler);

app.use(notFound);           // 404 -> next(err) -> globalErrorHandler

export default app;
