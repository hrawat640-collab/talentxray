const PLATFORMS={
  linkedin:{site:'site:linkedin.com/in/',label:'LinkedIn',intitle:true,tc:'tag-li',noise:'-inurl:jobs -inurl:groups -inurl:company -inurl:posts'},
  github:{site:'site:github.com',label:'GitHub',intitle:false,tc:'tag-gh',noise:'-inurl:issues -inurl:pulls -inurl:commits -inurl:blob -inurl:tree'},
  behance:{site:'site:behance.net',label:'Behance',intitle:false,tc:'tag-be',noise:''},
};
const PLATFORM_ICONS={linkedin:'💼',github:'🐙',behance:'🎨'};
export { PLATFORMS, PLATFORM_ICONS };
