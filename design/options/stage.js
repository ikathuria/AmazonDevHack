// Scales a fixed 1920x1080 TV stage to fit the window.
function fit(){const s=document.querySelector('.stage');const k=Math.min(innerWidth/1920,innerHeight/1080);s.style.transform=`scale(${k})`;}
addEventListener('resize',fit);addEventListener('load',fit);
