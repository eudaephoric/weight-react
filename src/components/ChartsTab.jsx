import React, { useMemo, useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js'
import { loadPrefs, savePrefs } from '../utils/storage'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

function toPoints(entries){
  return (entries||[]).map(e=>({x: e.date, y: e.weight?Number(e.weight):null})).filter(p=>p.y!==null)
}

// monthly variance chart removed per request

export default function ChartsTab({ data }){
  const [year, setYear] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const prefs = loadPrefs()
  const [showGuides, setShowGuides] = useState(!!prefs.showGuides)
  const [showTrend, setShowTrend] = useState(!!prefs.showTrend)

  // persist prefs whenever toggles change
  useEffect(()=>{
    try{ savePrefs({ showGuides, showTrend }) }catch(e){}
  }, [showGuides, showTrend])

  // update component state if prefs are changed elsewhere (import action)
  useEffect(()=>{
    function onPrefs(e){
      const p = e && e.detail ? e.detail : loadPrefs()
      if(typeof p.showGuides === 'boolean') setShowGuides(!!p.showGuides)
      if(typeof p.showTrend === 'boolean') setShowTrend(!!p.showTrend)
    }
    window.addEventListener('weight-prefs-changed', onPrefs)
    return ()=> window.removeEventListener('weight-prefs-changed', onPrefs)
  }, [])

  function fmt(d){
    const dt = new Date(d)
    if(Number.isNaN(dt.getTime())) return ''
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth()+1).padStart(2,'0')
    const dd = String(dt.getDate()).padStart(2,'0')
    return `${yyyy}-${mm}-${dd}`
  }

  // Update default from/to whenever the underlying data changes: set to first and last entry dates
  React.useEffect(()=>{
    const entries = (data.entries||[]).map(e=>e.date).filter(Boolean).sort()
    if(entries.length===0){
      setFrom('')
      setTo('')
      return
    }
    const first = entries[0]
    const last = entries[entries.length-1]
    setFrom(first)
    setTo(last)
  }, [data.entries])

  function setQuickRange(kind){
    const entries = (data.entries||[]).map(e=>e.date).filter(Boolean).sort()
    if(entries.length===0) return
    const last = new Date(entries[entries.length-1])
    let fromDate = new Date(last)
    if(kind==='year'){
      fromDate.setFullYear(fromDate.getFullYear()-1)
    }else if(kind==='month'){
      fromDate.setMonth(fromDate.getMonth()-1)
    }else if(kind==='week'){
      fromDate.setDate(fromDate.getDate()-7)
    }
    setFrom(fmt(fromDate))
    setTo(fmt(last))
  }

  const points = useMemo(()=>{
    const pts = toPoints(data.entries||[])
    return pts.filter(p=>{
      if(year!=='all') return p.x.slice(0,4)===year
      if(from && p.x<from) return false
      if(to && p.x>to) return false
      return true
    })
  }, [data, year, from, to])

  // Create a map of dates to notes for tooltip lookup
  const notesMap = useMemo(()=>{
    const map = {}
    ;(data.entries||[]).forEach(e => {
      if(e.date && e.notes){
        map[e.date] = e.notes
      }
    })
    return map
  }, [data.entries])

  // monthly variance removed; keep daily deltas only

  // daily deltas (variance field stored on entries)
  const deltas = useMemo(()=>{
    return (data.entries||[]).map(e=>({x:e.date, y: e.variance==null? null : Number(e.variance)})).filter(p=>p.y!==null).filter(p=>{
      if(year!=='all' && p.x.slice(0,4)!==year) return false
      if(from && p.x<from) return false
      if(to && p.x>to) return false
      return true
    })
  }, [data, year, from, to])

  // compute explicit y-axis min/max using the rule:
  // yMax = startWeight OR highest entry + 10
  // yMin = targetWeight OR lowest entry - 10
  // If the computed min is >= max, disable bounds to avoid invalid axes.
  const startW = Number(data.startWeight)
  const targetW = Number(data.targetWeight)
  const weights = (data.entries||[]).map(e=>Number(e.weight)).filter(n=>Number.isFinite(n))
  const highest = weights.length ? Math.max(...weights) : undefined
  const lowest = weights.length ? Math.min(...weights) : undefined

  // New rules requested:
  // max = startWeight (if present) OR highest entry value
  // min = lowest entry value if it's lower than target, otherwise use target (if present)
  const yMaxCandidate = Number.isFinite(startW) ? startW : (highest !== undefined ? highest : undefined)

  let yMinCandidate
  if (Number.isFinite(targetW)) {
    // target present: prefer the lower of lowest and target (so if lowest < target use lowest, else target)
    yMinCandidate = (lowest !== undefined) ? Math.min(lowest, targetW) : targetW
  } else {
    // no target: use lowest if available
    yMinCandidate = lowest !== undefined ? lowest : undefined
  }

  let yMax = yMaxCandidate
  let yMin = yMinCandidate
  if (yMax !== undefined && yMin !== undefined && yMin >= yMax) {
    // invalid range -> disable explicit bounds
    yMax = undefined
    yMin = undefined
  }

  const lineData = {
    labels: points.map(p=>p.x),
    datasets: [
      // start/target guide lines (render beneath the main dataset)
  ...(showGuides && Number.isFinite(startW) ? [{
        label: 'Start weight',
        data: points.map(()=>startW),
        borderColor: '#60a5fa',
        borderDash: [6,4],
        pointRadius: 0,
        borderWidth: 1,
        fill: false
      }] : []),
  ...(showGuides && Number.isFinite(targetW) ? [{
        label: 'Target weight',
        data: points.map(()=>targetW),
        borderColor: '#ef4444',
        borderDash: [6,4],
        pointRadius: 0,
        borderWidth: 1,
        fill: false
      }] : []),
      {
        label: 'Weight',
        data: points.map(p=>p.y),
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74,222,128,0.15)',
        tension: 0.2,
        pointRadius: 3
      },
  // optional trend line for weight (computed below)
  ...(/* weightTrend will be injected below when available and toggled */[])
    ]
  }

  // compute linear trend for weight over time (use timestamps for x to handle uneven spacing)
  let weightTrend = null
  if (points.length) {
    const xs = points.map(p => new Date(p.x).getTime())
    const ys = points.map(p => p.y)
    const n = xs.length
    const meanX = xs.reduce((s,v)=>s+v,0) / n
    const meanY = ys.reduce((s,v)=>s+v,0) / n
    let num = 0, den = 0
    for (let i=0;i<n;i++){
      const dx = xs[i] - meanX
      num += dx * (ys[i] - meanY)
      den += dx * dx
    }
    const slope = (den === 0) ? 0 : (num / den)
    const intercept = meanY - slope * meanX
    // map back to the chart labels order (dates)
    weightTrend = xs.map(x => slope * x + intercept)
  }

  // if weightTrend exists and the user toggles it on, append to the datasets
  if (weightTrend && showTrend) {
    lineData.datasets.push({
      label: 'Trend',
      data: weightTrend,
      borderColor: '#60a5fa',
      borderDash: [6,4],
      pointRadius: 0,
      borderWidth: 1,
      fill: false
    })
  }

  // compute explicit y-axis min/max from start and target weights when available
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.parsed.y !== null ? context.parsed.y : 'No weight'
            const note = notesMap[label] || ''
            if (note) {
              return [ `Weight: ${value} lbs`, `Note: ${note}` ]
            }
            return `Weight: ${value} lbs`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ...(showGuides && yMax !== undefined ? { max: yMax } : {}),
        ...(showGuides && yMin !== undefined ? { min: yMin } : {})
      }
    }
  }

  const deltaValues = deltas.map(d=>d.y)

  // compute linear trend (least-squares) over the deltaValues using index as x
  let trend = null
  if (deltaValues.length) {
    const n = deltaValues.length
    const xs = Array.from({length: n}, (_, i) => i)
    const meanX = (xs.reduce((s, v) => s + v, 0)) / n
    const meanY = deltaValues.reduce((s, v) => s + v, 0) / n
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX
      num += dx * (deltaValues[i] - meanY)
      den += dx * dx
    }
    const slope = (den === 0) ? 0 : (num / den)
    const intercept = meanY - slope * meanX
    trend = xs.map(x => slope * x + intercept)
  }

  const deltaData = {
    labels: deltas.map(d=>d.x),
    datasets: [
      {
        label: 'Daily variance',
        data: deltaValues,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.12)'
      },
  ...(trend && showTrend ? [{
        label: 'Trend',
        data: trend,
        borderColor: '#60a5fa',
        borderDash: [6,4],
        pointRadius: 0,
        fill: false
      }] : [])
    ]
  }

  const years = Array.from(new Set((data.entries||[]).map(e=>e.date.slice(0,4)))).sort()

  return (
    <div className="charts-tab">
      <section className="card filters">
        <label>Year
          <select value={year} onChange={e=>setYear(e.target.value)}>
            <option value="all">All</option>
            {years.map(y=> <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label>From <input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={e=>setTo(e.target.value)} /></label>
  <label className="toggle-label" style={{marginLeft:12}}><input type="checkbox" checked={showGuides} onChange={e=>setShowGuides(e.target.checked)} /> <span>Show guides & enforce bounds</span></label>
  <label className="toggle-label" style={{marginLeft:20}}><input type="checkbox" checked={showTrend} onChange={e=>setShowTrend(e.target.checked)} /> <span>Show Trend</span></label>
        <div className="quick-range">
          <button onClick={()=>setQuickRange('year')} title="Last year">Last Year</button>
          <button onClick={()=>setQuickRange('month')} title="Last month">Last Month</button>
          <button onClick={()=>setQuickRange('week')} title="Last week">Last Week</button>
        </div>
      </section>

      <section className="card">
        <h3>Weight over time</h3>
        <div className="chart-wrap">
          <Line data={lineData} options={{...lineOptions, maintainAspectRatio:false}} />
        </div>
      </section>

      <section className="card">
        <h3>Daily variance (stored per entry)</h3>
        <div className="chart-wrap">
          <Line data={deltaData} options={{ responsive: true, maintainAspectRatio:false }} />
        </div>
      </section>
    </div>
  )
}
