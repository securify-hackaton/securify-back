var resetURL = '/reset'
var app = new Vue({
  el: '#app',
  data: () => ({
    password: null,
    email: null,
    key: null,
    error: null,
    done: false
  }),
  methods: {
    async submit () {
      this.error = null
      let errors = []
      if (!this.password) {
        errors = [ ...errors, 'Password is mandatory' ]
      }
      if (this.password.length < 3) {
        errors = [ ...errors, 'Password is too short' ]
      }
      
      if (errors.length) {
        this.error = errors.join('<br>')
        return
      }

      try {
        const result = await axios.post(resetURL, {
          email: this.email,
          key: this.key,
          password: this.password,
        })
        console.log(result)
        this.done = true
      } catch (e) {
        console.error(e)
        try {
          console.log(e.response)
          this.error = e.response.data.message
        }
        catch {
          this.error = `Request failed: ${e.message}`
        }
      }
    }
  },

  created () {
    this.error = null
    let errors = []

    const urlParams = new URLSearchParams(window.location.search)
    
    if (!urlParams.has('email')) {
      errors = [...errors, `email is mandatory`]
    }
    
    if (!urlParams.has('key')) {
      errors = [...errors, `key is mandatory`]
    }
    
    if (errors.length) {
      this.error = `Incorrect link:<br>${errors.join('<br>')}`
      return
    }
    
    this.email = urlParams.get('email')
    this.key = urlParams.get('key')

    console.log(this.email, this.key)
  }
})
