FROM node


WORKDIR /app

COPY package*.json ./

RUN yarn

COPY . .

ENV NODE_ENV production

CMD ["yarn", "start"]
