FROM node:latest
WORKDIR /puzler-vue

RUN npm install --global http-server

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY . ./
RUN npm run build

EXPOSE 8080
CMD ["http-server", "./dist", "--proxy", "https://puzler.app?", "-p", "8080", "-a", "0.0.0.0"]
