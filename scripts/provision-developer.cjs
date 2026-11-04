// Run only with the local server stopped. Cloud provisioning uses Render secrets.
const {randomBytes,randomUUID,scryptSync}=require('node:crypto');
const {readFile,writeFile,rename,copyFile}=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 if(process.env.DATABASE_URL||process.env.RENDER)throw Error('This script only provisions a local database.');
 const file=path.join(process.cwd(),'.local','store.json');
 const db=JSON.parse(await readFile(file,'utf8'));
 if(db.users.some(u=>u.role==='Developer'))throw Error('A Developer already exists; no accounts were changed.');
 const password=randomBytes(18).toString('base64url'),salt=randomBytes(16).toString('hex');
 const user={id:randomUUID(),username:'Developer',name:'Developer',email:'',role:'Developer',brands:['idesire','kokies'],status:'Active',sessionVersion:0,createdAt:new Date().toISOString(),salt,passwordHash:scryptSync(password,salt,64).toString('hex')};
 db.users.push(user);
 const temp=file+'.'+randomUUID()+'.tmp';
 await copyFile(file,file+'.before-provision');
 await writeFile(temp,JSON.stringify(db,null,2),{flag:'wx'});
 await rename(temp,file);
 console.log(JSON.stringify({username:user.username,password,id:user.id}));
 console.log('Restart the local server to use this account.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
