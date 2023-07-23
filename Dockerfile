FROM node:latest
WORKDIR /puzler-vue

RUN npm install --global http-server

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY . ./
RUN npm run build

ARG PORT
EXPOSE $PORT
CMD ["http-server", "./dist", "--proxy", "https://puzler.app?", "-p", "$PORT", "-a", "0.0.0.0"]
