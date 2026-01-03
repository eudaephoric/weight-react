const KEY = 'weight-data-v1'
const PREF_KEY = 'weight-prefs-v1'

function computeEntryVariances(entries){
  // returns a new array where each entry has a `variance` field representing
  // the difference between this entry's weight and the previous entry's weight.
  if(!Array.isArray(entries)) return []
  const out = []
  for(let i=0;i<entries.length;i++){
    const cur = Object.assign({}, entries[i])
    const prev = entries[i-1]
    if(cur.weight==null || cur.weight===''){
      cur.variance = null
    }else if(prev && prev.weight!==''){
      const a = Number(cur.weight)
      const b = Number(prev.weight)
      cur.variance = Number.isFinite(a) && Number.isFinite(b) ? (a - b) : null
    }else{
      cur.variance = null
    }
    out.push(cur)
  }
  return out
}

export function loadData(){
  try{
    const raw = localStorage.getItem(KEY)
    if(!raw) return { startDate: '', startWeight: '', targetWeight: '', entries: [] }
    const obj = JSON.parse(raw)
    obj.entries = computeEntryVariances(obj.entries || [])
    return obj
  }catch(e){
    return { startDate: '', startWeight: '', targetWeight: '', entries: [] }
  }
}

export function loadPrefs(){
  try{
    const raw = localStorage.getItem(PREF_KEY)
    if(!raw) return { showGuides: true, showTrend: true }
    return JSON.parse(raw)
  }catch(e){
    return { showGuides: true, showTrend: true }
  }
}

export function savePrefs(prefs){
  try{
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
    // notify listeners in the same window
    try{ window.dispatchEvent(new CustomEvent('weight-prefs-changed', { detail: prefs })) }catch(e){}
  }catch(e){}
}

export function saveData(obj){
  try{ localStorage.setItem(KEY, JSON.stringify(obj)) }catch(e){}
}

export function exportData(obj){
  // include prefs in the exported file so imports restore view settings
  const prefs = loadPrefs()
  const out = { data: obj, prefs }
  const blob = new Blob([JSON.stringify(out, null, 2)], {type: 'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'weight-data.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function importData(obj, setData){
  if(!obj) return
  // support both new format { data, prefs } and legacy flat data
  let dataObj = obj
  if(obj && obj.data) dataObj = obj.data

  // if prefs provided in the import, save them to localStorage
  if(obj && obj.prefs) {
    try{ 
      localStorage.setItem(PREF_KEY, JSON.stringify(obj.prefs))
      try{ window.dispatchEvent(new CustomEvent('weight-prefs-changed', { detail: obj.prefs })) }catch(e){}
    }catch(e){}
  }

  // minimal validation and compute variances before setting
  if(!Array.isArray(dataObj.entries)) dataObj.entries = []
  dataObj.entries = computeEntryVariances(dataObj.entries || [])
  setData(dataObj)
}

export { computeEntryVariances }
