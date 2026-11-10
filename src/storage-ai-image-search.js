import {optimizeImage} from './image-optimize.js';

async function hasTransparentBackground(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, 32, 32);
    const { data } = context.getImageData(0, 0, 32, 32);
    let transparent = 0, visible = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] <= 16) transparent++;
      if (data[i] >= 128) visible++;
    }
    return transparent >= 16 && visible >= 16;
  } finally {
    bitmap.close();
  }
}

function imageCredit(info) {
  const metadata=info.extmetadata||{};
  const licenseMarkup=metadata.LicenseShortName?.value||metadata.License?.value||'';
  const licenseNode=document.createElement('template');
  licenseNode.innerHTML=licenseMarkup;
  const license=licenseNode.content.textContent.trim().replace(/\s+/g,' ').toLowerCase();
  const source=info.descriptionurl;
  if(!/^https:\/\/commons\.wikimedia\.org\//.test(source||''))return null;
  if(/\b(?:pd|public domain|domínio público|cc0|cc-zero)\b/.test(license)&&metadata.AttributionRequired?.value!=='true'){
    return {source,license:/cc0|cc-zero/.test(license)?'CC0':'domínio público'};
  }
  const match=/cc[- ]?(by(?:[- ]sa)?)[- ]?(\d\.\d)/i.exec(license);
  const attribution=document.createElement('template');
  attribution.innerHTML=metadata.Attribution?.value||metadata.Artist?.value||'';
  const author=attribution.content.textContent.trim().replace(/\s+/g,' ').slice(0,300);
  if(!match||!author)return null;
  const variant=match[1].toLowerCase().replace(/\s+/g,'-');
  return {source,author,license:'CC '+variant.toUpperCase()+' '+match[2],licenseUrl:'https://creativecommons.org/licenses/'+variant+'/'+match[2]+'/'};
}

export async function findSlideImage(query, { transparent = false } = {}) {
  if(typeof query!=='string'||!query.trim())return null;
  const subject=query.trim().slice(0,120);
  const broader=subject.replace(/\b(?:gaming|gamer|transparent|png)\b/gi,'').replace(/\s+/g,' ').trim();
  const searches=[subject,broader].filter((term,i,terms)=>term&&terms.indexOf(term)===i);
  const formats=transparent?['filemime:png','filemime:svg']:['filetype:bitmap'];
  for(const term of searches)for(const format of formats){
    const params=new URLSearchParams({
      action:'query',format:'json',formatversion:'2',origin:'*',generator:'search',
      gsrsearch:term+' '+format,gsrnamespace:'6',gsrlimit:'12',
      prop:'imageinfo',iiprop:'url|mime|thumbmime|extmetadata',iiurlwidth:'800',
      iiextmetadatafilter:'License|LicenseShortName|LicenseUrl|AttributionRequired|Artist|Attribution'
    });
    const signal=AbortSignal.timeout(6500);
    try{
      const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{signal});
      if(!response.ok)continue;
      const {query:results}=await response.json();
      for(const page of (results?.pages||[]).sort((a,b)=>a.index-b.index)){
        const info=page.imageinfo?.[0];
        if(!/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(info?.thumburl||''))continue;
        const credit=imageCredit(info);
        if(!credit||transparent&&info.thumbmime&&!['image/png','image/webp'].includes(info.thumbmime))continue;
        try{
          const image=await fetch(info.thumburl,{signal,credentials:'omit'});
          if(!image.ok)continue;
          const blob=await image.blob();
          if(blob.size>4_000_000||transparent&&!await hasTransparentBackground(blob))continue;
          const file=await optimizeImage(new File([blob],'wikimedia-image',{type:blob.type}),{maxSide:800});
          if(file.size>1_400_000)continue;
          const data=await new Promise((resolve,reject)=>{
            const reader=new FileReader();
            reader.onload=()=>resolve(reader.result);
            reader.onerror=reject;
            reader.readAsDataURL(file);
          });
          return {data,alt:page.title.replace(/^File:/,'').replace(/\.[^.]+$/,'').slice(0,300),transparent,...credit};
        }catch{if(signal.aborted)break;}
      }
    }catch{continue;}
  }
  // Wikimedia may not index an appropriate image, so try Openverse's free,
  // openly licensed catalog before reporting that no replacement was found.
  for(const term of searches){
    const params=new URLSearchParams({q:term,license:'cc0,pdm,by,by-sa',page_size:'20',mature:'false'});
    if(transparent)params.set('extension','png,svg');
    const signal=AbortSignal.timeout(9000);
    try{
      const response=await fetch('https://api.openverse.org/v1/images/?'+params,{signal,credentials:'omit'});
      if(!response.ok)continue;
      const payload=await response.json();
      for(const result of payload.results||[]){
        const license=String(result.license||'').toLowerCase();
        if(!['cc0','pdm','by','by-sa'].includes(license))continue;
        const source=result.foreign_landing_url||result.url;
        if(!/^https:\/\//i.test(source||''))continue;
        const imageUrl=result.thumbnail||result.url;
        if(!/^https:\/\//i.test(imageUrl||''))continue;
        const creator=String(result.creator||'').trim().slice(0,300);
        if(['by','by-sa'].includes(license)&&!creator)continue;
        try{
          const image=await fetch(imageUrl,{signal,credentials:'omit'});
          if(!image.ok)continue;
          const blob=await image.blob();
          if(blob.size>4_000_000||!blob.type.startsWith('image/'))continue;
          if(transparent&&(!['image/png','image/webp','image/svg+xml'].includes(blob.type)||!await hasTransparentBackground(blob)))continue;
          const file=await optimizeImage(new File([blob],'openverse-image',{type:blob.type}),{maxSide:800});
          if(file.size>1_400_000)continue;
          const data=await new Promise((resolve,reject)=>{
            const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);
          });
          const licenseName=license==='cc0'?'CC0':license==='pdm'?'domínio público':license==='by-sa'?'CC BY-SA':'CC BY';
          return {data,alt:String(result.title||term).slice(0,300),transparent,source,author:creator,license:licenseName,
            licenseUrl:result.license_url||({by:'https://creativecommons.org/licenses/by/4.0/', 'by-sa':'https://creativecommons.org/licenses/by-sa/4.0/'}[license]||'')};
        }catch{if(signal.aborted)break;}
      }
    }catch{continue;}
  }
  // A transparent request must return an asset whose pixels actually contain
  // alpha. Never silently substitute an opaque image or remove its background.
  return null;
}

export function imageSourceNote(image){
  return [`Imagem: ${image.alt} · ${image.author?image.author+' · ':''}Wikimedia Commons · ${image.license}`,
    image.source,image.licenseUrl].filter(Boolean).join('\n');
}
