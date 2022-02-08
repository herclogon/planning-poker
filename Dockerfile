FROM alpine

ENV INSTALL_DIR=/opt/poker
ENV HTTP_PORT=8080
ENV WS_PORT=8081

RUN apk add npm 

RUN mkdir ${INSTALL_DIR}
ADD src/ ${INSTALL_DIR}/src/
ADD package.json ${INSTALL_DIR}/
ADD package-lock.json ${INSTALL_DIR}/
WORKDIR ${INSTALL_DIR}
RUN npm ci

EXPOSE ${HTTP_PORT}
EXPOSE ${WS_PORT}
CMD node src/server.js