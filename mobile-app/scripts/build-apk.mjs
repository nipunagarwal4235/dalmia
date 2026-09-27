import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,chmodSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const javaHome=process.env.JAVA_HOME;
const sdk=process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if(!javaHome||!sdk)throw new Error('Set JAVA_HOME and ANDROID_HOME before building the Android APK.');
const secrets=path.join(root,'.credentials');
const keystore=path.join(secrets,'dalmia-release.jks');
const credentials=path.join(secrets,'android-signing.json');
const run=(command,args,extra={})=>{const result=spawnSync(command,args,{cwd:root,stdio:'inherit',env:{...process.env,...extra}});if(result.error)throw result.error;if(result.status!==0)throw new Error(`${path.basename(command)} exited with code ${result.status}`);};
mkdirSync(secrets,{recursive:true,mode:0o700});
let signing;
if(existsSync(credentials))signing=JSON.parse(readFileSync(credentials,'utf8'));
else {
 if(existsSync(keystore))throw new Error('The signing key exists without its password file. Restore android-signing.json before building.');
 signing={alias:'dalmia',password:randomBytes(32).toString('hex')};
 writeFileSync(credentials,JSON.stringify(signing,null,2)+'\n',{mode:0o600});
}
if(!existsSync(keystore)){
 run(path.join(javaHome,'bin/keytool'),['-genkeypair','-keystore',keystore,'-alias',signing.alias,'-storepass:env','DALMIA_SIGNING_PASSWORD','-keypass:env','DALMIA_SIGNING_PASSWORD','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Dalmia Hardware'],{DALMIA_SIGNING_PASSWORD:signing.password});
 chmodSync(keystore,0o600);
}
run('npx',['expo','prebuild','--platform','android','--no-install']);
const gradlePath=path.join(root,'android/app/build.gradle');
let gradle=readFileSync(gradlePath,'utf8');
if(!gradle.includes('signingConfigs.dalmiaRelease')){
 const marker='    signingConfigs {';
 if(!gradle.includes(marker))throw new Error('Cannot find Android signing configuration. Review the generated Gradle file.');
 gradle=gradle.replace(marker,`${marker}\n        dalmiaRelease {\n            storeFile file(System.getenv("DALMIA_SIGNING_FILE"))\n            storePassword System.getenv("DALMIA_SIGNING_PASSWORD")\n            keyAlias System.getenv("DALMIA_SIGNING_ALIAS")\n            keyPassword System.getenv("DALMIA_SIGNING_PASSWORD")\n        }`);
 const start=gradle.indexOf('        release {',gradle.indexOf('    buildTypes {'));
 if(start<0)throw new Error('Cannot find the Android release build configuration.');
 gradle=gradle.slice(0,start)+gradle.slice(start).replace('signingConfig signingConfigs.debug','signingConfig signingConfigs.dalmiaRelease');
 writeFileSync(gradlePath,gradle);
}
writeFileSync(path.join(root,'android/local.properties'),`sdk.dir=${sdk.replaceAll('\\','\\\\')}\n`);
const arch=process.env.DALMIA_ANDROID_ARCHITECTURES || 'arm64-v8a,armeabi-v7a';
run(path.join(root,'android/gradlew'),['-p',path.join(root,'android'),':app:assembleRelease','--no-daemon','--console=plain','--max-workers=2',`-PreactNativeArchitectures=${arch}`],{DALMIA_SIGNING_FILE:keystore,DALMIA_SIGNING_PASSWORD:signing.password,DALMIA_SIGNING_ALIAS:signing.alias,NODE_ENV:'production'});
const artifact=path.join(root,'android/app/build/outputs/apk/release/app-release.apk');
if(!existsSync(artifact))throw new Error('Android build finished without the expected APK.');
mkdirSync(path.join(root,'builds'),{recursive:true});
const output=path.join(root,'builds/dalmia-hardware.apk');copyFileSync(artifact,output);
console.log(`Signed APK created: ${output}`);
