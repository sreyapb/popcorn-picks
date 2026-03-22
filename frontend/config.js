// API Configuration - Points to backend server
// For local development: use 'http://localhost:5000'
// For production on Vercel: deploy backend on same server

const API_BASE_URL = (() => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000'
  }
  return ''
})()

console.log('API Base URL:', API_BASE_URL || 'Using same domain')
