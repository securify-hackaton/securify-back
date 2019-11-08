export const jwtOptions = {
  secretOrKey: process.env.JWT_KEY,
  issuer: 'auth.tsauvajon.eu',
  audience: 'tsauvajon.eu',
}
