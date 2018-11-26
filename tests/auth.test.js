const axios = require('axios')

// test token for user 'thomass@uvajon.eu'
const token = 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjViZWVmNjgxODExNGJkMzA0NDgzZDgwOSIsImlhdCI6MTU0MjM5ODUxN30.iIA02-qCwHfJvRFw0Nua6B3ux6_tu_-1VVpW-3elOv4'
const conf = { headers: { 'AUTHORIZATION': token }}

const client = axios.create({
  baseURL: 'http://localhost:3000'
});
const usersRoute = '/users'
const loginRoute = '/login'

const user = {
  firstname: 'thomas.s',
  lastname: 'uvajon',
  image: 'https://www.wanimo.com/veterinaire/images/articles/chat/fibrosarcome-chat.jpg',
  password: 'qsdfghjklmazertyuiop'
}

const register = async () => await client.post(usersRoute, {})
const login = async () => await client.post(loginRoute, {})
const getUsers = async (config) => await client.get(usersRoute, config)

describe('JWT authentication', () => {
  describe('allows good route / auth combinations', () => {
    it('allows registering without token', async () => {
      // if authentication is denied, it returns a 401.
      // else, the expected behavior is 400 BAD REQUEST because we pass an
      // empty payload (validation error, happening after the authentication)
      await expect(register()).rejects.toThrow('failed with status code 400')
    })
    
    it('allows to login without token', async () => {
      // same
      await expect(login()).rejects.toThrow('failed with status code 400')
    })

    it('allows other methods with tokens', async () => {
      const result = await getUsers(conf)
      expect(result.data).toBeTruthy()
    })
  })

  describe('denies bad route / auth combinations', () => {
    it('denies GET /users without token', async () => {
      await expect(getUsers()).rejects.toThrow('failed with status code 401')
    })

    it('denies GET /users with a bad token', async () => {
      await expect(getUsers({ headers: { 'AUTHORIZATION': 'azertyuiop' }}))
        .rejects.toThrow('failed with status code 401')
    })
  })
})
