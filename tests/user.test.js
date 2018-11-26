const axios = require('axios')

// test token for user 'thomass@uvajon.eu'
const token = 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjViZWVmNjgxODExNGJkMzA0NDgzZDgwOSIsImlhdCI6MTU0MjM5ODUxN30.iIA02-qCwHfJvRFw0Nua6B3ux6_tu_-1VVpW-3elOv4'

const client = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'AUTHORIZATION': token }
});
const route = '/users'
const loginRoute = '/login'

const user = {
  firstname: 'thomas.s',
  lastname: 'uvajon',
  image: 'https://www.wanimo.com/veterinaire/images/articles/chat/fibrosarcome-chat.jpg',
  password: 'qsdfghjklmazertyuiop'
}

const createUser = async (u) => await client.post(route, u)
const deleteUser = async (id) => {
  try {
    client.delete(`${route}/${id}`)
  } catch (e) {
    console.error(`The created user ${response.data._id} wasn't deleted correctly`)
  }
}

describe('CRUD operations', () => {
  it('creates a user', async () => {
    const newUser = {
      ...user,
      email: `test${Math.random()}@test.test`,
    }

    const response = await createUser(newUser)
    expect(response.status).toBe(201)
    expect(response.data._id).toBeTruthy()
    expect(response.data.firstname).toBe(newUser.firstname)

    await deleteUser(response.data._id)
  })

  it('deletes a user', async () => {
    const newUser = {
      ...user,
      email: `test${Math.random()}@test.test`,
    }
    const createdUserResponse = await createUser(newUser)
    const id = createdUserResponse.data._id

    const response = await client.delete(`${route}/${id}`)
    expect(response.status).toBe(200)
    
    try {
      const getUserResponse = await client.get(`${route}/${id}`)
      expect(getUserResponse.status).toBe(404)
    } catch (e) {
      expect(e.toString()).toContain('failed with status code 404')
    }
  })

  it('gets a user', async () => {
    const newUser = {
        ...user,
      email: `test${Math.random()}@test.test`
    }

    const createdUserResponse = await createUser(newUser)
    const response = await client.get(`${route}/${createdUserResponse.data._id}`)
    expect(response.status).toBe(200)
    expect(response.data.email).toBe(newUser.email)
    await deleteUser(createdUserResponse.data._id)
  })

  it('updates a user', async () => {
    const newUser = {
        ...user,
      email: `test${Math.random()}@test.test`
    }

    const createdUserResponse = await createUser(newUser)
    const modifiedUser = createdUserResponse.data
    modifiedUser.firstname = 'billôme'
    const response = await client.put(`${route}/${createdUserResponse.data._id}`, modifiedUser)
    expect(response.status).toBe(200)
    const modifiedUserResponse = await client.get(`${route}/${createdUserResponse.data._id}`)
    expect(modifiedUserResponse.data.firstname).toBe(modifiedUser.firstname)
    await deleteUser(createdUserResponse.data._id)
  })

  it('gets all users', async () => {
    const response = await client.get(route)
    expect(response.status).toBe(200)
    expect(Array.isArray(response.data)).toBeTruthy()
  })
})

describe('Login', () => {

  it('logs in', async () => {
    const newUser = {
        ...user,
      email: `test${Math.random()}@test.test`
    }

    const createdUserResponse = await createUser(newUser)
    const payload = { password: user.password, email: newUser.email }
    const response = await client.post(loginRoute, payload)
    expect(response.status).toBe(200)
    expect(response.data.token).toBeTruthy()
    expect(typeof response.data.token).toBe('string')
    await deleteUser(createdUserResponse.data._id)
  })

  it('rejects logins with bad passwords', async () => {
    const newUser = {
        ...user,
      email: `test${Math.random()}@test.test`
    }

    const createdUserResponse = await createUser(newUser)
    const payload = { password: 'definitelyNotTheRightPassword', email: newUser.email }
    try {
      const response = await client.post(loginRoute, payload)
      expect(response.status).toBe(401)
    } catch (e) {
      expect(e.toString()).toContain('failed with status code 401')
    }
    await deleteUser(createdUserResponse.data._id)
  })
})

describe('Error catching and handling', () => {
  it('fails to create invalid users', async () => {
    const badUsers = [{
      ...user,
      email: undefined,
    }, {
      ...user,
      email: `test${Math.random()}@test.test`,
      firstname: undefined
    }, {
      ...user,
      email: `test${Math.random()}@test.test`,
      lastname: undefined
    }, {
      ...user,
      email: `test${Math.random()}@test.test`,
      password: undefined
    }, {
      ...user,
      email: `test${Math.random()}@test.test`,
      password: '2short'
    }]

    for (let i = 0; i < badUsers.length; i++) {
      await expect(createUser(badUsers[i])).rejects.toThrow('failed with status code 400')
    }
  })
})
