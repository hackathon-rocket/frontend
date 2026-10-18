import { Link, useParams } from 'react-router'
import Placeholder from '../components/Placeholder'

export default function ProcessingPage() {
  const { id } = useParams()
  return (
    <Placeholder title="Spracovávame doklad" task="úloha #11 — Processing screen">
      <Link to={`/doklady/${id}`} className="mt-6 inline-block text-ink underline">Pokračovať na výsledok</Link>
    </Placeholder>
  )
}
