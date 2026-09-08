import jwt from 'jsonwebtoken';
import crypto from 'crypto';
export function normalizeLogin(value){const v=String(value||'').trim().toLowerCase();if(v.includes('@'))return v;return v.replace(/[^+\d]/g,'');}
export function loginParts(login){
  const v=normalizeLogin(login);
  if(v.includes('@')) return {email:v,phone:null};
  const phone=v.replace(/[^+\d]/g,'');
  return {email:null,phone:phone||null};
}
export function signToken(payload, ttl='30d'){
  return jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:ttl,issuer:'compmasterone'});
}
export function verifyToken(token){return jwt.verify(token,process.env.JWT_SECRET,{issuer:'compmasterone'});}
export function setAuthCookie(res,payload){
  res.cookie('km_auth',signToken(payload),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:30*24*3600*1000,path:'/'});
}
export function clearAuthCookie(res){res.clearCookie('km_auth',{path:'/'});}
export function authFromRequest(req){
  const token=req.cookies?.km_auth;if(!token)return null;
  try{return verifyToken(token);}catch{return null;}
}
export function randomToken(){return crypto.randomBytes(32).toString('hex');}
export function sha256(v){return crypto.createHash('sha256').update(v).digest('hex');}
