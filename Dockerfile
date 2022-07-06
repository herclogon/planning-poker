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
RUN bash -c 'source ~/.nvm/nvm.sh; npm ci'

EXPOSE ${HTTP_PORT}
ENTRYPOINT  bash -c 'source ~/.nvm/nvm.sh; npm start'