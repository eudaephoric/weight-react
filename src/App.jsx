import React, { useEffect, useState } from 'react'
import DataTab from './components/DataTab'
import ChartsTab from './components/ChartsTab'
import { loadData, saveData } from './utils/storage'

export default function App() {
  const [tab, setTab] = useState('data')
  const [data, setData] = useState(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  return (
    <div className="app-root dark">
      <header className="topbar">
        <h1>Weight Tracker</h1>
        <nav>
          <button className={tab==='data'? 'active':''} onClick={()=>setTab('data')}>Data</button>
          <button className={tab==='charts'? 'active':''} onClick={()=>setTab('charts')}>Charts</button>
        </nav>
      </header>
      <main>
        {tab==='data' ? (
          <DataTab data={data} setData={setData} />
        ) : (
          <ChartsTab data={data} setData={setData} />
        )}
      </main>
      <footer className="footer">Stores data in localStorage; export/import JSON available.</footer>
    </div>
  )
}
