FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache ca-certificates curl \
    && curl -fsSLo /etc/ssl/certs/rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    && chmod 0444 /etc/ssl/certs/rds-global-bundle.pem
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY src ./src
COPY migrations ./migrations
USER node
EXPOSE 8081
HEALTHCHECK --interval=20s --timeout=5s --start-period=40s --retries=3 CMD node -e "fetch('http://127.0.0.1:8081/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","src/server.js"]
