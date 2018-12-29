var companyURL = '/company'
var app = new Vue({
  el: '#app',
  data: () => ({
    name: '',
    logo: '',
    callback: '',
    scopes: [
      {
        name: 'email',
        display: 'Email address',
        active: true,
        forced: true
      }, {
        name: 'fullname',
        display: 'Full name',
        active: false
      }, {
        name: 'age',
        display: 'User age',
        active: false
      }
    ],
    privateKey: null,
    publicKey: null,
    error: null,
  }),
  methods: {
    async register () {
      let errors = []
      if (!this.name) {
        errors = [ ...errors, 'Name is mandatory' ]
      }
      if (!this.logo) {
        errors = [ ...errors, 'Logo is mandatory' ]
      }
      if (!this.callback) {
        errors = [ ...errors, 'Callback is mandatory' ]
      }
      if (this.name.length < 3) {
        errors = [ ...errors, 'Name is too short' ]
      }
      if (this.logo.length < 10) {
        errors = [ ...errors, 'Logo is too short' ]
      }
      if (this.callback.length < 10) {
        errors = [ ...errors, 'Callback is too short' ]
      }
      if (!this.logo.includes('http://') && !this.logo.includes('https://')) {
        errors = [ ...errors, 'Logo should be an URL' ]
      }
      if (!this.callback.includes('http://') && !this.callback.includes('https://')) {
        errors = [ ...errors, 'Callback should be an URL' ]
      }
      this.error = errors.join('<br>')

      if (errors.length) {
        return
      }

      console.log(this.name, this.logo)

      try {
        const scopes = this.scopes
          .filter(s => s.active)
          .map(s => s.name)
          .join(';')
        const result = await axios.post(companyURL, {
          name: this.name,
          image: this.logo,
          callback: this.callback,
          scopes
        })

        this.privateKey = result.data.privateKey
        this.publicKey = result.data.publicKey

        console.log(result)
      } catch (e) {
        console.error(e)
        this.error = 'Request failed'
      }
    }
  }
})
