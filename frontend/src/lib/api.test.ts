import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError, fetchAPI } from './api'

// Mock auth module
vi.mock('./auth', () => ({
  getToken: vi.fn(() => 'test-token'),
}))

describe('fetchAPI', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should throw ApiError on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    })

    await expect(fetchAPI('/api/test')).rejects.toThrow(ApiError)
    await expect(fetchAPI('/api/test')).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized',
    })
  })

  it('should return parsed JSON on success', async () => {
    const mockData = { user: { id: 1, name: 'Test' } }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    })

    const result = await fetchAPI('/api/test')
    expect(result).toEqual(mockData)
  })

  it('should include Authorization header when token exists', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })

    await fetchAPI('/api/test')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    )
  })

  it('should include credentials: include for cookie support', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })

    await fetchAPI('/api/test')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        credentials: 'include',
      })
    )
  })

  it('should retry on 5xx errors', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      })
    })

    const result = await fetchAPI('/api/test')
    expect(result).toEqual({ success: true })
    expect(callCount).toBe(3)
  })
})
