export interface DeferredPromise<T> {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
  isCompleted: boolean
}

export function Deferred<T>(): DeferredPromise<T> {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: any) => void
  let isCompleted = false

  const promise = new Promise<T>((res, rej) => {
    resolve = (value: T | PromiseLike<T>) => {
      if (!isCompleted) {
        isCompleted = true
        res(value)
      }
    }
    reject = (reason?: any) => {
      if (!isCompleted) {
        isCompleted = true
        rej(reason)
      }
    }
  })

  return {
    promise,
    resolve,
    reject,
    get isCompleted() {
      return isCompleted
    }
  }
}
