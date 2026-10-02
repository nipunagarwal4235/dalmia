'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '../lib/supabase/client';
import {can, roles, roleLabel, type AccessContext, type AppRole} from '../lib/access';
type Profile={id:string;display_name:string;company:string;active:boolean;email:string};
type Grant={role:AppRole;permission:string};
type Membership={user_id:string;role:AppRole};
export function AccessManager({access,profiles,memberships,permissions,grants,products,assignments,audit}:{
  access:AccessContext;profiles:Profile[];memberships:Membership[];permissions:{name:string;description:string}[];grants:Grant[];
  products:{id:string;model:string;category:string}[];assignments:{product_id:string;user_id:string}[];
  audit:{id:number;created_at:string;action:string;target_id:string;actor_id:string|null}[];
}) {
  const router=useRouter(); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const [product,setProduct]=useState(products[0]?.id||'');const [manufacturer,setManufacturer]=useState('');
  const manufacturers=profiles.filter(p=>p.active&&memberships.some(m=>m.user_id===p.id&&m.role==='manufacturer'));
  async function call(name:string,args:Record<string,unknown>) {
    setBusy(true);setMessage('');
    try{const {error}=await createClient().rpc(name,args);if(error)throw error;setMessage('Access updated.');router.refresh();}
    catch(error){setMessage(error instanceof Error?error.message:'Access update failed.');}
    finally{setBusy(false);}
  }
  return <section className="management"><span className="card-category">ADMINISTRATION</span><h1>People and access</h1><p>Assign business roles, control permissions, and connect manufacturers to products.</p>
    {!!message&&<p role="status" className="notice">{message}</p>}
    <div className="access-users">{profiles.map(profile=><UserAccess key={profile.id+JSON.stringify(memberships.filter(m=>m.user_id===profile.id))+profile.active} profile={profile} current={memberships.filter(m=>m.user_id===profile.id).map(m=>m.role)} viewer={access} busy={busy} save={(newRoles,active)=>call('set_user_access',{target_user:profile.id,new_roles:newRoles,is_active:active})}/>)}</div>
    <h2>Manufacturer assignments</h2><div className="account-form"><label>Product<select value={product} onChange={e=>setProduct(e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.category} · {p.model}</option>)}</select></label><label>Manufacturer<select value={manufacturer} onChange={e=>setManufacturer(e.target.value)}><option value="">Choose an account</option>{manufacturers.map(p=><option key={p.id} value={p.id}>{p.display_name||p.id} {p.company&&`· ${p.company}`}</option>)}</select></label><button className="button" disabled={busy||!product||!manufacturer} onClick={()=>call('assign_manufacturer',{target_product:product,manufacturer,assigned:true})}>Assign product</button></div>
    {assignments.map(a=><p key={a.product_id+a.user_id}>{products.find(p=>p.id===a.product_id)?.model||a.product_id} → {profiles.find(p=>p.id===a.user_id)?.display_name||a.user_id} <button className="text-button" disabled={busy} onClick={()=>call('assign_manufacturer',{target_product:a.product_id,manufacturer:a.user_id,assigned:false})}>Remove assignment</button></p>)}
    <h2>Role permissions</h2><p>Staff powers are limited to staff roles. Super admin permissions are fixed.</p>
    <div className="access-users">{roles.map(role=><RolePermissions key={role+JSON.stringify(grants.filter(g=>g.role===role))} role={role} permissions={permissions} granted={grants.filter(g=>g.role===role).map(g=>g.permission)} editable={can(access,'roles.manage')&&role!=='super_admin'} busy={busy} save={values=>call('set_role_permissions',{target_role:role,new_permissions:values})}/>)}</div>
    <h2>Recent access changes</h2>{audit.length?<div className="table-scroll"><table><thead><tr><th>Time</th><th>Action</th><th>Target</th><th>Changed by</th></tr></thead><tbody>{audit.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString()}</td><td>{row.action.replaceAll('_',' ')}</td><td>{profiles.find(p=>p.id===row.target_id)?.display_name||row.target_id}</td><td>{profiles.find(p=>p.id===row.actor_id)?.display_name||row.actor_id||'Deleted account'}</td></tr>)}</tbody></table></div>:<p>No access changes yet.</p>}
  </section>;
}
function UserAccess({profile,current,viewer,busy,save}:{profile:Profile;current:AppRole[];viewer:AccessContext;busy:boolean;save:(roles:AppRole[],active:boolean)=>void}) {
  const [selected,setSelected]=useState(current);const [active,setActive]=useState(profile.active);
  const staff=current.some(role=>role==='admin'||role==='super_admin');
  const editable=profile.id!==viewer.id&&(can(viewer,'roles.manage')||!staff);
  return <article className="access-card"><h3>{profile.display_name||'Unnamed account'}</h3><p>{profile.email}<br/>{profile.company||'No company'}<br/><small>{profile.id}</small></p>
    <fieldset disabled={!editable||busy}><legend>Roles</legend>{roles.filter(role=>can(viewer,'roles.manage')||!['super_admin','admin'].includes(role)).map(role=><label className="check-row" key={role}><input type="checkbox" checked={selected.includes(role)} onChange={e=>setSelected(e.target.checked?[...selected,role]:selected.filter(r=>r!==role))}/>{roleLabel(role)}</label>)}<label className="check-row"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Account active</label><button className="button" disabled={!selected.length} onClick={()=>save(selected,active)}>Save access</button></fieldset>
    {!editable&&<small>{profile.id===viewer.id?'Another super admin must change your access.':'Only a super admin can change staff access.'}</small>}
  </article>;
}
function RolePermissions({role,permissions,granted,editable,busy,save}:{role:AppRole;permissions:{name:string;description:string}[];granted:string[];editable:boolean;busy:boolean;save:(values:string[])=>void}) {
  const [selected,setSelected]=useState(granted);
  function allowed(name:string){return name==='roles.manage'?role==='super_admin':['users.manage','catalog.manage','audit.read'].includes(name)?['admin','super_admin'].includes(role):name==='catalog.assigned.manage'?['manufacturer','admin','super_admin'].includes(role):true;}
  return <article className="access-card"><h3>{roleLabel(role)}</h3><fieldset disabled={!editable||busy}><legend className="sr-only">{roleLabel(role)} permissions</legend>{permissions.map(p=><label className="check-row" key={p.name}><input type="checkbox" disabled={!allowed(p.name)} checked={selected.includes(p.name)} onChange={e=>setSelected(e.target.checked?[...selected,p.name]:selected.filter(v=>v!==p.name))}/>{p.description}</label>)}{editable&&<button className="button" onClick={()=>save(selected)}>Save permissions</button>}</fieldset></article>;
}
