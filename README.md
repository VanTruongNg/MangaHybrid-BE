 # MangaHybrid-BE

 Backend API for the MangaHybrid application built with NestJS and TypeScript.

 This repository implements the server-side application used by the frontend and mobile apps for managing manga, chapters, users, comments, ratings, notifications, queues, websockets and AWS uploads.

 ## Tech stack

 - Node.js + TypeScript
 - NestJS framework
 - MongoDB (via Mongoose)
 - Redis / Bull for queues
 - Socket.IO for realtime
 - AWS S3 SDK for file storage

 ## Quick links

 - Frontend: https://github.com/VanTruongNg/MangaHybrid-FE
 - Mobile: https://github.com/VanTruongNg/MangaHybrid-MOBILE

 ## Prerequisites

 - Node.js (>= 18 recommended)
 - Yarn or npm
 - MongoDB server (or MongoDB Atlas)
 - Redis server (for bull queue and socket scaling)

 ## Environment variables

 Create a `.env` file at the project root or provide env values in your deployment. The project expects (common examples):

 - PORT - server port (default 3000)
 - MONGO_URI - MongoDB connection string
 - JWT_SECRET - secret for signing JWTs
 - JWT_EXPIRES_IN - jwt expiration (e.g. 7d)
 - REFRESH_TOKEN_SECRET - refresh token secret
 - REDIS_URL - Redis connection URL (or REDIS_HOST/PORT)
 - AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET - for S3 uploads
 - EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS - for nodemailer

 Check the code (in `src/config` or `@nestjs/config` usage) for any additional application-specific variables.

 ## Install

 Using Yarn:

 ```powershell
 yarn install
 ```

 Or npm:

 ```powershell
 npm install
 ```

 ## Available scripts

 The repository `package.json` defines the following scripts (and their purpose):

 - `build` - build the project (Nest CLI) -> `nest build`
 - `start` - run the built app -> `node dist/main`
 - `start:dev` - run in development mode with watch -> `nest start --watch`
 - `start:debug` - run with debugger and watch -> `nest start --debug --watch`
 - `start:prod` - start production (node dist/main)
 - `prestart:prod` - runs `yarn build` before `start:prod`
 - `lint` - runs ESLint and attempts to auto-fix
 - `format` - format code via Prettier
 - `test` - run Jest tests
 - `test:watch` - run Jest in watch mode
 - `test:cov` - run tests with coverage
 - `test:e2e` - run e2e tests using `test/jest-e2e.json`

 Example (dev):

 ```powershell
 yarn start:dev
 ```

 Build and run production:

 ```powershell
 yarn build; yarn start
 ```

 ## Project structure (high level)

 - `src/` — application source
   - `auth/` — authentication (JWT, guards, strategies, DTOs)
   - `aws/` — AWS related services (S3 upload)
   - `manga/`, `chapters/`, `genres/`, `comment/`, `rating/` — domain modules
   - `notification/`, `messqueue/` — notifications and task queue processors
   - `websocket/` — websocket gateway and module
   - `user/`, `search/`, `chat-room/` — other features
 - `test/` — e2e tests

 This is not exhaustive; see the `src` folder for full module lists. The application follows standard NestJS module/controller/service organization.

 ## Dependencies (high-level)

 Notable runtime dependencies (from package.json):

 - `@nestjs/*` - NestJS framework packages
 - `mongoose`, `mongodb` - MongoDB / Mongoose
 - `bull`, `bullmq` - queues
 - `ioredis` - Redis client
 - `socket.io` - realtime
 - `@aws-sdk/client-s3` - AWS S3 client
 - `class-validator` / `class-transformer` - DTO validation
 - `bcryptjs`, `passport`, `passport-jwt` - auth
 - `sharp` - image processing

 Dev dependencies include TypeScript, ts-node, jest, eslint, prettier and Nest CLI tooling.

 ## Running tests

 Unit & integration tests (Jest):

 ```powershell
 yarn test
 yarn test:watch
 yarn test:cov
 ```

 E2E tests:

 ```powershell
 yarn test:e2e
 ```

 ## Linting & formatting

 ```powershell
 yarn lint
 yarn format
 ```

 ## Notes for development

 - Files are compiled to `dist/` (controlled by `tsconfig.json`).
 - Environment configuration uses `@nestjs/config` — check `src` for config modules.
 - If you use queues (Bull), ensure Redis is running and `REDIS_URL` or host/port settings are correct.
 - If you use AWS upload features, verify S3 credentials and bucket names.

 ## Contributing

 Open issues or create pull requests. Keep changes small and focused. Follow existing code style and run lint/tests before committing.

 ## License

 This project currently lists `UNLICENSED` in package.json. Change or add a license if you intend to publish.

 ---

 If you want, I can also:

 - add a sample `.env.example` file listing required environment variables,
 - add a short `Makefile` or `ps1` helper script for Windows dev commands,
 - or generate a small `docs` folder with API overview based on controllers.

 Let me know which of these you'd like next.
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

<p align="center">
  A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.
</p>

<p align="center">
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
  <a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
  <a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
  <a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
  <a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
  <a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
  <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>

---

## 🧠 Description

This is a [NestJS](https://nestjs.com/) server-side application written in TypeScript. It provides the backend logic and APIs for a full-stack application.

## 🔗 Related Projects

- 🌐 **Frontend (Next.js)**: [https://github.com/VanTruongNg/MangaHybrid-FE](https://github.com/VanTruongNg/MangaHybrid-FE)
- 📱 **Mobile App**: [https://github.com/VanTruongNg/MangaHybrid-MOBILE](https://github.com/VanTruongNg/MangaHybrid-MOBILE)

## 🚀 Installation

```bash
# install dependencies
$ yarn install
