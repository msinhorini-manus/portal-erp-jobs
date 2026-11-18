import assert from 'node:assert/strict'
import test from 'node:test'
import { createMemoryRouter } from 'react-router-dom'

function editorRouter() {
  return createMemoryRouter(
    [{ path: '/admin', element: null }, { path: '/admin/emails', element: null }],
    { basename: '/br', initialEntries: ['/br/admin', '/br/admin/emails'], initialIndex: 1 },
  )
}

const flush = () => new Promise(resolve => setImmediate(resolve))

test('unsaved email draft blocks browser POP and cancel preserves regional editor URL', async () => {
  const router = editorRouter()
  try {
    router.getBlocker('email-editor', () => true)
    await router.navigate(-1)
    assert.equal(router.state.location.pathname, '/br/admin/emails')
    const blocker = router.state.blockers.get('email-editor')
    assert.equal(blocker.state, 'blocked')
    assert.equal(blocker.location.pathname, '/br/admin')
    blocker.reset()
    assert.equal(router.state.location.pathname, '/br/admin/emails')
    assert.equal(router.state.blockers.get('email-editor').state, 'unblocked')
  } finally { router.dispose() }
})

test('explicit discard proceeds with the originally blocked POP, without duplicating basename', async () => {
  const router = editorRouter()
  try {
    router.getBlocker('email-editor', () => true)
    await router.navigate(-1)
    router.state.blockers.get('email-editor').proceed()
    await flush()
    assert.equal(router.state.location.pathname, '/br/admin')
    assert.equal(router.state.blockers.get('email-editor').state, 'unblocked')
  } finally { router.dispose() }
})

test('saved editor permits POP and dirty editor blocks programmatic PUSH', async () => {
  const router = editorRouter()
  try {
    let dirty = false
    router.getBlocker('email-editor', () => dirty)
    await router.navigate(-1)
    assert.equal(router.state.location.pathname, '/br/admin')
    await router.navigate('/admin/emails')
    assert.equal(router.state.location.pathname, '/br/admin/emails')
    dirty = true
    await router.navigate('/admin')
    assert.equal(router.state.location.pathname, '/br/admin/emails')
    assert.equal(router.state.blockers.get('email-editor').state, 'blocked')
  } finally { router.dispose() }
})
