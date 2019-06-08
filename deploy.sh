##### INSTALL

# Amazon Linux 2
## Create an Amazon Linux 2 EC2 instance
## Create an Elastic IP
## Associate it with the EC2 instance
## Create a security group to allow http and https
## Add the security group to the EC2 instance

# Nginx
sudo amazon-linux-extras install nginx1.12
sudo systemctl start nginx
sudo vi /etc/nginx/nginx.conf
# location /.well-known {
#     proxy_pass http://localhost:3000/sdk/.well-known;
#     proxy_http_version 1.1;
#     proxy_set_header Upgrade $http_upgrade;
#     proxy_set_header Connection 'upgrade';
#     proxy_set_header Host $host;
#     proxy_cache_bypass $http_upgrade;
# }
# location / {
#     proxy_pass http://localhost:3000;
#     proxy_http_version 1.1;
#     proxy_set_header Upgrade $http_upgrade;
#     proxy_set_header Connection 'upgrade';
#     proxy_set_header Host $host;
#     proxy_cache_bypass $http_upgrade;
# }
#
#  ssl_certificate "/etc/letsencrypt/live/securify.tsauvajon.eu/cert.pem";
#  ssl_certificate_key "/etc/letsencrypt/live/securify.tsauvajon.eu/privkey.pem";


sudo service nginx restart

# HTTPS
sudo npm i -g greenlock-cli
sudo greenlock certonly --webroot --acme-version draft-11 --acme-url https://acme-v02.api.letsencrypt.org/directory --agree-tos --email thomas@sauvajon.tech --domains securify.tsauvajon.eu --community-member --root /home/ec2-user/back/dist/sdk --config-dir /etc/letsencrypt
sudo service nginx restart

# Node
curl --silent --location https://rpm.nodesource.com/setup_10.x | sudo bash -
sudo yum install -y nodejs git

# PM2
sudo npm i -g typescript pm2
pm2 startup systemd
# run the `env` command issued by pm2

# Configuration
vi ~/.bash_profile # setup required env variables
source ~/.bash_profile

# Build
git clone https://gitlab.com/voauth/back
cd ~/back
npm i
npm run build
cp -r sdk dist

# Run
cd ~/back/dist
pm2 start server.js
pm2 save

##### RUN

# Renew certificate
sudo greenlock certonly --webroot --acme-version draft-11 --acme-url https://acme-v02.api.letsencrypt.org/directory --agree-tos --email thomas@sauvajon.tech --domains securify.tsauvajon.eu --community-member --root /home/ec2-user/back/dist/sdk --config-dir /etc/letsencrypt
sudo service nginx restart

# Dedeploy
cd ~/back
git pull
npm i
npm run build
cp -r front dist
pm2 restart server # --update-env
