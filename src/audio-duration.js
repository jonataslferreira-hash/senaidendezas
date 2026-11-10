// Read frame durations without decoding the waveform or starting playback.
export function mp3Duration(bytes){
 let i=0,total=0,frames=0;if(new TextDecoder().decode(bytes.slice(0,3))==='ID3')i=10+((bytes[6]&127)<<21| (bytes[7]&127)<<14|(bytes[8]&127)<<7|bytes[9]&127);
 const v1=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320],v2=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
 while(i+4<=bytes.length){const a=bytes[i],b=bytes[i+1],c=bytes[i+2],version=b>>3&3,layer=b>>1&3,bitrateIndex=c>>4,sampleIndex=c>>2&3;if(a!==255||(b&224)!==224||version===1||layer!==1||!bitrateIndex||bitrateIndex===15||sampleIndex===3){i++;continue;}
  const sample=[44100,48000,32000][sampleIndex]/(version===3?1:version===2?2:4),bitrate=(version===3?v1:v2)[bitrateIndex]*1000,length=Math.floor((version===3?144:72)*bitrate/sample)+(c>>1&1);if(i+length>bytes.length)break;total+=(version===3?1152:576)/sample;frames++;i+=length;
 }
 return frames>1?total:NaN;
}
