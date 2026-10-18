import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Stránka neexistuje</h1>
      <Link to="/" className="mt-4 inline-block text-ink underline">Nahrať nový doklad</Link>
    </div>
  )
}
