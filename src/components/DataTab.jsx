import React, { useState, useRef, useEffect } from 'react'
import { exportData as exportJson, importData as importJson, computeEntryVariances } from '../utils/storage'

function dayAfter(dateStr) {
  const d = new Date(dateStr)
  d.setDate(d.getDate()+1)
  return d.toISOString().slice(0,10)
}

export default function DataTab({ data, setData }){
  const [fileError, setFileError] = useState('')
  const [showSettings, setShowSettings] = useState(false) // collapsed by default
  const [successMsg, setSuccessMsg] = useState('')
  const [lastAdded, setLastAdded] = useState(null)
  const inputRefs = useRef({})

  function updateSettings(e){
    const {name, value} = e.target
    setData(prev=> ({...prev, [name]: value}))
  }

  function updateEntry(idx, field, value){
    const entries = [...(data.entries||[])]
    entries[idx] = {...entries[idx], [field]: value}
    // if weight was changed to empty string, keep as ''
    const withVars = computeEntryVariances(entries)
    setData({...data, entries: withVars})
  }

  useEffect(()=>{
    if(lastAdded == null) return
    // wait for DOM to update
    const idx = lastAdded
    const el = inputRefs.current?.[idx]
    if(el && typeof el.focus === 'function'){
      try{
        el.focus()
        if(typeof el.select === 'function') el.select()
        // ensure visible
        if(typeof el.scrollIntoView === 'function') el.scrollIntoView({behavior:'smooth', block:'center'})
      }catch(e){}
    }
    setLastAdded(null)
  }, [data.entries, lastAdded])

  function addDay(){
    const entries = [...(data.entries||[])]
    const nextDate = entries.length ? dayAfter(entries[entries.length-1].date) : (data.startDate || new Date().toISOString().slice(0,10))
    entries.push({date: nextDate, weight: '', variance: null})
    const withVars = computeEntryVariances(entries)
    setData({...data, entries: withVars})
    // mark last added index so we can focus its weight input after render
    setLastAdded(entries.length - 1) // the new index is previous length
  }

  function removeEntry(i){
    const entries = [...data.entries]
    entries.splice(i,1)
    const withVars = computeEntryVariances(entries)
    setData({...data, entries: withVars})
  }

  async function handleImport(e){
    const file = e.target.files?.[0]
    if(!file) return
    try{
      const text = await file.text()
      const obj = JSON.parse(text)
      importJson(obj, setData)
      setFileError('')
      setSuccessMsg('Imported successfully')
      setTimeout(()=>setSuccessMsg(''), 3000)
    }catch(err){ setFileError('Invalid JSON file') }
  }

  function handleExport(){
    exportJson(data)
    setSuccessMsg('Exported successfully')
    setTimeout(()=>setSuccessMsg(''), 3000)
  }

  return (
    <div className="data-tab">
      {successMsg && <div className="success">{successMsg}</div>}
      <section className="card settings">
        <div className="settings-header">
          <h2 style={{margin:0}}>Settings</h2>
          <button className="edit-btn" onClick={()=>setShowSettings(s=>!s)} title={showSettings? 'Done' : 'Edit'}>
            {showSettings ? (
                /** check icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ) : (
                /** pencil icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M3 21v-3.75L17.81 2.44a2 2 0 012.83 0l.92.92a2 2 0 010 2.83L6.75 21H3z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        {showSettings && (
          <div className="settings-grid">
            <label>Start date
              <input type="date" name="startDate" value={data.startDate||''} onChange={updateSettings} />
            </label>
            <label>Starting weight
              <input name="startWeight" type="number" value={data.startWeight||''} onChange={updateSettings} />
            </label>
            <label>Target weight
              <input name="targetWeight" type="number" value={data.targetWeight||''} onChange={updateSettings} />
            </label>
          </div>
        )}
      </section>

        <section className="card">
          <h2>Entries</h2>
          <div className="entry-header">
            <div className="col date-col">Date</div>
            <div className="col weight-col">Weight</div>
            <div className="col delta-col">Variance</div>
            <div className="col actions-col">Actions</div>
          </div>
          <div className="entries">
            {(data.entries||[]).map((e, idx)=> (
              <div className="entry" key={e.date+idx}>
                <input className="date-col" type="date" value={e.date} onChange={ev=>updateEntry(idx, 'date', ev.target.value)} />
                <input ref={el=> inputRefs.current[idx]=el} className="weight-col" type="number" placeholder="weight" value={e.weight||''} onChange={ev=>updateEntry(idx, 'weight', ev.target.value)} style={{maxWidth:200}} />
                <div className="delta-col" style={{width:100,textAlign:'center'}}>{e.variance==null? '—' : Number(e.variance).toFixed(2)}</div>
                <div className="actions-col"><button className="danger" onClick={()=>removeEntry(idx)}>Delete</button></div>
              </div>
            ))}
          </div>
          <div className="row">
            <button onClick={addDay}>+ Add day</button>
          </div>
        </section>

      <section className="card actions">
        <div className="row">
          <label className="file-btn" title="Import JSON">
            <input type="file" accept="application/json" onChange={handleImport} />
            {/* file upload icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 21H3v-2a4 4 0 014-4h10a4 4 0 014 4v2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </label>

          <button className="icon-btn" onClick={handleExport} title="Export JSON">
            {/* download icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 15V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {fileError && <div className="error">{fileError}</div>}
      </section>
    </div>
  )
}
