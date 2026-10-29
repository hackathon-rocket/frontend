import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-[32px] leading-tight font-bold">Stránka neexistuje</h1>
      <p className="mt-3 text-muted">Odkaz je neplatný alebo doklad bol medzičasom odstránený.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/" className="btn btn-primary">Nahrať nový doklad</Link>
        <Link to="/doklady" className="btn btn-secondary">Zobraziť doklady</Link>
      </div>
    </div>
  )
}
