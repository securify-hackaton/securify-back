export const jwtOptions = {
  secretOrKey: process.env.JWT_KEY,
  issuer: 'auth.giletjaune.com',
  audience: 'giletjaune.com',
}
