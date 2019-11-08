FROM node:12.13.0-alpine
WORKDIR /app

COPY package.json .
COPY yarn.lock .
RUN yarn --frozen-lockfile --ignore-optional --non-interactive

COPY tsconfig.json .
COPY src src
COPY front front
COPY images images

ENTRYPOINT [ "yarn", "start" ]
