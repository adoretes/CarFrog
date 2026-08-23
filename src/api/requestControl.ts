// 全局唯一的"进行中请求"控制器：发送/生成共用一个入口，
// 停止按钮只需 abort 当前实例，无需感知请求来自哪个组件。
let activeController: AbortController | null = null

export function setActiveRequest(controller: AbortController | null): void {
  activeController = controller
}

export function abortActiveRequest(): void {
  activeController?.abort()
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
