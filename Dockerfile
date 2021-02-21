FROM  node:alpine
ADD tsconfig.json /src/
ADD package-lock.json package.json /src/
ADD src /src/src/
WORKDIR  /src
RUN npm ci
RUN npm run build
CMD npm start
EXPOSE 3000
