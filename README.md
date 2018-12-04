# back


# Getting started

## Choice 1: use our demo

1/
Install Securify on your mobile phone:
- Android: search "Securify" on the Google Play Store search
- iOS: not available yet, because it costs 90€/year to list an app
Create an account (with an email you will remember)

2/
Netflic example: https://securify-netflic.herokuapp.com  
Spautify example: https://securify-spautify.herokuapp.com  
Epsy example: https://securify-epsy.herokuapp.com  

## Choice 2: setup your own servers

Install [Node.js LTS](https://nodejs.org/en/download/) 

**Back end**

Open a terminal in the `back` folder
```sh
# Install dependencies
npm i

# Setup the config
# Linux / MacOS
export MONGODB_URI=mongodb://poiuytreza:XbNZvpF7MVwZL45@ds151004.mlab.com:51004/gilet-jaune
export JWT_KEY=est-ceQueCeMot2PasseEst(très)DifficileàTrouver?Oui_ça_va!
export AZURE_KEY=648eb5213a444a3c8e55e491447ed052
# Windows
set MONGODB_URI=mongodb://poiuytreza:XbNZvpF7MVwZL45@ds151004.mlab.com:51004/gilet-jaune
set JWT_KEY=est-ceQueCeMot2PasseEst(très)DifficileàTrouver?Oui_ça_va!
set AZURE_KEY=648eb5213a444a3c8e55e491447ed052

# Run the server
npm run start

# Create a dev account
# Name: full text name, e.g. "EPSI"
# Logo: image URL, e.g. "https://pbs.twimg.com/profile_images/1024649812988387328/QWQbqff7_400x400.jpg"
# Callback URL: http://localhost:3001/callback
http://localhost:3000/sdk

# Don't close the tab, you will need the public and private key!
```

**Mobile app**

- Follow the README at https://gitlab.com/voauth/securify-front to run the server
- Install Expo on your mobile phone (iOS or Android) and scan the QR code
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

# API

## Unauthenticated routes

**REGISTER**

```
POST /users
{
    email: string
    password: string
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
    password: string
}
```
returns
```
{
    user: User
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
Email needs to be confirmed to activate the token

**Confirm email**

Send a new confirmation email
```
POST /confirm
{ }
```
returns
```
{ 
    message: string
}
```

**ME**

Get the logged user info
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

**Pending Authorizations**

Pending authorizations for the logged in user
```
GET /tokens/pending
```
returns
```
[
    {
        _id: ObjectId
        expirationDate: Date
        company: {
            name: string
            image: string
            scopes: string (joined with ';')
        }
    }
]
```

**Active Authorizations**

Active authorizations for the logged in user
```
GET /tokens/active
```
returns
```
[
    {
        _id: ObjectId
        expirationDate: Date
        company: {
            name: string
            image: string
            scopes: string (joined with ';')
        }
    }
]
```

**Revoke an Authorization**

Unvalidate any of the logged in user's tokens
```
POST /tokens/revoke
{
    tokenId: ObjectId
}
```
returns
```
{
    message: string
}
```
