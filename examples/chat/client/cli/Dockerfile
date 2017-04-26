FROM node:7.9

RUN apt-get update -y
RUN apt-get install -y python2.7 git-all pkg-config libncurses5-dev libssl-dev libnss3-dev libexpat-dev

WORKDIR /app
RUN npm install -g wrtc

VOLUME /app

ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_ENV=docker

ENTRYPOINT ["node", "./examples/chat/client/cli/index.js"]
CMD ["broadcast"]

# docker build -t chat_client $(pwd)/examples/chat/client/cli
# docker run -it -v $(pwd):/app chat_client
