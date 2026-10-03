export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p>
}
