FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 65009

ENV PORT 65009
ENV NODE_ENV production

CMD ["npm", "start"]