import nodemailer from 'nodemailer';
let transporter=null;
function getTransport(){
  if(!process.env.SMTP_HOST)return null;
  if(!transporter){transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:String(process.env.SMTP_SECURE)==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined});}
  return transporter;
}
export async function sendMail({to,subject,text,html}){
  const t=getTransport();
  if(!t){console.log('[mail disabled]',to,subject);return false;}
  await t.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to,subject,text,html});return true;
}
export async function notifyOrderStatus(order){
  const email=order.contact?.email;if(!email)return;
  await sendMail({to:email,subject:`КомпМастер — заказ ${order.number}: ${order.status}`,text:`Статус заказа ${order.number}: ${order.status}.`});
}
export async function notifyAdminPaid(order){
  const to=process.env.ADMIN_NOTIFY_EMAIL;if(!to)return;
  await sendMail({to,subject:`Оплачен заказ ${order.number}`,text:`Заказ ${order.number} отмечен оплаченным. Сумма: ${order.total} ₽.`});
}
