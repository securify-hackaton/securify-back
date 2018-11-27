# back

## Unauthenticated routes

**REGISTER**

```
POST /users
{
    email: string
    deviceId: string
    deviceType: string
    firstname: string [OPTIONAL]
    lastname: string [OPTIONAL]
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
