FROM node:18.18.0
RUN mkdir /telos-oracle-scripts-code
COPY . /telos-oracle-scripts-code
WORKDIR /telos-oracle-scripts-code
RUN npm install