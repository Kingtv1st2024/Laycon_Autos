const express=require('express'),multer=require('multer'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const app=express(),PORT=process.env.PORT||3000,ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'laycon123';
const DB=path.join(__dirname,'data.json'),UP=path.join(__dirname,'public/uploads');
fs.mkdirSync(UP,{recursive:true});
const load=()=>fs.existsSync(DB)?JSON.parse(fs.readFileSync(DB)):{cars:[],enquiries:[]};
const save=d=>fs.writeFileSync(DB,JSON.stringify(d,null,2));
const upload=multer({storage:multer.diskStorage({destination:UP,filename:(r,f,cb)=>cb(null,Date.now()+'-'+Math.round(Math.random()*1e6)+path.extname(f.originalname).toLowerCase())}),limits:{fileSize:8e6},fileFilter:(r,f,cb)=>cb(null,/^image\//.test(f.mimetype))});
const tokens=new Set();
const auth=(q,s,n)=>tokens.has(q.headers['x-token'])?n():s.status(401).json({error:'Unauthorized'});
const t=(v,n=200)=>String(v||'').trim().slice(0,n);
app.use(express.json());app.use(express.static(path.join(__dirname,'public')));

// Public
app.get('/api/cars',(q,s)=>s.json(load().cars));
app.post('/api/enquiries',(q,s)=>{
  const b=q.body||{};if(!t(b.name)||!t(b.phone))return s.status(400).json({error:'Name and phone are required'});
  const d=load();d.enquiries.unshift({id:crypto.randomUUID(),name:t(b.name,100),phone:t(b.phone,30),interest:t(b.interest,50),budget:t(b.budget,50),message:t(b.message,1000),date:new Date().toISOString()});
  save(d);s.json({ok:true});
});

// Admin
app.post('/api/login',(q,s)=>{
  if(q.body&&q.body.password===ADMIN_PASSWORD){const k=crypto.randomBytes(24).toString('hex');tokens.add(k);return s.json({token:k});}
  s.status(401).json({error:'Wrong password'});
});
app.get('/api/enquiries',auth,(q,s)=>s.json(load().enquiries));
app.delete('/api/enquiries/:id',auth,(q,s)=>{const d=load();d.enquiries=d.enquiries.filter(e=>e.id!==q.params.id);save(d);s.json({ok:true});});
app.post('/api/cars',auth,upload.array('images',10),(q,s)=>{
  const b=q.body,d=load();
  const car={id:crypto.randomUUID(),make:t(b.make,50),model:t(b.model,80),price:Number(b.price)||0,year:Number(b.year)||null,type:t(b.type,30)||'Tokunbo',body:t(b.body,30),description:t(b.description,600),status:'Available',featured:b.featured==='true',images:(q.files||[]).map(f=>'/uploads/'+f.filename)};
  if(!car.make||!car.model)return s.status(400).json({error:'Make and model required'});
  d.cars.unshift(car);save(d);s.json(car);
});
app.put('/api/cars/:id',auth,(q,s)=>{
  const d=load(),c=d.cars.find(x=>x.id===q.params.id);if(!c)return s.status(404).json({error:'Not found'});
  const b=q.body;if(['Available','Sold'].includes(b.status))c.status=b.status;if(typeof b.featured==='boolean')c.featured=b.featured;if(b.price!==undefined)c.price=Number(b.price)||c.price;
  save(d);s.json(c);
});
app.delete('/api/cars/:id',auth,(q,s)=>{
  const d=load(),c=d.cars.find(x=>x.id===q.params.id);
  if(c)c.images.forEach(i=>fs.unlink(path.join(__dirname,'public',i),()=>{}));
  d.cars=d.cars.filter(x=>x.id!==q.params.id);save(d);s.json({ok:true});
});
app.listen(PORT,()=>console.log('Laycon Autos running on http://localhost:'+PORT));
