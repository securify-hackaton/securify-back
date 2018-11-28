# back

## Unauthenticated routes

**REGISTER**

```
POST /users
{
    email: string
    deviceId: string
    deviceType: string
    firstName: string [OPTIONAL]
    lastName: string [OPTIONAL]
}
```
returns
```
{
    user: User
    token: string
}
```

**LOGIN**

Login with an email and a picture
```
POST /login
{
    email: string
    image: string (base 64 encoded)
}
```
returns
```
{
    message: string
    token: string
}
```

**New Dev account**

Create a developper account
```
POST /company
{
    name: string
    image: string
}
```
returns
```
{
    privateKey: string
    publicKey: string
}
```

**Authorize**

Ask for an authentication
```
POST /authorize
{
    privateKey: string
    publicKey: string
    userEmail: string
}
```
returns
```
{
    requestID: string
}
```

## Authenticated routes

All other routes require a token in the `Authorization` header.

**ME**

Get the logged user
```
GET /
```
returns
```
{
    message: string
    user: User
}
```

## Create a developer account

https://dreamy-roentgen-d1d1ed.netlify.com/

# Getting started

Install [Node.js LTS](https://nodejs.org/en/download/) 

**Back end**

Open a terminal in the `back` folder
```sh
# Install dependencies
npm i

# Setup the config
# Linux / MacOS
export MONGODB_URI=mongodb://poiuytreza:XbNZvpF7MVwZL45@ds151004.mlab.com:51004/gilet-jaune
export JWT_KEY=remplacezCeciParUnMotDePasseQuelconque
# Windows
set MONGODB_URI=mongodb://poiuytreza:XbNZvpF7MVwZL45@ds151004.mlab.com:51004/gilet-jaune
set JWT_KEY=remplacezCeciParUnMotDePasseQuelconque

# Run the server
npm run start

# Create a dev account
# Name: full text name, e.g. "EPSI"
# Logo: image URL, e.g. "https://pbs.twimg.com/profile_images/1024649812988387328/QWQbqff7_400x400.jpg"
# Callback URL: http://localhost:3001
http://localhost:3000/sdk

# Don't close the tab, you will need the public and private key!
```

**Mobile app**

- Register with a valid email
- Upload 3 pictures

**Mock website**

Open another terminal in the `mock` repo
```sh
# Install dependencies
npm i

# Setup the config
# Linux / MacOS
export PRIVATE_KEY=[your private key]
export PUBLIC_KEY=[your public key]
export SECURIFY_URL=http://localhost:3000/authorize
# Windows
set PRIVATE_KEY=[your private key]
set PUBLIC_KEY=[your public key]
set SECURIFY_URL=http://localhost:3000/authorize

# Run the mock website
npm run start

# Access the mock website
http://localhost:3001/
```
