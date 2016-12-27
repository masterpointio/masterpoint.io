# masterpoint.io
The website for Masterpoint Consulting.

# Install Instructions
1. git clone masterpoint.io
2. apt install docker.io docker-compose letsencrypt
3. letsencrypt certonly --standalone -d masterpoint.io -d www.masterpoint.io
4. cp -rv /etc/letsencrypt/ ~/masterpoint.io/ssl
5. openssl dhparam -out ~/masterpoint.io/ssl/dhparam.pem 2048
6. docker-compose up -d
