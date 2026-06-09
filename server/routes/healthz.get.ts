export default defineEventHandler(event => {
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return 'ok'
})
