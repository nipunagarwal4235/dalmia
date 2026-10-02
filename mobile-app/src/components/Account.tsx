import {useState} from 'react';
import {ActivityIndicator,Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {supabase} from '../lib/supabase';
import {useAccount} from '../useAccount';
import {can,roleLabel} from '../access';
import {colors as c} from '../theme';

export function Account() {
  const {session,access,loading,error}=useAccount();
  const [mode,setMode]=useState<'login'|'signup'|'reset'>('login');
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');
  const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  async function submit(){
    setBusy(true);setMessage('');
    try{
      if(mode==='signup'){
        if(password.length<12)throw new Error('Use at least 12 characters for your password.');
        const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{display_name:name.trim()},emailRedirectTo:'https://dalmia-blush.vercel.app/auth/mobile'}});
        if(error)throw error;if(!data.session)setMessage('Confirm your email, then return here to sign in.');
      }else if(mode==='reset'){
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:'https://dalmia-blush.vercel.app/auth/mobile'});
        if(error)throw error;setMessage('If an account exists, you will receive a password reset email.');
      }else{const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;}
      setPassword('');
    }catch(error){setMessage(error instanceof Error?error.message:'Sign-in is unavailable. Try again.');}finally{setBusy(false);}
  }
  async function signOut(){setBusy(true);const {error}=await supabase.auth.signOut();setMessage(error?.message||'');setBusy(false);}
  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled"><Text style={styles.eyebrow}>DALMIA ACCOUNT</Text>
    {loading?<ActivityIndicator color={c.gold}/>:session?<><Text style={styles.title}>{access?.displayName||'Your account'}</Text><Text style={styles.text}>{session.user.email}</Text><Text style={styles.roles}>{access?.roles.map(roleLabel).join(' · ')}</Text>{access&&!access.active&&<Text style={styles.message}>Your account is disabled. Contact your administrator.</Text>}
      {!!access&&<Profile name={access.displayName} company={access.company} id={access.id} editable={can(access,'profile.update')}/>}
      {(can(access,'users.manage')||can(access,'catalog.manage')||can(access,'catalog.assigned.manage'))&&<Pressable accessibilityRole="button" onPress={()=>void Linking.openURL(`https://dalmia-blush.vercel.app/${can(access,'users.manage')?'admin':'manage'}`)} style={styles.secondary}><Text style={styles.text}>Open management on the website</Text></Pressable>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>void signOut()} style={styles.button}><Text style={styles.buttonText}>Sign out</Text></Pressable>
    </>:<><Text style={styles.title}>{mode==='signup'?'Create your account':mode==='reset'?'Reset password':'Welcome back'}</Text><Text style={styles.text}>Use the same account on the website and mobile app.</Text>
      {mode==='signup'&&<><Text style={styles.label}>Name</Text><TextInput accessibilityLabel="Name" style={styles.input} value={name} onChangeText={setName} maxLength={120}/></>}
      <Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email"/>
      {mode!=='reset'&&<><Text style={styles.label}>Password</Text><TextInput accessibilityLabel="Password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode==='signup'?'new-password':'current-password'}/></>}
      {mode==='signup'&&<Text style={styles.text}>Use at least 12 characters. New accounts start as customers.</Text>}
      <Pressable accessibilityRole="button" disabled={busy||!email||(mode!=='reset'&&!password)} onPress={()=>void submit()} style={styles.button}><Text style={styles.buttonText}>{busy?'Please wait…':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Sign in'}</Text></Pressable>
      <View style={styles.links}>{mode!=='login'&&<Pressable accessibilityRole="button" onPress={()=>setMode('login')}><Text style={styles.link}>Sign in</Text></Pressable>}{mode!=='signup'&&<Pressable accessibilityRole="button" onPress={()=>setMode('signup')}><Text style={styles.link}>Create account</Text></Pressable>}{mode!=='reset'&&<Pressable accessibilityRole="button" onPress={()=>setMode('reset')}><Text style={styles.link}>Forgot password?</Text></Pressable>}</View>
    </>}
    {!!(message||error)&&<Text accessibilityRole="alert" style={styles.message}>{message||error}</Text>}
  </ScrollView>;
}
function Profile({name,company,id,editable}:{name:string;company:string;id:string;editable:boolean}){
  const [displayName,setName]=useState(name);const [business,setCompany]=useState(company);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  async function save(){setBusy(true);try{const {data,error}=await supabase.from('profiles').update({display_name:displayName.trim(),company:business.trim()}).eq('id',id).select('id');if(error)throw error;setMessage(data.length?'Profile saved.':'Your account cannot edit this profile.');}catch(error){setMessage(error instanceof Error?error.message:'Profile save failed.');}finally{setBusy(false);}}
  return <View><Text style={styles.label}>Name</Text><TextInput accessibilityLabel="Name" value={displayName} onChangeText={setName} style={styles.input} maxLength={120}/><Text style={styles.label}>Company</Text><TextInput accessibilityLabel="Company" value={business} onChangeText={setCompany} style={styles.input} maxLength={160}/><Pressable accessibilityRole="button" disabled={!editable||busy} style={styles.secondary} onPress={()=>void save()}><Text style={styles.text}>Save profile</Text></Pressable>{!!message&&<Text accessibilityRole="alert" style={styles.message}>{message}</Text>}</View>;
}
const styles=StyleSheet.create({container:{padding:24,paddingBottom:60,gap:14},eyebrow:{color:c.gold,fontSize:10,letterSpacing:2},title:{fontSize:28,color:'#fff',fontWeight:'600'},text:{color:'#bbb',fontSize:14,lineHeight:22},roles:{color:c.gold,fontSize:14},label:{color:'#ddd',fontSize:13,marginTop:12},input:{color:'#fff',backgroundColor:'#282828',borderWidth:1,borderColor:'#555',borderRadius:5,padding:13,fontSize:16,minHeight:48},button:{backgroundColor:c.gold,padding:15,borderRadius:5,alignItems:'center',marginTop:12},buttonText:{color:c.black,fontSize:14,fontWeight:'700'},secondary:{padding:14,borderWidth:1,borderColor:'#555',borderRadius:5,marginTop:16,alignItems:'center'},message:{color:'#e3ca98',fontSize:14,lineHeight:22},links:{flexDirection:'row',flexWrap:'wrap',gap:20,marginTop:12},link:{color:c.gold,fontSize:14,paddingVertical:8}});
