# --- Build stage ---
FROM node:18-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build -- --configuration production

# --- Serve stage ---
FROM nginx:1.25-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/customer-crud-frontend /usr/share/nginx/html

EXPOSE 80
