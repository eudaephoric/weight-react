import { computeEntryVariances } from '../src/utils/storage.js'

function almostEqual(a,b,eps=1e-9){
  return Math.abs(a-b) < eps
}

const entries = [
  { date: '2025-01-01', weight: 80 },
  { date: '2025-01-02', weight: 79.5 },
  { date: '2025-01-03', weight: 79.0 }
]

const result = computeEntryVariances(entries)

// expected: [null, -0.5, -0.5]
const expected = [null, -0.5, -0.5]
let ok = true
for(let i=0;i<expected.length;i++){
  const got = result[i].variance
  const exp = expected[i]
  if(exp === null){
    if(got !== null) { ok = false; console.error(`Mismatch at ${i}: expected null but got ${got}`); break }
  } else {
    if(!almostEqual(got, exp)) { ok = false; console.error(`Mismatch at ${i}: expected ${exp} but got ${got}`); break }
  }
}

if(ok){
  console.log('computeEntryVariances: OK')
  process.exit(0)
} else {
  console.error('computeEntryVariances: FAILED')
  process.exit(1)
}
