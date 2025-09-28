import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:9090/'
  // otras configuraciones globales aquí
})

export default api
