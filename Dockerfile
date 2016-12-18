FROM nginx

MAINTAINER Matt Gowie

RUN rm /etc/nginx/conf.d/default.conf

COPY src/ /usr/share/nginx/html/

COPY ssl/letsencrypt /etc/letsencrypt
COPY ssl/dhparam.pem /etc/ssl/certs/dhparam.pem

COPY nginx.conf /etc/nginx/conf.d/default.conf
