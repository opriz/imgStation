# 构建阶段
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY generate-certs.sh /generate-certs.sh
RUN chmod +x /generate-certs.sh
EXPOSE 80
CMD ["/bin/bash", "-c", "/generate-certs.sh && nginx -g 'daemon off;'"] 