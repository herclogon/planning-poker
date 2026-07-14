FROM ubuntu:22.04

ENV HTTP_PORT=8080
ENV INSTALL_DIR=planning-poker

RUN : "Installing system requirements..." \
    && apt-get update && apt-get install -y curl bash

RUN : "Creating special user for the application run..." \
    && useradd -ms /bin/bash poker

RUN : "Switching to the application user..."
USER poker
WORKDIR /home/poker
RUN mkdir ${INSTALL_DIR}

RUN : "Installing nvm with node and npm..."
ENV NODE_VERSION v16.15.1
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash 

RUN : "Copying application source..."
ADD src/ ${INSTALL_DIR}/src/
ADD package.json ${INSTALL_DIR}/
ADD package-lock.json ${INSTALL_DIR}/

RUN : "Installing application dependencies..."
WORKDIR ${INSTALL_DIR}
# `--omit=dev` is not honored by the bundled npm here, so the dev-only test
# framework (Playwright) is stripped explicitly to keep the runtime image lean.
RUN bash -c 'source ~/.nvm/nvm.sh; npm ci --omit=dev \
    && rm -rf node_modules/@playwright node_modules/playwright node_modules/playwright-core'

EXPOSE ${HTTP_PORT}
ENTRYPOINT  bash -c 'source ~/.nvm/nvm.sh; npm start'