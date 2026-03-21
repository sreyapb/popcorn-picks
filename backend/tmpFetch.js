async function run() {
  try {
    const res = await fetch('http://localhost:5000/api/test')
    const text = await res.text()
    console.log('status', res.status)
    console.log(text)
  } catch (err) {
    console.error('err', err)
  }
}
run()
