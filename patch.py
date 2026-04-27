import sys

f = open("src/App.js", "r").read()
changes = 0

# Fix 1: Spark chart scaling
old_spark = '''function Spark({ data, keys, colors, height = 120 }) {
  if (!data?.length) return null;
  const all = data.flatMap((d) => keys.map((k) => d[k]));
  const mn = Math.min(...all)*.995, mx = Math.max(...all)*1.005;
  const w=100,h=height;
  const gy=(v)=>h-((v-mn)/(mx-mn))*(h-20)-10;
  const gx=(i)=>(i/(data.length-1))*(w-10)+5;
  return (<svg viewBox={"0 0 "+w+" "+h} style={{width:"100%",height}} preserveAspectRatio="none">{keys.map((key,ki)=>{const pts=data.map((d,i)=>gx(i)+","+gy(d[key])).join(" ");return(<g key={key}><polyline points={pts} fill="none" stroke={colors[ki]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>{data.map((d,i)=><circle key={i} cx={gx(i)} cy={gy(d[key])} r="1.8" fill={colors[ki]}/>)}</g>);})}{data.map((d,i)=><text key={i} x={gx(i)} y={h-1} textAnchor="middle" fontSize="4" fill="#8896ab">{d.month}</text>)}</svg>);
}'''

new_spark = '''function Spark({ data, keys, colors, height = 120 }) {
  if (!data?.length || data.length < 2) return null;
  const all = data.flatMap((d) => keys.map((k) => d[k])).filter((v) => v != null && !isNaN(v));
  if (!all.length) return null;
  const rawMn = Math.min(...all), rawMx = Math.max(...all);
  const pad = rawMx === rawMn ? rawMx * 0.05 : (rawMx - rawMn) * 0.15;
  const mn = rawMn - pad, mx = rawMx + pad;
  const w=100,h=height;
  const gy=(v)=>h-((v-mn)/(mx-mn))*(h-24)-12;
  const gx=(i)=>(i/(data.length-1))*(w-14)+7;
  return (<svg viewBox={"0 0 "+w+" "+h} style={{width:"100%",height}} preserveAspectRatio="xMidYMid meet">{keys.map((key,ki)=>{const pts=data.map((d,i)=>gx(i)+","+gy(d[key]||0)).join(" ");return(<g key={key}><polyline points={pts} fill="none" stroke={colors[ki]} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>{data.map((d,i)=><circle key={i} cx={gx(i)} cy={gy(d[key]||0)} r="1.5" fill={colors[ki]}/>)}</g>);})}{data.map((d,i)=><text key={i} x={gx(i)} y={h-1} textAnchor="middle" fontSize="4" fill="#8896ab">{d.month}</text>)}</svg>);
}'''

if old_spark in f:
    f = f.replace(old_spark, new_spark)
    changes += 1
    print("✓ Fixed Spark chart scaling")
else:
    print("⚠ Spark chart already patched or not found")

# Fix 2: Add delete state and handler
old_fetch = '  const [fetchingData, setFetchingData] = useState(false);\n  const [fetchStatus, setFetchStatus] = useState("");'
new_fetch = '''  const [fetchingData, setFetchingData] = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const handleDeleteProperty = (id) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
    setShowDeleteConfirm(null);
    setView("state");
  };'''

if 'showDeleteConfirm' not in f:
    f = f.replace(old_fetch, new_fetch)
    changes += 1
    print("✓ Added delete state and handler")
else:
    print("⚠ Delete handler already exists")

# Fix 3: Add delete button to property header
old_header = '''return(<div style={{animation:"fu .35s ease"}}>
            <div style={{marginBottom:18}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}><Pill c={psm?.color} ch={p.state}/><span style={{fontSize:11,color:"#6b7280"}}>{p.city}</span></div><h2 style={{margin:0,fontSize:22,fontWeight:700}}>{p.name}</h2><p style={{margin:"3px 0 0",fontSize:12,color:"#6b7280"}}>{p.address}</p><div style={{display:"flex",gap:8,marginTop:8}}>{[p.type,p.bedrooms+"bd/"+p.bathrooms+"ba",p.sqft.toLocaleString()+" sqft","Built "+p.yearBuilt].map((t)=><span key={t} style={{fontSize:10,color:"#9ca3af",background:"#111827",padding:"3px 8px",borderRadius:5,border:"1px solid #2d3748"}}>{t}</span>)}</div></div>'''

new_header = '''return(<div style={{animation:"fu .35s ease"}}>
            <div style={{marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}><Pill c={psm?.color} ch={p.state}/><span style={{fontSize:11,color:"#6b7280"}}>{p.city}</span></div><h2 style={{margin:0,fontSize:22,fontWeight:700}}>{p.name}</h2><p style={{margin:"3px 0 0",fontSize:12,color:"#6b7280"}}>{p.address}</p><div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>{[p.type,p.bedrooms+"bd/"+p.bathrooms+"ba",p.sqft.toLocaleString()+" sqft","Built "+p.yearBuilt].map((t)=><span key={t} style={{fontSize:10,color:"#9ca3af",background:"#111827",padding:"3px 8px",borderRadius:5,border:"1px solid #2d3748"}}>{t}</span>)}</div></div>
              <button onClick={()=>setShowDeleteConfirm(p.id)} style={{background:"#ef444418",border:"1px solid #ef444430",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#ef4444",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg> Delete</button>
            </div>'''

if 'setShowDeleteConfirm(p.id)' not in f:
    f = f.replace(old_header, new_header)
    changes += 1
    print("✓ Added delete button to property header")
else:
    print("⚠ Delete button already exists")

# Fix 4: Add delete confirmation modal
if 'Delete Property' not in f or 'handleDeleteProperty(showDeleteConfirm)' not in f:
    old_end = '''      </Modal>
    </div>'''
    new_end = '''      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal open={showDeleteConfirm!==null} onClose={()=>setShowDeleteConfirm(null)} title="Delete Property">
        <div style={{textAlign:"center",padding:"10px 0"}}>
          <div style={{width:56,height:56,borderRadius:14,background:"#ef444418",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:"#ef4444"}}>
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
          </div>
          <h3 style={{margin:"0 0 8px",fontSize:18,fontWeight:700,color:"#e5e7eb"}}>Are you sure?</h3>
          <p style={{margin:"0 0 24px",fontSize:13,color:"#9ca3af",lineHeight:1.5}}>This will permanently delete <strong style={{color:"#e5e7eb"}}>{properties.find((p)=>p.id===showDeleteConfirm)?.name||"this property"}</strong> and all its data. This cannot be undone.</p>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button onClick={()=>setShowDeleteConfirm(null)} style={{padding:"10px 24px",background:"#1f2937",border:"1px solid #374151",borderRadius:9,color:"#9ca3af",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button onClick={()=>handleDeleteProperty(showDeleteConfirm)} style={{padding:"10px 24px",background:"linear-gradient(135deg,#ef4444,#dc2626)",border:"none",borderRadius:9,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Delete Property</button>
          </div>
        </div>
      </Modal>
    </div>'''
    # Find the LAST occurrence of old_end
    idx = f.rfind(old_end)
    if idx >= 0:
        f = f[:idx] + new_end + f[idx+len(old_end):]
        changes += 1
        print("✓ Added delete confirmation modal")
    else:
        print("⚠ Could not find insertion point for delete modal")
else:
    print("⚠ Delete modal already exists")

open("src/App.js", "w").write(f)
print(f"\nDone! {changes} changes applied.")
