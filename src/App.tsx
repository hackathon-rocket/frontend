import { Route, Routes } from 'react-router'
import Layout from './components/Layout'
import UploadPage from './features/upload/UploadPage'
import ProcessingPage from './pages/ProcessingPage'
import ResultPage from './pages/ResultPage'
import DocumentsPage from './pages/DocumentsPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<UploadPage />} />
        <Route path="doklady" element={<DocumentsPage />} />
        <Route path="doklady/:id/spracovanie" element={<ProcessingPage />} />
        <Route path="doklady/:id" element={<ResultPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
