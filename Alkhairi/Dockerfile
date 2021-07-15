FROM node:12.18-alpine
ENV NODE_ENV=production
ENV API_PORT=2703
ENV MONGO_URI=mongodb://mongo:27017/alkhairi
ENV TOKEN_KEY=abcdefghijkl
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 2703
CMD ["npm", "start"]
