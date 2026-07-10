// Observabilidad ligera para la capa Services: cada llamada a Supabase que
// pasa por un `services/*.ts` queda registrada (servicio, método, duración,
// éxito/error), sin depender de ningún proveedor externo (no se agregó Sentry
// ni Datadog sin que se pidiera explícitamente). Deliberadamente no se
// registran los argumentos de la llamada: varios servicios reciben
// contraseñas (`auth.service`) y no deben terminar en la consola.

type LogStatus = "success" | "error"

interface ServiceLogEntry {
  service: string
  method: string
  status: LogStatus
  durationMs: number
  message?: string
}

function emit(entry: ServiceLogEntry) {
  const label = `[services] ${entry.service}.${entry.method}`
  const details = {
    status: entry.status,
    durationMs: entry.durationMs,
    ...(entry.message ? { message: entry.message } : {}),
  }

  if (entry.status === "error") {
    console.error(label, details)
  } else {
    console.info(label, details)
  }
}

/**
 * Envuelve una función de servicio asíncrona para registrar cada invocación:
 * cuánto tardó y si terminó en éxito o error. Preserva la firma y el
 * comportamiento original (re-lanza el error tal cual, sin transformarlo).
 */
export function withObservability<Args extends unknown[], Result>(
  service: string,
  method: string,
  fn: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  return async (...args: Args) => {
    const start = performance.now()

    try {
      const result = await fn(...args)
      emit({
        service,
        method,
        status: "success",
        durationMs: Math.round(performance.now() - start),
      })
      return result
    } catch (error) {
      emit({
        service,
        method,
        status: "error",
        durationMs: Math.round(performance.now() - start),
        message: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}
