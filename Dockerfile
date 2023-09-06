FROM node:lts
WORKDIR /puzler-vue

RUN npm install --global http-server

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY . ./
RUN npm run build

ARG PORT
EXPOSE $PORT
CMD ["http-server", "./dist", "--proxy", "https://www.puzler.app?"]
