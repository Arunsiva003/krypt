FROM node:20-bookworm-slim AS dev

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]

FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG REACT_APP_API_BASE_URL=http://localhost:8080
ARG REACT_APP_CLOUDINARY_CLOUD_NAME=
ARG REACT_APP_CLOUDINARY_UPLOAD_PRESET=

ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
ENV REACT_APP_CLOUDINARY_CLOUD_NAME=${REACT_APP_CLOUDINARY_CLOUD_NAME}
ENV REACT_APP_CLOUDINARY_UPLOAD_PRESET=${REACT_APP_CLOUDINARY_UPLOAD_PRESET}

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
