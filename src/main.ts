import './style.css';
import {Game} from './game/Game';
const app=document.querySelector<HTMLElement>('#app')!;
try{const game=new Game(app);window.addEventListener('pagehide',()=>game.dispose(),{once:true});}
catch(error){app.innerHTML='';const message=document.createElement('p');message.className='error';message.textContent=String(error);app.append(message);}
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
