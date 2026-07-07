FROM nginx:1.27-alpine

# Static single-page app; nginx serves it directly.
COPY index.html styles.css app.js config.js /usr/share/nginx/html/

EXPOSE 80
